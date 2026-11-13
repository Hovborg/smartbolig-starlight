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
  // The feed is split into an entry, small components and lib modules (copy and
  // selection); every file that can put text on the page is checked.
  const feedComponentFiles = (await listFiles(path.join(rootDir, 'src/components/ai-news')))
    .filter((filePath) => filePath.endsWith('.astro'))
    .map((filePath) => path.relative(rootDir, filePath));
  const staticFiles = [
    'scripts/ai-news-publish.mjs',
    'src/components/AiNewsFeed.astro',
    'src/lib/ai-news-copy.ts',
    'src/lib/ai-news-feed.ts',
    'src/lib/ai-news-sources.ts',
    ...feedComponentFiles,
  ];
  const contentFiles = (await listFiles(path.join(rootDir, 'src/content/docs')))
    .filter((filePath) => filePath.includes('/ai/nyheder/') && filePath.endsWith('.mdx'))
    .map((filePath) => path.relative(rootDir, filePath));
  const rssFiles = (await listFiles(path.join(rootDir, 'src/pages')))
    .filter((filePath) => filePath.includes('/ai/') && filePath.endsWith('rss.xml.js'))
    .map((filePath) => path.relative(rootDir, filePath));

  for (const relativePath of [...staticFiles, ...contentFiles, ...rssFiles]) {
    const content = await readFile(path.join(rootDir, relativePath), 'utf8');
    assert.doesNotMatch(content, /AI Radar|AI News-feed|Høj signalværdi|Middel signalværdi|Lav signalværdi|High signal|Medium signal|Low signal/i, `${relativePath} should not expose internal feed labels`);
  }
});
