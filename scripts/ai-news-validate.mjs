#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = path.join(rootDir, 'src/content/docs');
const daNewsDir = path.join(docsDir, 'da/ai/nyheder');
const enNewsDir = path.join(docsDir, 'en/ai/nyheder');

const officialDomains = [
  'openai.com',
  'platform.openai.com',
  'developers.openai.com',
  'anthropic.com',
  'docs.anthropic.com',
  'github.com/anthropics/claude-code',
  'github.com/openai/codex',
  'blog.google',
  'ai.google.dev',
  'github.com/google-gemini/gemini-cli',
  'github.com/openclaw/openclaw',
];

const forbiddenPatterns = [
  { label: 'OpenAI-style API key', pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { label: 'GitHub token', pattern: /\bgh[psu]_[A-Za-z0-9_]{20,}\b/ },
  { label: 'Slack token', pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
  { label: 'private key', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { label: 'Cloudflare token assignment', pattern: /\bCLOUDFLARE_[A-Z_]*TOKEN\s*=/ },
  { label: 'local OpenClaw report path', pattern: /\/mnt\/c\/codex_projekts\/apps\/openclaw-codex-pro\/reports/i },
  { label: 'local home secret path', pattern: /\/home\/[^/\s]+\/\.(config|ssh|openclaw|claude|codex)\b/i },
];

function fail(issues, filePath, message) {
  issues.push(`${path.relative(rootDir, filePath)}: ${message}`);
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return {};
  const data = {};
  for (const line of match[1].split('\n')) {
    const simple = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (simple) data[simple[1]] = simple[2].replace(/^"|"$/g, '');
  }
  return data;
}

function extractUrls(content) {
  const urls = new Set();
  for (const match of content.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)) urls.add(match[1]);
  for (const match of content.matchAll(/https?:\/\/[^\s)"']+/g)) urls.add(match[0]);
  return [...urls];
}

function isOfficial(url) {
  return officialDomains.some((domain) => url.includes(domain));
}

function validateArticle(filePath, content, issues) {
  const frontmatter = parseFrontmatter(content);
  const basename = path.basename(filePath, '.mdx');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(basename)) {
    fail(issues, filePath, 'daily article filename must be YYYY-MM-DD.mdx');
  }

  if (frontmatter.date !== basename) {
    fail(issues, filePath, `frontmatter date must match filename (${basename})`);
  }

  if (!frontmatter.title) fail(issues, filePath, 'missing title');
  if (!frontmatter.description) fail(issues, filePath, 'missing description');
  if (!content.includes(`<time datetime="${basename}">`)) {
    fail(issues, filePath, 'missing visible publication date with matching <time datetime>');
  }

  if (content.length > 24000) {
    fail(issues, filePath, 'article is too long for a daily public brief');
  }

  for (const { label, pattern } of forbiddenPatterns) {
    if (pattern.test(content)) fail(issues, filePath, `possible secret/private detail: ${label}`);
  }

  if (/\bTODO\b|\bFIXME\b/i.test(content)) {
    fail(issues, filePath, 'contains TODO/FIXME');
  }

  for (const quote of content.matchAll(/^>\s+(.+)$/gm)) {
    const words = quote[1].trim().split(/\s+/).filter(Boolean);
    if (words.length > 25) fail(issues, filePath, 'blockquote exceeds 25 words');
  }

  const urls = extractUrls(content);
  const officialCount = urls.filter(isOfficial).length;
  const isWeakSignal = /signal:\s*low/.test(content) || /lav signalværdi|low signal/i.test(content);

  if (!isWeakSignal && officialCount < 2) {
    fail(issues, filePath, 'needs at least two official source links unless marked low signal');
  }

  if (!/Kilde:|Source:/.test(content)) {
    fail(issues, filePath, 'missing explicit source labels');
  }
}

async function listDailyArticles(dir) {
  if (!existsSync(dir)) return [];
  const names = await readdir(dir);
  return names.filter((name) => /^\d{4}-\d{2}-\d{2}\.mdx$/.test(name)).sort();
}

async function main() {
  const issues = [];

  for (const filePath of [path.join(daNewsDir, 'index.mdx'), path.join(enNewsDir, 'index.mdx')]) {
    if (!existsSync(filePath)) fail(issues, filePath, 'missing AI news index page');
  }

  const daArticles = await listDailyArticles(daNewsDir);
  const enArticles = await listDailyArticles(enNewsDir);
  const daSet = new Set(daArticles);
  const enSet = new Set(enArticles);

  for (const name of daArticles) {
    if (!enSet.has(name)) fail(issues, path.join(enNewsDir, name), 'missing English mirror');
  }
  for (const name of enArticles) {
    if (!daSet.has(name)) fail(issues, path.join(daNewsDir, name), 'missing Danish mirror');
  }

  for (const dir of [daNewsDir, enNewsDir]) {
    for (const name of await listDailyArticles(dir)) {
      const filePath = path.join(dir, name);
      validateArticle(filePath, await readFile(filePath, 'utf8'), issues);
    }
  }

  if (issues.length > 0) {
    console.error('AI news validation failed:');
    for (const issue of issues) console.error(`- ${issue}`);
    process.exit(1);
  }

  console.log(`AI news validation passed (${daArticles.length} daily issue pair(s)).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
