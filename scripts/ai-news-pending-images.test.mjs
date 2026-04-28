import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(import.meta.dirname, '..');

async function writeArticle(root, date) {
  const dir = path.join(root, 'src/content/docs/da/ai/nyheder');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${date}.mdx`), `---
title: "AI-nyheder, ${date}"
description: "Test"
heroImage:
  src: "/images/ai-news/${date}.png"
  alt: "SmartBolig hardware visual"
  caption: "SmartBolig hardware."
---

<p>Test</p>
`);
}

test('AI News image scanner leaves missing ComfyUI output pending without crashing by default', async () => {
  const tmp = await mkdtemp(path.join(tmpdir(), 'smartbolig-ai-news-pending-'));
  await writeArticle(tmp, '2026-04-20');

  const { stdout } = await execFileAsync('node', ['scripts/ai-news-pending-images.mjs', '--root', tmp], {
    cwd: rootDir,
  });

  assert.match(stdout, /Pending AI News article images/);
  assert.match(stdout, /2026-04-20/);
  assert.match(stdout, /public\/images\/ai-news\/2026-04-20\.png/);
  assert.match(stdout, /public\/images\/ai-news\/2026-04-20-16x9\.png/);
});

test('AI News image scanner reports clean when all date-specific variants exist', async () => {
  const tmp = await mkdtemp(path.join(tmpdir(), 'smartbolig-ai-news-clean-'));
  await writeArticle(tmp, '2026-04-20');
  const imageDir = path.join(tmp, 'public/images/ai-news');
  await mkdir(imageDir, { recursive: true });
  for (const suffix of ['', '-16x9', '-4x3', '-1x1']) {
    await writeFile(path.join(imageDir, `2026-04-20${suffix}.png`), 'test image placeholder');
  }

  const { stdout } = await execFileAsync('node', ['scripts/ai-news-pending-images.mjs', '--root', tmp], {
    cwd: rootDir,
  });

  assert.match(stdout, /No pending AI News article images/);
  assert.doesNotMatch(stdout, /2026-04-20/);
});

test('AI News image scanner ignores legacy articles without heroImage by default', async () => {
  const tmp = await mkdtemp(path.join(tmpdir(), 'smartbolig-ai-news-legacy-'));
  const dir = path.join(tmp, 'src/content/docs/da/ai/nyheder');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, '2026-04-11.mdx'), `---
title: "AI-nyheder, 2026-04-11"
description: "Legacy test"
---

<p>Legacy article from before per-article images.</p>
`);

  const { stdout } = await execFileAsync('node', ['scripts/ai-news-pending-images.mjs', '--root', tmp], {
    cwd: rootDir,
  });

  assert.match(stdout, /No pending AI News article images/);
  assert.doesNotMatch(stdout, /2026-04-11/);
});
