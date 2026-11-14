import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { frontmatter, imageHeadline, renderEditorialSvg, selectMotif } from './ai-news-render-image.mjs';

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(import.meta.dirname, '..');
const date = '2026-10-03';
const variants = [
  { suffix: '', width: 1200, height: 630 },
  { suffix: '-16x9', width: 1200, height: 675 },
  { suffix: '-4x3', width: 1200, height: 900 },
  { suffix: '-1x1', width: 1200, height: 1200 },
];

async function renderFixture(imageHeadline) {
  const root = await mkdtemp(path.join(tmpdir(), 'smartbolig-render-image-'));
  const articleDir = path.join(root, 'src/content/docs/da/ai/nyheder');
  await mkdir(articleDir, { recursive: true });
  await writeFile(path.join(articleDir, `${date}.mdx`), `---
title: "AI-nyheder, 3. oktober 2026"
description: "Kurateret AI-overblik med den samme generiske beskrivelse."
news:
  imageHeadline: "${imageHeadline}"
sources:
  - "https://github.com/openclaw/openclaw/releases/tag/v2026.8.34"
---
`);
  const { stdout } = await execFileAsync('node', ['scripts/ai-news-render-image.mjs', '--root', root, '--date', date, '--force'], {
    cwd: repoRoot,
  });
  return { root, stdout };
}

test('offline renderer creates four valid JPEGs and makes the lead headline visually distinct', async () => {
  let first;
  let second;
  try {
    first = await renderFixture('OpenClaw 2026.8.34');
    second = await renderFixture('Browser security update');
    assert.match(first.stdout, /Using the offline editorial illustration/);
    assert.match(second.stdout, /Using the offline editorial illustration/);

    for (const root of [first.root, second.root]) {
      for (const variant of variants) {
        const imagePath = path.join(root, `public/images/ai-news/${date}${variant.suffix}.jpg`);
        const metadata = await sharp(imagePath).metadata();
        await sharp(imagePath).raw().toBuffer();
        assert.equal(metadata.format, 'jpeg');
        assert.equal(metadata.width, variant.width);
        assert.equal(metadata.height, variant.height);
      }
    }

    const firstImage = await readFile(path.join(first.root, `public/images/ai-news/${date}.jpg`));
    const secondImage = await readFile(path.join(second.root, `public/images/ai-news/${date}.jpg`));
    assert.notEqual(
      createHash('sha256').update(firstImage).digest('hex'),
      createHash('sha256').update(secondImage).digest('hex'),
      'different lead headlines must not render the same visual',
    );
  } finally {
    await Promise.all([first?.root, second?.root]
      .filter(Boolean)
      .map((root) => rm(root, { recursive: true, force: true })));
  }
});

const decodeTitle = (svg) => svg.match(/<title>([^<]*)<\/title>/)?.[1].replaceAll('&amp;', '&');

test('SVG layout uses the source-bound headline without the generic description', () => {
  const meta = frontmatter(`---
title: "AI-nyheder, 3. oktober 2026"
description: "Generic description that must never appear on the artwork."
news:
  imageHeadline: "OpenClaw 2026.8.34"
sources:
  - "https://github.com/openclaw/openclaw/releases/tag/v2026.8.34"
---`);
  assert.equal(meta.imageHeadline, 'OpenClaw 2026.8.34');

  for (const variant of variants) {
    const svg = renderEditorialSvg({
      ...variant,
      date,
      headline: meta.imageHeadline,
      providers: ['OpenClaw'],
    });
    assert.equal(decodeTitle(svg), 'OpenClaw 2026.8.34');
    assert.doesNotMatch(svg, /Generic description/);
    const copyBottom = Number(svg.match(/data-copy-bottom="(\d+)"/)?.[1]);
    assert.ok(copyBottom > 0 && copyBottom < variant.height - 40, `copy bottom ${copyBottom} must fit ${variant.height}px canvas`);
  }
});

