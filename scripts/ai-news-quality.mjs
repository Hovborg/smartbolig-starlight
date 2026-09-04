#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const templatePhrases = [
  'smallere tilladelser og synlig godkendelse',
  'prisændringen kan flytte grænsen mellem lokal og cloudbaseret ai',
  'modelændringen kan påvirke svartid, datagrænser',
  'den praktiske værdi afhænger af, om ændringen løser en konkret opgave bedre',
  'narrower permissions and visible approval',
  'the pricing change can shift the boundary between local and cloud ai',
  'the model change may affect latency, data boundaries',
  'its practical value depends on solving a concrete task better',
];

function copenhagenDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Copenhagen', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function parseArgs(argv) {
  const result = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    if (!argv[index].startsWith('--')) continue;
    const [key, inline] = argv[index].split('=', 2);
    if (inline !== undefined) result.set(key, inline);
    else if (argv[index + 1] && !argv[index + 1].startsWith('--')) result.set(key, argv[++index]);
    else result.set(key, true);
  }
  return result;
}

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, ' ').trim();
}

function wordCount(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

function field(content, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return content.match(new RegExp(`\\*\\*${escaped}:\\*\\*\\s+([^\\n]+)`))?.[1]?.trim() || '';
}

function frontmatterValue(content, key) {
  const frontmatter = content.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] || '';
  return frontmatter.match(new RegExp(`^\\s*${key}:\\s*["']?([^"'\\n]+)`, 'm'))?.[1]?.trim() || '';
}

function sourceUrls(content) {
  const frontmatter = content.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] || '';
  return [...frontmatter.matchAll(/^\s*-\s*["'](https:\/\/[^"']+)["']/gm)].map((match) => match[1]);
}

function storyBlocks(content, locale) {
  const heading = locale === 'da' ? /^###\s+\d+\.\s+/gm : /^###\s+\d+\.\s+/gm;
  const starts = [...content.matchAll(heading)].map((match) => match.index);
  return starts.map((start, index) => content.slice(start, starts[index + 1] ?? content.indexOf('\n## ', start + 1)));
}

export function qualityIssues({ date, da, en }) {
  const issues = [];
  const pairs = [
    { locale: 'da', content: da, labels: ['Hvad ændrede sig', 'Hvorfor det er relevant', 'Sådan verificerer du det', 'Usikkerhed'] },
    { locale: 'en', content: en, labels: ['What changed', 'Why it matters', 'How to verify it', 'Uncertainty'] },
  ];

  for (const { locale, content, labels } of pairs) {
    if (frontmatterValue(content, 'date') !== date) issues.push(`${locale}: frontmatter date does not match ${date}`);
    if (frontmatterValue(content, 'copySource') !== 'llm') issues.push(`${locale}: copySource must be llm for automatic publishing`);
    if (frontmatterValue(content, 'semanticReview') !== 'passed') issues.push(`${locale}: semanticReview must be passed for automatic publishing`);
    if (frontmatterValue(content, 'signal') !== 'high') issues.push(`${locale}: only high-signal issues may be published automatically`);

    const blocks = storyBlocks(content, locale);
    if (blocks.length < 2 || blocks.length > 7) issues.push(`${locale}: expected 2-7 stories, found ${blocks.length}`);

    for (const [index, block] of blocks.entries()) {
      for (const label of labels) {
        const value = field(block, label);
        if (!value) issues.push(`${locale} story ${index + 1}: missing ${label}`);
        else if (wordCount(value) < 8) issues.push(`${locale} story ${index + 1}: ${label} is too thin (${wordCount(value)} words)`);
      }
    }

    const normalized = normalize(content);
    for (const phrase of templatePhrases) {
      if (normalized.includes(normalize(phrase))) issues.push(`${locale}: deterministic fallback phrase found: ${phrase}`);
    }

    for (const label of labels) {
      const values = blocks.map((block) => normalize(field(block, label))).filter(Boolean);
      if (new Set(values).size !== values.length) issues.push(`${locale}: repeated ${label} copy across stories`);
    }
  }

  const daUrls = sourceUrls(da);
  const enUrls = sourceUrls(en);
  const daIssueFingerprint = frontmatterValue(da, 'issueFingerprint');
  const enIssueFingerprint = frontmatterValue(en, 'issueFingerprint');
  if (!/^[a-f0-9]{64}$/.test(daIssueFingerprint)) issues.push('Danish issueFingerprint is missing or invalid');
  if (daIssueFingerprint !== enIssueFingerprint) issues.push('Danish and English issue fingerprints differ');
  if (daUrls.length < 2) issues.push(`source set is too small (${daUrls.length})`);
  if (JSON.stringify(daUrls) !== JSON.stringify(enUrls)) issues.push('Danish and English source sets differ');
  return issues;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const date = String(args.get('--date') || copenhagenDate());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Invalid date: ${date}`);

  const daPath = path.join(rootDir, 'src/content/docs/da/ai/nyheder', `${date}.mdx`);
  const enPath = path.join(rootDir, 'src/content/docs/en/ai/nyheder', `${date}.mdx`);
  if (!existsSync(daPath) || !existsSync(enPath)) throw new Error(`Missing bilingual AI News issue for ${date}`);

  const issues = qualityIssues({
    date,
    da: await readFile(daPath, 'utf8'),
    en: await readFile(enPath, 'utf8'),
  });
  if (issues.length > 0) {
    console.error(`AI News automatic quality gate failed for ${date}:`);
    for (const issue of issues) console.error(`- ${issue}`);
    process.exit(1);
  }
  console.log(`AI News automatic quality gate passed for ${date} (LLM copy, high signal, bilingual source parity).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
