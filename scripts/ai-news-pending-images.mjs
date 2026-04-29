#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imageSuffixes = ['', '-16x9', '-4x3', '-1x1'];

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

function extractHeroImageSrc(content) {
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatter) return '';

  const lines = frontmatter[1].split('\n');
  const heroIndex = lines.findIndex((line) => line.trim() === 'heroImage:');
  if (heroIndex === -1) return '';

  for (const line of lines.slice(heroIndex + 1)) {
    if (/^\S/.test(line)) break;
    const match = line.match(/^\s+src:\s*["']?([^"'\s]+)["']?\s*$/);
    if (match) return match[1];
  }
  return '';
}

function expectedImagePaths(date) {
  return imageSuffixes.map((suffix) => `public/images/ai-news/${date}${suffix}.png`);
}

async function findPendingImages({ rootDir, dateFilter }) {
  const daNewsDir = path.join(rootDir, 'src/content/docs/da/ai/nyheder');
  if (!existsSync(daNewsDir)) return [];

  const names = await readdir(daNewsDir);
  const pending = [];

  for (const name of names.sort()) {
    const match = name.match(/^(\d{4}-\d{2}-\d{2})\.mdx$/);
    if (!match) continue;

    const date = match[1];
    if (dateFilter && date !== dateFilter) continue;

    const articlePath = path.join(daNewsDir, name);
    const article = path.relative(rootDir, articlePath);
    const content = await readFile(articlePath, 'utf8');
    const heroSrc = extractHeroImageSrc(content);
    const expectedSrc = `/images/ai-news/${date}.png`;
    if (!heroSrc) continue;

    const problems = [];
    if (heroSrc !== expectedSrc) {
      problems.push(`heroImage.src must be ${expectedSrc}, got ${heroSrc}`);
    }

    const missing = expectedImagePaths(date)
      .filter((imagePath) => !existsSync(path.join(rootDir, imagePath)));

    if (problems.length > 0 || missing.length > 0) {
      pending.push({ date, article, expectedSrc, heroSrc, missing, problems });
    }
  }

  return pending;
}

function printText(pending) {
  if (pending.length === 0) {
    console.log('No pending AI News article images.');
    return;
  }

  console.log('Pending AI News article images:');
  for (const item of pending) {
    console.log(`- ${item.date} (${item.article})`);
    for (const problem of item.problems) console.log(`  problem: ${problem}`);
    for (const imagePath of item.missing) console.log(`  missing: ${imagePath}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = path.resolve(String(args.get('--root') || defaultRootDir));
  const dateFilter = args.get('--date') ? String(args.get('--date')) : '';
  const pending = await findPendingImages({ rootDir, dateFilter });

  if (args.has('--json')) {
    console.log(JSON.stringify({ count: pending.length, pending }, null, 2));
  } else {
    printText(pending);
  }

  if (pending.length > 0 && args.has('--fail-on-pending')) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
