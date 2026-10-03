#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const defaultRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lastLegacyDateWithoutRequiredHero = '2026-04-11';
const expectedImages = [
  { suffix: '', extension: 'jpg', format: 'jpeg', label: 'JPEG', width: 1200, height: 630 },
  { suffix: '-16x9', extension: 'jpg', format: 'jpeg', label: 'JPEG', width: 1200, height: 675 },
  { suffix: '-4x3', extension: 'jpg', format: 'jpeg', label: 'JPEG', width: 1200, height: 900 },
  { suffix: '-1x1', extension: 'jpg', format: 'jpeg', label: 'JPEG', width: 1200, height: 1200 },
  { suffix: '-thumb', extension: 'webp', format: 'webp', label: 'WebP', width: 320, height: 180 },
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

function frontmatterSectionValue(content, section, key) {
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) return '';
  const lines = frontmatter[1].split(/\r?\n/);
  const sectionIndex = lines.findIndex((line) => line.trim() === `${section}:`);
  if (sectionIndex === -1) return '';
  for (const line of lines.slice(sectionIndex + 1)) {
    if (/^\S/.test(line)) break;
    const match = line.match(/^\s+([A-Za-z]+):\s*(.*)$/);
    if (match?.[1] !== key) continue;
    const value = match[2].trim();
    if (value.startsWith('"')) {
      try { return JSON.parse(value); } catch { return ''; }
    }
    return value.replace(/^'|'$/g, '');
  }
  return '';
}

function extractHeroImageSrc(content) {
  return frontmatterSectionValue(content, 'heroImage', 'src');
}

function expectedImageAssets(date) {
  return expectedImages.map((image) => ({
    ...image,
    relativePath: `public/images/ai-news/${date}${image.suffix}.${image.extension}`,
  }));
}

async function validateImageAsset(rootDir, asset) {
  const absolutePath = path.join(rootDir, asset.relativePath);
  try {
    const metadata = await sharp(absolutePath).metadata();
    const problems = [];
    if (metadata.format !== asset.format) {
      problems.push(`${asset.relativePath} must be ${asset.label}, got ${metadata.format || 'unknown format'}`);
    }
    if (metadata.width !== asset.width || metadata.height !== asset.height) {
      problems.push(`${asset.relativePath} must be ${asset.width}x${asset.height}, got ${metadata.width || '?'}x${metadata.height || '?'}`);
    }
    if (problems.length > 0) return problems;
    // Only fully decode files with the expected bounds. PR assets are untrusted.
    await sharp(absolutePath, { limitInputPixels: 1_500_000 }).stats();
    return problems;
  } catch {
    return [`${asset.relativePath} is not a decodable ${asset.label}`];
  }
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
    const expectedSrc = `/images/ai-news/${date}.jpg`;
    const problems = [];
    if (!heroSrc) {
      if (date > lastLegacyDateWithoutRequiredHero) {
        problems.push(`heroImage.src is required after ${lastLegacyDateWithoutRequiredHero}`);
        pending.push({ date, article, expectedSrc, heroSrc, missing: [], problems });
      }
      continue;
    }

    if (heroSrc !== expectedSrc) {
      problems.push(`heroImage.src must be ${expectedSrc}, got ${heroSrc}`);
    }
    const danishAlt = frontmatterSectionValue(content, 'heroImage', 'alt');
    const danishCaption = frontmatterSectionValue(content, 'heroImage', 'caption');
    const danishHeadline = frontmatterSectionValue(content, 'news', 'imageHeadline');
    if (!danishAlt) problems.push('Danish heroImage.alt is required');
    if (!danishCaption) problems.push('Danish heroImage.caption is required');
    if (danishHeadline && (!danishAlt.includes(danishHeadline) || !danishCaption.includes(danishHeadline))) {
      problems.push('Danish hero metadata must describe news.imageHeadline');
    }

    const englishRelativePath = `src/content/docs/en/ai/nyheder/${date}.mdx`;
    const englishPath = path.join(rootDir, englishRelativePath);
    if (!existsSync(englishPath)) {
      problems.push(`missing English article ${englishRelativePath}`);
    } else {
      const englishContent = await readFile(englishPath, 'utf8');
      const englishHeroSrc = extractHeroImageSrc(englishContent);
      const englishAlt = frontmatterSectionValue(englishContent, 'heroImage', 'alt');
      const englishCaption = frontmatterSectionValue(englishContent, 'heroImage', 'caption');
      const englishHeadline = frontmatterSectionValue(englishContent, 'news', 'imageHeadline');
      if (englishHeroSrc !== expectedSrc) {
        problems.push(`English heroImage.src must be ${expectedSrc}, got ${englishHeroSrc || 'missing'}`);
      }
      if (!englishAlt) problems.push('English heroImage.alt is required');
      if (!englishCaption) problems.push('English heroImage.caption is required');
      if (danishHeadline !== englishHeadline) problems.push('English news.imageHeadline must match Danish');
      if (englishHeadline && (!englishAlt.includes(englishHeadline) || !englishCaption.includes(englishHeadline))) {
        problems.push('English hero metadata must describe news.imageHeadline');
      }
    }

    const assets = expectedImageAssets(date);
    const missing = assets
      .filter((asset) => !existsSync(path.join(rootDir, asset.relativePath)))
      .map((asset) => asset.relativePath);
    const presentAssets = assets.filter((asset) => !missing.includes(asset.relativePath));
    for (const asset of presentAssets) {
      problems.push(...await validateImageAsset(rootDir, asset));
    }

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
