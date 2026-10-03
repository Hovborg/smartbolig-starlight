import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(import.meta.dirname, '..');

async function writeArticle(root, date, { locales = ['da', 'en'], heroSrc = `/images/ai-news/${date}.jpg` } = {}) {
  for (const locale of locales) {
    const dir = path.join(root, `src/content/docs/${locale}/ai/nyheder`);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${date}.mdx`), `---
title: "AI-nyheder, ${date}"
description: "Test"
heroImage:
  src: "${heroSrc}"
  alt: "SmartBolig hardware visual"
  caption: "SmartBolig hardware."
---

<p>Test</p>
`);
  }
}

const expectedImages = [
  { suffix: '', width: 1200, height: 630, format: 'jpeg' },
  { suffix: '-16x9', width: 1200, height: 675, format: 'jpeg' },
  { suffix: '-4x3', width: 1200, height: 900, format: 'jpeg' },
  { suffix: '-1x1', width: 1200, height: 1200, format: 'jpeg' },
  { suffix: '-thumb', width: 320, height: 180, format: 'webp' },
];

async function writeValidImages(root, date) {
  const imageDir = path.join(root, 'public/images/ai-news');
  await mkdir(imageDir, { recursive: true });
  for (const image of expectedImages) {
    const output = path.join(imageDir, `${date}${image.suffix}.${image.format === 'webp' ? 'webp' : 'jpg'}`);
    let pipeline = sharp({
      create: {
        width: image.width,
        height: image.height,
        channels: 3,
        background: '#102437',
      },
    });
    pipeline = image.format === 'webp' ? pipeline.webp() : pipeline.jpeg();
    await pipeline.toFile(output);
  }
}

test('AI News image scanner leaves missing ComfyUI output pending without crashing by default', async () => {
  const tmp = await mkdtemp(path.join(tmpdir(), 'smartbolig-ai-news-pending-'));
  await writeArticle(tmp, '2026-04-20');

  const { stdout } = await execFileAsync('node', ['scripts/ai-news-pending-images.mjs', '--root', tmp], {
    cwd: rootDir,
  });

  assert.match(stdout, /Pending AI News article images/);
  assert.match(stdout, /2026-04-20/);
  assert.match(stdout, /public\/images\/ai-news\/2026-04-20\.jpg/);
  assert.match(stdout, /public\/images\/ai-news\/2026-04-20-16x9\.jpg/);
});

test('AI News image scanner reports clean when all date-specific variants exist', async () => {
  const tmp = await mkdtemp(path.join(tmpdir(), 'smartbolig-ai-news-clean-'));
  await writeArticle(tmp, '2026-04-20');
  await writeValidImages(tmp, '2026-04-20');

  const { stdout } = await execFileAsync('node', ['scripts/ai-news-pending-images.mjs', '--root', tmp], {
    cwd: rootDir,
  });

  assert.match(stdout, /No pending AI News article images/);
  assert.doesNotMatch(stdout, /2026-04-20/);
});

test('AI News image scanner rejects an undecodable or wrongly sized date-specific image', async () => {
  const tmp = await mkdtemp(path.join(tmpdir(), 'smartbolig-ai-news-invalid-'));
  await writeArticle(tmp, '2026-04-20');
  await writeValidImages(tmp, '2026-04-20');
  const imageDir = path.join(tmp, 'public/images/ai-news');
  await sharp({
    create: { width: 1199, height: 630, channels: 3, background: '#102437' },
  }).jpeg().toFile(path.join(imageDir, '2026-04-20.jpg'));
  await writeFile(path.join(imageDir, '2026-04-20-4x3.jpg'), 'not a JPEG');

  const { stdout } = await execFileAsync('node', ['scripts/ai-news-pending-images.mjs', '--root', tmp], {
    cwd: rootDir,
  });

  assert.match(stdout, /Pending AI News article images/);
  assert.match(stdout, /2026-04-20\.jpg must be 1200x630, got 1199x630/);
  assert.match(stdout, /2026-04-20-4x3\.jpg is not a decodable JPEG/);
  await assert.rejects(
    execFileAsync('node', ['scripts/ai-news-pending-images.mjs', '--root', tmp, '--fail-on-pending'], { cwd: rootDir }),
    (error) => error.code === 1 && /2026-04-20-4x3\.jpg is not a decodable JPEG/.test(error.stdout),
  );
});

test('AI News image scanner requires a decodable 320x180 WebP thumbnail', async () => {
  const tmp = await mkdtemp(path.join(tmpdir(), 'smartbolig-ai-news-thumb-'));
  await writeArticle(tmp, '2026-04-20');
  await writeValidImages(tmp, '2026-04-20');
  const thumbnail = path.join(tmp, 'public/images/ai-news/2026-04-20-thumb.webp');
  await sharp({
    create: { width: 321, height: 180, channels: 3, background: '#102437' },
  }).png().toFile(thumbnail);

  const { stdout } = await execFileAsync('node', ['scripts/ai-news-pending-images.mjs', '--root', tmp], {
    cwd: rootDir,
  });

  assert.match(stdout, /2026-04-20-thumb\.webp must be WebP, got png/);
  assert.match(stdout, /2026-04-20-thumb\.webp must be 320x180, got 321x180/);
});

test('AI News image scanner requires heroImage after the legacy cutoff', async () => {
  const tmp = await mkdtemp(path.join(tmpdir(), 'smartbolig-ai-news-no-hero-'));
  const dir = path.join(tmp, 'src/content/docs/da/ai/nyheder');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, '2026-04-12.mdx'), `---
title: "AI-nyheder, 2026-04-12"
description: "New article without a hero"
---
`);

  const { stdout } = await execFileAsync('node', ['scripts/ai-news-pending-images.mjs', '--root', tmp], {
    cwd: rootDir,
  });

  assert.match(stdout, /Pending AI News article images/);
  assert.match(stdout, /heroImage\.src is required after 2026-04-11/);
});

test('AI News image scanner requires matching English hero metadata', async () => {
  const tmp = await mkdtemp(path.join(tmpdir(), 'smartbolig-ai-news-en-parity-'));
  await writeArticle(tmp, '2026-04-20', { locales: ['da'] });
  await writeValidImages(tmp, '2026-04-20');

  const { stdout } = await execFileAsync('node', ['scripts/ai-news-pending-images.mjs', '--root', tmp], {
    cwd: rootDir,
  });

  assert.match(stdout, /Pending AI News article images/);
  assert.match(stdout, /missing English article src\/content\/docs\/en\/ai\/nyheder\/2026-04-20\.mdx/);
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

test('AI News image scanner requires meaningful bilingual alt and caption metadata', async () => {
  const tmp = await mkdtemp(path.join(tmpdir(), 'smartbolig-ai-news-alt-'));
  const date = '2026-04-20';
  await writeArticle(tmp, date);
  await writeValidImages(tmp, date);
  const english = path.join(tmp, `src/content/docs/en/ai/nyheder/${date}.mdx`);
  const article = await readFile(english, 'utf8');
  await writeFile(english, article.replace('  alt: "SmartBolig hardware visual"', '  alt: ""').replace('  caption: "SmartBolig hardware."', '  caption: ""'));

  const { stdout } = await execFileAsync('node', ['scripts/ai-news-pending-images.mjs', '--root', tmp], { cwd: rootDir });
  assert.match(stdout, /English heroImage\.alt is required/);
  assert.match(stdout, /English heroImage\.caption is required/);
});

test('AI News image scanner rejects an image headline that differs between languages', async () => {
  const tmp = await mkdtemp(path.join(tmpdir(), 'smartbolig-ai-news-headline-'));
  const date = '2026-04-20';
  await writeArticle(tmp, date);
  await writeValidImages(tmp, date);
  const da = path.join(tmp, `src/content/docs/da/ai/nyheder/${date}.mdx`);
  const en = path.join(tmp, `src/content/docs/en/ai/nyheder/${date}.mdx`);
  for (const [file, headline] of [[da, 'OpenClaw 2026.8.34'], [en, 'A different release']]) {
    const article = await readFile(file, 'utf8');
    await writeFile(file, article.replace('heroImage:', `news:\n  imageHeadline: "${headline}"\nheroImage:`));
  }
  const { stdout } = await execFileAsync('node', ['scripts/ai-news-pending-images.mjs', '--root', tmp], { cwd: rootDir });
  assert.match(stdout, /English news\.imageHeadline must match Danish/);
});
