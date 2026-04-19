import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const rootDir = path.resolve(import.meta.dirname, '..');

test('public AI News copy avoids internal automation labels', async () => {
  const publicFiles = [
    'scripts/ai-news-publish.mjs',
    'src/components/AiNewsFeed.astro',
  ];

  for (const relativePath of publicFiles) {
    const content = await readFile(path.join(rootDir, relativePath), 'utf8');
    assert.doesNotMatch(content, /AI Radar|AI News-feed/i, `${relativePath} should not expose internal feed labels`);
  }
});