test('all text is outlined paths and the palette is graphite and green, never purple', () => {
  const svg = renderEditorialSvg({
    ...variants[0],
    date,
    headline: 'Økonomi, sikkerhed og åbne modeller i AI',
    providers: ['OpenAI', 'Claude'],
  });
  assert.doesNotMatch(svg, /<text[\s>]/, 'text must be drawn as paths, not <text>');
  assert.doesNotMatch(svg, /font-family/);
  assert.doesNotMatch(svg, /<image/);
  const colors = [...new Set([...svg.matchAll(/#[0-9a-f]{6}(?![0-9a-f])/gi)].map((m) => m[0].toLowerCase()))];
  assert.ok(colors.length > 0);
  for (const hex of colors) {
    const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
    const purple = b > g + 20 && r > g + 20; // red and blue both clearly above green
    assert.ok(!purple, `${hex} is purple`);
  }
  assert.ok(colors.includes('#090d11'), 'dark graphite background from the tokens');
  assert.ok(colors.includes('#3ee0a6'), 'accent green');
});

test('long and unbroken headlines stay within three lines and inside the canvas', async () => {
  const long = 'OpenClaw 2026.8.34 adds guarded browser workflows and safer developer API controls';
  const unbroken = 'OpenAIResponsesAPI20261003EnterpriseAgentWorkflowSecurityReleaseNotesUpdate';
  const wide = 'W'.repeat(88);
  for (const headline of [long, unbroken, wide, 'Økonomi, sikkerhed og åbne modeller: Gemini får større hukommelse og ændrer priserne']) {
    for (const variant of variants) {
      const svg = renderEditorialSvg({ ...variant, date, headline, providers: ['OpenAI'] });
      const lines = Number(svg.match(/data-headline-lines="(\d+)"/)?.[1]);
      assert.ok(lines >= 1 && lines <= 3, `expected 1-3 headline lines, got ${lines}`);
      const shown = decodeTitle(svg);
      const flat = (value) => value.replaceAll(' ', '');
      const ok = shown.endsWith('…') ? flat(headline).startsWith(flat(shown.slice(0, -1))) : flat(shown) === flat(headline);
      assert.ok(ok, `headline text changed: ${shown}`);
      const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      assert.equal(info.width, variant.width);
      assert.equal(info.height, variant.height);
      // Only background reaches the canvas edges: nothing is clipped.
      for (let y = 0; y < info.height; y += 7) {
        for (const x of [0, 1, 2, info.width - 3, info.width - 2, info.width - 1]) {
          const i = (y * info.width + x) * info.channels;
          assert.ok(data[i] < 90 && data[i + 1] < 90 && data[i + 2] < 90, `bright pixel at ${x},${y}`);
        }
      }
    }
  }
});

test('the picture is shared by both languages: no language option, and a wordless fallback', () => {
  const svg = renderEditorialSvg({ ...variants[0], date, headline: 'Gemini API pricing', providers: ['Google AI'] });
  assert.equal(decodeTitle(svg), 'Gemini API pricing');
  assert.equal(renderEditorialSvg({ ...variants[0], date, headline: 'Gemini API pricing', providers: ['Google AI'], lang: 'en' }), svg);
  const empty = renderEditorialSvg({ ...variants[0], date, headline: '', providers: ['AI'] });
  assert.equal(decodeTitle(empty), 'AI 2026-10-03');
});

test('the headline is the one the article names, else its main story, never the bare date title', () => {
  const head = (extra) => `---\ntitle: "AI-nyheder, 3. oktober 2026"\n${extra}---\n\n### 1. OpenAI Codex releases: 0.154.0\n\n### 2. Other\n`;
  assert.equal(imageHeadline(head('news:\n  imageHeadline: "OpenClaw 2026.8.34"\n')), 'OpenClaw 2026.8.34');
  assert.equal(imageHeadline(head('')), 'OpenAI Codex releases: 0.154.0');
  assert.equal(imageHeadline('---\ntitle: "AI-nyheder, 3. oktober 2026: Gemini 3"\n---\n\n### 1. Other\n'), 'Gemini 3');
});

test('frontmatter decodes JSON-escaped quotes in generated image headlines', () => {
  const meta = frontmatter(String.raw`---
title: "AI-nyheder"
news:
  imageHeadline: "OpenClaw says \"safe\" mode"
---`);
  assert.equal(meta.imageHeadline, 'OpenClaw says "safe" mode');
});

test('motif selection follows lead-story terms without remote assets or logos', () => {
  assert.equal(selectMotif('Security token permission update'), 'security');
  assert.equal(selectMotif('New reasoning model'), 'model');
  assert.equal(selectMotif('OpenClaw agent workflow'), 'agent');
  assert.equal(selectMotif('Browser tab update'), 'browser');
  assert.equal(selectMotif('Developer API endpoint'), 'api');
  assert.equal(selectMotif('Fresh AI research'), 'default');
});
