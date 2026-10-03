import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { frontmatter, renderEditorialSvg, selectMotif } from './ai-news-render-image.mjs';

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(import.meta.dirname, '..');
const date = '2026-10-03';
const variants = [
  { suffix: '', width: 1200, height: 630 },
  { suffix: '-16x9', width: 1200, height: 675 },
  { suffix: '-4x3', width: 1200, height: 900 },
  { suffix: '-1x1', width: 1200, height: 1200 },
];

async function rasterHeadlineBounds(svg, width, height) {
  const headlineElements = [...svg.matchAll(/<text[^>]+data-headline-line="true"[^>]*>[^<]+<\/text>/g)]
    .map((match) => match[0])
    .join('\n');
  assert.ok(headlineElements, 'expected headline text elements');
  const isolatedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${headlineElements}</svg>`;
  const { data, info } = await sharp(Buffer.from(isolatedSvg))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = width;
  let maxX = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[((y * info.width + x) * info.channels) + 3] === 0) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
  }
  assert.ok(maxX >= 0, 'expected rasterized headline pixels');
  return { minX, maxX };
}

function decodeSvgText(value) {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&gt;', '>')
    .replaceAll('&lt;', '<')
    .replaceAll('&amp;', '&');
}

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
  const environment = { ...process.env };
  delete environment.AI_NEWS_DISABLE_AI;
  delete environment.AI_NEWS_ENABLE_COMFYUI;
  const { stdout } = await execFileAsync('node', ['scripts/ai-news-render-image.mjs', '--root', root, '--date', date, '--force'], {
    cwd: repoRoot,
    env: environment,
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
    assert.match(svg, /OpenClaw 2026\.8\.34/);
    assert.doesNotMatch(svg, /Generic description/);
    const copyBottom = Number(svg.match(/data-copy-bottom="(\d+)"/)?.[1]);
    assert.ok(copyBottom > 0 && copyBottom < variant.height - 54, `copy bottom ${copyBottom} must fit ${variant.height}px canvas`);
  }
});

test('compact SVG keeps a near-limit image headline complete and inside the canvas', () => {
  const headline = 'OpenClaw 2026.8.34 adds guarded browser workflows and safer developer API controls';
  assert.ok(headline.length >= 80 && headline.length <= 88);
  const svg = renderEditorialSvg({
    width: 1200,
    height: 630,
    date,
    headline,
    providers: ['OpenClaw'],
  });

  assert.doesNotMatch(svg, /\.\.\./);
  assert.match(svg, />controls<\/text>/);
  const copyBottom = Number(svg.match(/data-copy-bottom="(\d+)"/)?.[1]);
  assert.ok(copyBottom > 0 && copyBottom < 576, `copy bottom ${copyBottom} must fit 630px canvas`);
});

test('unbroken official-source headline stays complete in the text column for wide and square images', async () => {
  const headline = 'OpenAIResponsesAPI20261003EnterpriseAgentWorkflowSecurityReleaseNotesUpdate';
  assert.ok(headline.length >= 70 && headline.length <= 88);
  assert.doesNotMatch(headline, /\s/);

  for (const variant of [
    { width: 1200, height: 630 },
    { width: 1200, height: 1200 },
  ]) {
    const svg = renderEditorialSvg({
      ...variant,
      date,
      headline,
      providers: ['OpenAI'],
    });
    assert.match(svg, /LEAD STORY · HOVEDHISTORIE/);
    assert.doesNotMatch(svg, /DAGENS HOVEDHISTORIE/);

    const columnRight = Number(svg.match(/data-text-column-right="(\d+)"/)?.[1]);
    const lines = [...svg.matchAll(/<text[^>]+data-headline-line="true"[^>]+data-render-width="([\d.]+)"[^>]*>([^<]+)<\/text>/g)];
    assert.ok(lines.length >= 2 && lines.length <= 4, `expected 2-4 headline lines, got ${lines.length}`);
    assert.equal(lines.map((match) => match[2]).join(''), headline);
    for (const match of lines) {
      assert.ok(78 + Number(match[1]) <= columnRight, `headline line must end within x=${columnRight}`);
    }

    const image = sharp(Buffer.from(svg)).jpeg({ quality: 82 });
    const metadata = await image.metadata();
    await image.raw().toBuffer();
    assert.equal(metadata.width, variant.width);
    assert.equal(metadata.height, variant.height);
  }
});

test('wide-glyph headline pixels stay inside the text column at 630px and 1200px heights', async (context) => {
  for (const glyph of ['W', 'w', 'm', '@', '%', '&', '漢']) {
    const headline = glyph.repeat(88);
    for (const height of [630, 1200]) {
      const svg = renderEditorialSvg({
        width: 1200,
        height,
        date,
        headline,
        providers: ['OpenAI'],
      });
      const columnRight = Number(svg.match(/data-text-column-right="(\d+)"/)?.[1]);
      const renderedHeadline = [...svg.matchAll(/<text[^>]+data-headline-line="true"[^>]*>([^<]+)<\/text>/g)]
        .map((match) => decodeSvgText(match[1]))
        .join('');
      assert.equal(renderedHeadline, headline);
      const { minX, maxX } = await rasterHeadlineBounds(svg, 1200, height);
      assert.ok(minX >= 78, `${glyph} headline starts at x=${minX}, before the text column`);
      assert.ok(maxX <= columnRight, `${glyph} headline reaches x=${maxX}, beyond text column x=${columnRight}`);
      context.diagnostic(`${glyph} height=${height}: raster headline x=${minX}..${maxX}, column right=${columnRight}`);
    }
  }
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
