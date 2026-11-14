#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { renderNewsSvg } from './lib/news-image/compose.mjs';
import { firstHeadline, mainStory } from './lib/news-lead.mjs';

const defaultRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const variants = [
  { suffix: '', width: 1200, height: 630 },
  { suffix: '-16x9', width: 1200, height: 675 },
  { suffix: '-4x3', width: 1200, height: 900 },
  { suffix: '-1x1', width: 1200, height: 1200 },
];

function parseArgs(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const [key, inlineValue] = arg.split('=', 2);
    if (inlineValue !== undefined) {
      args.set(key, inlineValue);
    } else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
      args.set(key, argv[i + 1]);
      i += 1;
    } else {
      args.set(key, true);
    }
  }
  return args;
}

export function frontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { title: '', description: '', imageHeadline: '', sources: [] };

  const lines = match[1].split(/\r?\n/);
  const decodeScalar = (raw) => {
    const trimmed = String(raw).trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return trimmed.slice(1, -1);
      }
    }
    if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
      return trimmed.slice(1, -1).replace(/''/g, "'");
    }
    return trimmed;
  };
  const value = (name) => {
    const line = lines.find((entry) => entry.startsWith(`${name}:`));
    if (!line) return '';
    return decodeScalar(line.slice(name.length + 1));
  };
  const nestedValue = (section, name) => {
    const sectionIndex = lines.findIndex((line) => line.trim() === `${section}:`);
    if (sectionIndex === -1) return '';
    for (const line of lines.slice(sectionIndex + 1)) {
      if (/^\S/.test(line)) break;
      const nested = line.match(new RegExp(`^\\s+${name}:\\s*(.+?)\\s*$`));
      if (nested) return decodeScalar(nested[1]);
    }
    return '';
  };

  const sources = [];
  const sourceIndex = lines.findIndex((line) => line.trim() === 'sources:');
  if (sourceIndex !== -1) {
    for (const line of lines.slice(sourceIndex + 1)) {
      if (/^\S/.test(line)) break;
      const source = line.match(/^\s+-\s+(.+?)\s*$/);
      if (source) sources.push(source[1].replace(/^["']|["']$/g, ''));
    }
  }

  return {
    title: value('title'),
    description: value('description'),
    imageHeadline: nestedValue('news', 'imageHeadline'),
    sources,
  };
}

function providerForUrl(url) {
  if (/openai\.com/i.test(url)) return 'OpenAI';
  if (/github\.com\/openai\/codex/i.test(url)) return 'Codex';
  if (/anthropic|claude-code/i.test(url)) return 'Claude';
  if (/google|gemini/i.test(url)) return 'Google AI';
  if (/openclaw/i.test(url)) return 'OpenClaw';
  return 'AI';
}

function uniqueProviders(sources) {
  const providers = [...new Set(sources.map(providerForUrl))];
  return providers.length > 0 ? providers.slice(0, 3) : ['AI News'];
}

const motifRules = [
  { motif: 'security', match: /security|sikkerhed|privacy|privatliv|vulnerab|cve|auth|token|permission|tilladel|guard|attack/i },
  { motif: 'browser', match: /browser|chrome|edge|firefox|safari|web page|webside|tab\b/i },
  { motif: 'api', match: /\bapi\b|sdk|developer|udvikler|code|kode|cli|endpoint/i },
  { motif: 'agent', match: /agent|workflow|arbejdsgang|automation|automatis|openclaw|cron|tool|mcp/i },
  { motif: 'model', match: /model|gpt|claude|gemini|openai|anthropic|reasoning|inference/i },
];

export function selectMotif(text) {
  return motifRules.find((rule) => rule.match.test(String(text)))?.motif || 'default';
}

export function renderEditorialSvg({ width, height, date, headline, providers }) {
  const text = String(headline || '').trim();
  const motif = selectMotif(`${text} ${providers.join(' ')}`);
  return renderNewsSvg({ width, height, date, headline: text, providers, motif });
}

/** The picture's headline: the one the article names, else its main story. */
export function imageHeadline(article) {
  const meta = frontmatter(article);
  return meta.imageHeadline || mainStory(meta.title, firstHeadline(article));
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const rootDir = path.resolve(String(args.get('--root') || defaultRootDir));
  const date = String(args.get('--date') || process.env.AI_NEWS_DATE || '').trim();
  const force = args.has('--force');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Use --date YYYY-MM-DD or set AI_NEWS_DATE.');
  }

  const articlePath = path.join(rootDir, 'src/content/docs/da/ai/nyheder', `${date}.mdx`);
  if (!existsSync(articlePath)) {
    throw new Error(`Missing Danish AI News article for ${date}: ${articlePath}`);
  }

  const article = await readFile(articlePath, 'utf8');
  const meta = frontmatter(article);
  const providers = uniqueProviders(meta.sources);
  const outputDir = path.join(rootDir, 'public/images/ai-news');
  await mkdir(outputDir, { recursive: true });

  const allVariantsExist = !force && variants.every((variant) => existsSync(path.join(outputDir, `${date}${variant.suffix}.jpg`)));
  if (!allVariantsExist) console.log('Using the offline editorial illustration.');

  for (const variant of variants) {
    const outputPath = path.join(outputDir, `${date}${variant.suffix}.jpg`);
    if (!force && existsSync(outputPath)) {
      console.log(`kept ${path.relative(rootDir, outputPath)}`);
      continue;
    }
    const svg = renderEditorialSvg({
      width: variant.width,
      height: variant.height,
      date,
      headline: imageHeadline(article),
      providers,
    });
    await sharp(Buffer.from(svg)).jpeg({ quality: 82, mozjpeg: true }).toFile(outputPath);
    console.log(`wrote ${path.relative(rootDir, outputPath)} (offline editorial illustration)`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
