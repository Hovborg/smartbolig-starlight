import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(import.meta.dirname, '..');

test('AI News draft renders as a blog-style article with a narrative lead and source section', async () => {
  const tmp = await mkdtemp(path.join(tmpdir(), 'smartbolig-ai-news-post-'));
  const fixture = path.join(tmp, 'feed.atom');

  await writeFile(fixture, `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>OpenAI Codex 9.9.9 improves review workflows</title>
    <link href="https://github.com/openai/codex/releases/tag/rust-v9.9.9" />
    <updated>2026-04-19T06:00:00Z</updated>
    <summary>Release notes for a test fixture.</summary>
  </entry>
</feed>
`);

  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      [
        'scripts/ai-news-publish.mjs',
        '--date',
        '2026-04-19',
        '--fixture',
        fixture,
        '--allow-weak-signal',
        '--min-score',
        '0',
        '--max-items',
        '1',
      ],
      { cwd: rootDir },
    );

    assert.match(stdout, /OpenAI Codex 9\.9\.9 improves review workflows/);
    assert.match(stdout, /heroImage:\n  src: "\/images\/ai-news\/2026-04-19\.png"/);
    assert.match(stdout, /alt: "SmartBolig-hardwarevisual/);
    assert.match(stdout, /caption: "SmartBolig-hardware/);
    assert.match(stdout, /<p class="ai-news-byline">/);
    assert.match(stdout, /## Hovedhistorien/);
    assert.match(stdout, /## Hvorfor det betyder noget/);
    assert.match(stdout, /## Kilder og videre læsning/);
    assert.doesNotMatch(stdout, /AI Radar/);
    assert.doesNotMatch(stdout, /genereret|generated|automatiseret nyhedsfeed/i);
    assert.doesNotMatch(stdout, /## Nyhederne i dag/);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test('AI News copy is broad AI coverage, not only CLI release notes', async () => {
  const tmp = await mkdtemp(path.join(tmpdir(), 'smartbolig-ai-news-broad-'));
  const fixture = path.join(tmp, 'feed.atom');

  await writeFile(fixture, `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>ChatGPT adds personal memory for everyday planning</title>
    <link href="https://openai.com/index/test-chatgpt-memory" />
    <updated>2026-04-19T06:00:00Z</updated>
    <summary>Product update for a broader AI feature, not a command-line release.</summary>
  </entry>
</feed>
`);

  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      [
        'scripts/ai-news-publish.mjs',
        '--date',
        '2026-04-19',
        '--fixture',
        fixture,
        '--allow-weak-signal',
        '--min-score',
        '0',
        '--max-items',
        '1',
      ],
      { cwd: rootDir },
    );

    assert.match(stdout, /ChatGPT adds personal memory for everyday planning/);
    assert.match(stdout, /modeller, produkter, ChatGPT, Claude, Gemini, API-priser, privacy og agent-workflows/);
    assert.match(stdout, /AI-produkter, modeller, browseroplevelser, agents, API-brug, privacy, priser eller sikkerhed/);
    assert.doesNotMatch(stdout, /Fokus er release notes, CLI-agent ændringer og API-ændringer/);
    assert.doesNotMatch(stdout, /AI CLI'er, coding agents, API-brug, priser eller sikkerhed/);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
