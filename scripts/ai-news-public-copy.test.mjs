import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const rootDir = path.resolve(import.meta.dirname, '..');

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(entryPath));
    else files.push(entryPath);
  }
  return files;
}

test('public AI News copy avoids internal automation labels', async () => {
  const staticFiles = [
    'scripts/ai-news-publish.mjs',
    'src/components/AiNewsFeed.astro',
  ];
  const contentFiles = (await listFiles(path.join(rootDir, 'src/content/docs')))
    .filter((filePath) => filePath.includes('/ai/nyheder/') && filePath.endsWith('.mdx'))
    .map((filePath) => path.relative(rootDir, filePath));
  const rssFiles = (await listFiles(path.join(rootDir, 'src/pages')))
    .filter((filePath) => filePath.includes('/ai/') && filePath.endsWith('rss.xml.js'))
    .map((filePath) => path.relative(rootDir, filePath));

  for (const relativePath of [...staticFiles, ...contentFiles, ...rssFiles]) {
    const content = await readFile(path.join(rootDir, relativePath), 'utf8');
    assert.doesNotMatch(content, /AI Radar|AI News-feed/i, `${relativePath} should not expose internal feed labels`);
  }
});
