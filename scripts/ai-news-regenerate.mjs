#!/usr/bin/env node
// One-time (re)generation of archived AI-news issues with the v3 renderer.
//
// Old issues were written by a template that stamped the same sentences into
// every story. This script rebuilds each day from its own source table
// (publisher, title, URL, date live in every article), re-reads the sources
// for fresh material, asks the LLM layer for unique editorial copy (with the
// deterministic template as fallback), and renders both locales again.
// Days whose source set is identical to the previous day become honest
// low-signal repeat digests instead of masquerading as fresh issues.
import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalizeUrl, stripHtml } from './lib/ai-news-discovery.mjs';
import { generateIssueCopy } from './lib/ai-news-llm.mjs';
import { sourceSetFingerprint } from './lib/ai-news-editorial.mjs';
import { renderIssue, renderRepeatIssue } from './lib/ai-news-render.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const daNewsDir = path.join(rootDir, 'src/content/docs/da/ai/nyheder');
const enNewsDir = path.join(rootDir, 'src/content/docs/en/ai/nyheder');

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

const args = parseArgs(process.argv.slice(2));
const onlyDate = args.get('--date') ? String(args.get('--date')) : '';
const limit = Number(args.get('--limit') || 0);
const useLlm = !args.has('--no-llm');
const dryRun = args.has('--dry-run');
const force = args.has('--force');

function alreadyRegenerated(content) {
  return /editorialVersion: 3/.test(content)
    && /copySource: (?:llm|repeat)/.test(content);
}

const TABLE_ROW = /^\|\s*([^|]+?)\s*\|\s*\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)\s*\|\s*([^|]+?)\s*\|$/;

// Restores the feed id so story/source-set fingerprints stay comparable with
// what the live pipeline writes (history dedup reads them back).
function sourceIdForUrl(url) {
  if (/github\.com\/openai\/codex/i.test(url)) return 'openai-codex';
  if (/github\.com\/anthropics\/claude-code/i.test(url)) return 'claude-code';
  if (/github\.com\/google-gemini\/gemini-cli/i.test(url)) return 'gemini-cli';
  if (/github\.com\/openclaw/i.test(url)) return 'openclaw';
  if (/anthropic\.com|claude\.com/i.test(url)) return 'anthropic-news';
  if (/blog\.google|ai\.google\.dev/i.test(url)) return 'google-ai';
  if (/openai\.com/i.test(url)) return 'openai-news';
  return 'unknown';
}

function parseSourceTable(content) {
  const items = [];
  for (const line of content.split('\n')) {
    const match = line.match(TABLE_ROW);
    if (!match) continue;
    const [, providerLabel, title, url, dateRaw] = match;
    if (/^-+$/.test(providerLabel.trim()) || /^(area|publisher|udgiver|område)$/i.test(providerLabel.trim())) continue;
    const published = new Date(dateRaw.trim());
    const canonicalUrl = canonicalizeUrl(url);
    if (!canonicalUrl || Number.isNaN(published.getTime())) continue;
    items.push({
      sourceId: sourceIdForUrl(url),
      sourceName: providerLabel.trim(),
      title: title.trim(),
      url,
      canonicalUrl,
      summary: '',
      bodyText: '',
      published,
    });
  }
  return items;
}

async function fetchSourceMaterial(item) {
  try {
    const response = await fetch(item.canonicalUrl, {
      headers: {
        'User-Agent': 'SmartBolig AI News Bot (+https://smartbolig.net/da/ai/nyheder/)',
        Accept: 'text/html, application/xhtml+xml;q=0.9, text/plain;q=0.8',
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return;
    const html = await response.text();
    const description = html.match(/<meta[^>]+(?:property="og:description"|name="description")[^>]+content="([^"]+)"/i)?.[1]
      || html.match(/<meta[^>]+content="([^"]+)"[^>]+(?:property="og:description"|name="description")/i)?.[1]
      || '';
    item.summary = stripHtml(description).slice(0, 500);
    item.bodyText = stripHtml(html).slice(0, 20_000);
  } catch {
    // Dead or slow source: the LLM prompt then only carries title/provider,
    // and the copy is required to stay within what the material supports.
  }
}

function urlSetKey(items) {
  return [...new Set(items.map((item) => item.canonicalUrl))].sort().join('\n');
}

async function listDates() {
  const names = await readdir(daNewsDir);
  return names
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.mdx$/.test(name))
    .map((name) => name.replace(/\.mdx$/, ''))
    .sort();
}

async function main() {
  let dates = await listDates();
  if (onlyDate) dates = dates.filter((date) => date === onlyDate);
  if (limit > 0) dates = dates.slice(0, limit);
  if (dates.length === 0) {
    console.error('No matching AI-news dates found.');
    process.exit(1);
  }

  let previousKey = '';
  let previousFullDate = '';
  const failures = [];

  for (const date of dates) {
    const enPath = path.join(enNewsDir, `${date}.mdx`);
    const daPath = path.join(daNewsDir, `${date}.mdx`);
    const daContent = await readFile(daPath, 'utf8');
    const tableSource = existsSync(enPath) ? await readFile(enPath, 'utf8') : daContent;
    const items = parseSourceTable(tableSource);
    if (items.length === 0) {
      failures.push(`${date}: no parseable source table`);
      continue;
    }

    const key = urlSetKey(items);
    const isRepeat = previousKey !== '' && key === previousKey && previousFullDate !== '';

    // Resume support: a day that already carries v3 LLM/repeat copy is done.
    if (!force && !dryRun && alreadyRegenerated(daContent)) {
      console.log(`${date}: already regenerated, skipping (use --force to redo)`);
      previousKey = key;
      if (!isRepeat) previousFullDate = date;
      continue;
    }

    if (isRepeat) {
      if (!dryRun) {
        await writeFile(daPath, renderRepeatIssue({ locale: 'da', date, repeatOfDate: previousFullDate, items }), 'utf8');
        await writeFile(enPath, renderRepeatIssue({ locale: 'en', date, repeatOfDate: previousFullDate, items }), 'utf8');
      }
      console.log(`${date}: repeat of ${previousFullDate} (${items.length} sources)`);
      previousKey = key;
      continue;
    }

    if (dryRun) {
      console.log(`${date}: full issue, ${items.length} sources`);
      previousKey = key;
      previousFullDate = date;
      continue;
    }

    await Promise.all(items.map((item) => fetchSourceMaterial(item)));

    let copy = null;
    if (useLlm) {
      try {
        copy = await generateIssueCopy({ date, items });
      } catch (error) {
        failures.push(`${date}: LLM copy fell back to template (${error.message.split('\n')[0].slice(0, 160)})`);
      }
    }

    const editorialPackage = { status: 'publish', items, sourceSetFingerprint: sourceSetFingerprint(items) };
    await writeFile(daPath, renderIssue({ locale: 'da', date, editorialPackage, copy }), 'utf8');
    await writeFile(enPath, renderIssue({ locale: 'en', date, editorialPackage, copy }), 'utf8');
    console.log(`${date}: regenerated (${items.length} sources, copy=${copy ? 'llm' : 'template'})`);

    previousKey = key;
    previousFullDate = date;
  }

  if (failures.length > 0) {
    console.log('\nNotes:');
    for (const failure of failures) console.log(`- ${failure}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
