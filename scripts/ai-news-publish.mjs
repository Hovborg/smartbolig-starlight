#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FEEDS, HIGH_SIGNAL_KEYWORDS, OFFICIAL_SOURCE_URLS } from './ai-news-sources.mjs';
import { canonicalizeUrl, fetchCandidates, parseFeed } from './lib/ai-news-discovery.mjs';
import { selectEditorialPackage } from './lib/ai-news-editorial.mjs';
import { generateIssueCopy } from './lib/ai-news-llm.mjs';
import { renderIssue } from './lib/ai-news-render.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = path.join(rootDir, 'src/content/docs');
const daNewsDir = path.join(docsDir, 'da/ai/nyheder');
const enNewsDir = path.join(docsDir, 'en/ai/nyheder');

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
const writeFiles = args.has('--write');
const force = args.has('--force');
const allowWeakSignal = args.has('--allow-weak-signal');
const llmEnabled = args.has('--llm') || process.env.AI_NEWS_LLM === '1';
const targetDate = args.get('--date') || process.env.AI_NEWS_DATE || new Date().toISOString().slice(0, 10);

// The date becomes part of output filenames — reject anything that is not a
// plain YYYY-MM-DD value (prevents path traversal via --date / AI_NEWS_DATE).
if (!/^\d{4}-\d{2}-\d{2}$/.test(String(targetDate))) {
  console.error(`Invalid date value: ${JSON.stringify(targetDate)}. Expected YYYY-MM-DD.`);
  process.exit(1);
}
const lookbackDays = Number(args.get('--days') || 10);
const minScore = Number(args.get('--min-score') || 14);
const maxItems = Number(args.get('--max-items') || 7);
const maxPerSource = Number(args.get('--max-per-source') || 1);
const fixturePaths = String(args.get('--fixture') || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const resultPath = process.env.AI_NEWS_RESULT_PATH
  || (writeFiles ? path.join(rootDir, '.ai-news-result.json') : '');

async function writeResult(result) {
  if (resultPath) {
    await mkdir(path.dirname(resultPath), { recursive: true });
    const temporaryPath = `${resultPath}.${process.pid}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    await rename(temporaryPath, resultPath);
  }
  console.log(`AI_NEWS_STATUS=${result.status}${result.reason ? ` reason=${result.reason}` : ''}`);
}

function scoreItem(item) {
  const haystack = `${item.source.name} ${item.title} ${item.summary}`.toLowerCase();
  let score = item.source.priority;
  const isReleaseFeed = ['openai-codex', 'claude-code', 'gemini-cli', 'openclaw'].includes(item.source.id);

  for (const [keyword, weight] of HIGH_SIGNAL_KEYWORDS) {
    if (haystack.includes(keyword)) score += weight;
  }

  if (/\bv?\d+\.\d+\.\d+\b/.test(item.title)) score += 1;
  if (isReleaseFeed) score -= 4;
  if (isReleaseFeed && !/\b(security|safety|pricing|deprecation|breaking|permission|privacy|usage|context|browser|model|agent|workflow|mcp|api)\b/i.test(haystack)) {
    score -= 6;
  }
  if (/\bnightly\b/i.test(item.title)) score -= 8;
  if (/\balpha\b/i.test(item.title)) score -= 4;
  if (/\b(preview|beta|rc)\b/i.test(item.title)) score -= 3;
  if (/\b(cherry-pick|patch version|dependency bump)\b/i.test(`${item.title} ${item.summary}`)) score -= 7;
  if (/^release v?\d+\.\d+\.\d+/i.test(item.title)) score -= 4;
  if (/^(v|rust-v)?\d+\.\d+\.\d+/i.test(item.title)) score -= 4;
  if (/\b(academy|customer success|research with chatgpt|data analysis)\b/i.test(item.title)) score -= 5;

  return score;
}

function dateWindow(dateString, days) {
  // Cover `days` whole UTC days, ending on (and including) the target date.
  const end = new Date(`${dateString}T23:59:59.999Z`);
  const start = new Date(`${dateString}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return { start, end };
}

function yamlString(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function renderIndex({ locale, entries }) {
  const isDa = locale === 'da';
  const latest = entries[0];
  const title = isDa ? 'AI-nyheder' : 'AI News';
  const description = isDa
    ? 'Dagligt kildebaseret overblik over de vigtigste AI-nyheder fra OpenAI, Anthropic, Google, modeller, produkter, API-priser, privacy og AI-agent workflows.'
    : 'Daily source-backed brief for the most important AI news from OpenAI, Anthropic, Google, models, products, API pricing, privacy, and AI-agent workflows.';

  if (isDa) {
    return `---
title: ${yamlString(title)}
description: ${yamlString(description)}
lastUpdated: ${latest?.date || new Date().toISOString().slice(0, 10)}
sidebar:
  label: "AI-nyheder"
---

import AiNewsFeed from "../../../../../components/AiNewsFeed.astro";

AI-nyheder fra SmartBolig.net er korte, redaktionelle artikler om de vigtigste AI-nyheder: modeller, ChatGPT, Claude, Gemini, AI i browseren, apps, API-priser, privacy, sikkerhed og agent-workflows. Fokus er officielle kilder, praktisk betydning og egne formuleringer.

<AiNewsFeed locale="da" />
`;
  }

  return `---
title: ${yamlString(title)}
description: ${yamlString(description)}
lastUpdated: ${latest?.date || new Date().toISOString().slice(0, 10)}
sidebar:
  label: "AI News"
---

import AiNewsFeed from "../../../../../components/AiNewsFeed.astro";

SmartBolig.net AI News is a set of short editorial articles about the most important AI news: models, ChatGPT, Claude, Gemini, AI in the browser, apps, API pricing, privacy, security, and agent workflows. The focus is official sources, practical impact, and original wording.

<AiNewsFeed locale="en" />
`;
}

async function fetchItems() {
  if (fixturePaths.length > 0) {
    // Fixtures are trusted local test input, but parseFeed still enforces its
    // per-source host allowlist — so the fixture source accepts every official
    // feed host instead of only its own.
    const base = FEEDS.find((feed) => feed.id === 'openai-codex') || FEEDS[0];
    const source = { ...base, extraHosts: FEEDS.map((feed) => new URL(feed.url).hostname) };
    const results = [];
    for (const fixturePath of fixturePaths) {
      const xml = await readFile(path.resolve(fixturePath), 'utf8');
      results.push(...parseFeed(xml, source));
    }
    return { items: results, failedFeeds: [] };
  }

  const failedFeeds = [];
  const { start, end } = dateWindow(targetDate, lookbackDays);
  const items = await fetchCandidates(FEEDS, fetch, {
    onFeedError(feed, error) {
      failedFeeds.push(feed);
      console.warn(`Could not fetch ${feed.name}: ${error.message}`);
    },
    onArticleError(candidate, error) {
      console.warn(`Could not deep-read ${candidate.canonicalUrl}: ${error.message}`);
    },
    shouldFetchArticle(candidate) {
      if (candidate.published < start || candidate.published > end) return false;
      const daysOld = Math.max(0, (end.getTime() - candidate.published.getTime()) / 86_400_000);
      return scoreItem(candidate) + Math.max(0, 8 - Math.floor(daysOld)) >= minScore;
    },
  });
  return { items, failedFeeds };
}

function scoreCandidates(items) {
  const { start, end } = dateWindow(targetDate, lookbackDays);
  const byUrl = new Map();

  for (const item of items) {
    if (item.published < start || item.published > end) continue;
    const daysOld = Math.max(0, (end.getTime() - item.published.getTime()) / 86_400_000);
    const recencyBoost = Math.max(0, 8 - Math.floor(daysOld));
    const score = scoreItem(item) + recencyBoost;
    const scored = { ...item, score };
    const existing = byUrl.get(item.url);
    if (!existing || existing.score < score) byUrl.set(item.url, scored);
  }

  const candidates = [...byUrl.values()].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.published - a.published;
  });
  const productSourceIds = new Set(['openai-news', 'google-ai', 'anthropic-news']);
  return [
    ...candidates.filter((item) => productSourceIds.has(item.source.id)),
    ...candidates.filter((item) => !productSourceIds.has(item.source.id)),
  ];
}

function parseYamlString(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value.replace(/^['"]|['"]$/g, '');
  }
}

async function loadRecentHistory(days = 14) {
  if (!existsSync(daNewsDir)) return [];
  const { start, end } = dateWindow(targetDate, days);
  const names = await readdir(daNewsDir);
  const history = [];

  for (const name of names) {
    const match = name.match(/^(\d{4}-\d{2}-\d{2})\.mdx$/);
    if (!match || match[1] === targetDate) continue;
    const date = new Date(`${match[1]}T12:00:00Z`);
    if (date < start || date > end) continue;
    const content = await readFile(path.join(daNewsDir, name), 'utf8');
    const frontmatter = content.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] || '';
    const titleRaw = frontmatter.match(/^title:\s*(.+)$/m)?.[1] || '';
    const title = parseYamlString(titleRaw);
    const storyFingerprint = frontmatter.match(/^\s*storyFingerprint:\s*['"]?([a-f0-9]{64})/m)?.[1];
    const sourceSetFingerprint = frontmatter.match(/^\s*sourceSetFingerprint:\s*['"]?([a-f0-9]{64})/m)?.[1];
    const canonicalUrls = [...frontmatter.matchAll(/^\s*-\s*["']?(https?:\/\/[^\s"']+)/gm)]
      .map((sourceMatch) => canonicalizeUrl(sourceMatch[1]))
      .filter(Boolean);
    for (const canonicalUrl of canonicalUrls.length > 0 ? canonicalUrls : ['']) {
      history.push({ title, canonicalUrl, storyFingerprint, sourceSetFingerprint, date: match[1] });
    }
  }
  return history;
}

async function listEntries() {
  const names = existsSync(daNewsDir) ? await readdir(daNewsDir) : [];
  return names
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.mdx$/.test(name))
    .map((name) => ({ date: name.replace(/\.mdx$/, '') }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

async function writeIfChanged(filePath, content) {
  if (!force && existsSync(filePath) && filePath.endsWith(`${targetDate}.mdx`)) {
    return { path: filePath, changed: false, reason: 'exists' };
  }

  let previous = '';
  if (existsSync(filePath)) previous = await readFile(filePath, 'utf8');
  if (previous === content) return { path: filePath, changed: false, reason: 'unchanged' };
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf8');
  return { path: filePath, changed: true };
}

async function main() {
  const { items: rawItems, failedFeeds } = await fetchItems();

  // A day where every critical feed is down must fail loudly — exit 0 would be
  // indistinguishable from a legitimately quiet news day.
  const criticalFeeds = FEEDS.filter((feed) => feed.critical);
  const failedCritical = failedFeeds.filter((feed) => feed.critical);
  if (criticalFeeds.length > 0 && failedCritical.length === criticalFeeds.length) {
    console.error(`All critical feeds failed (${failedCritical.map((feed) => feed.name).join(', ')}). Aborting instead of treating this as a quiet news day.`);
    process.exit(1);
  }

  const candidates = scoreCandidates(rawItems);
  const history = await loadRecentHistory();
  const editorial = selectEditorialPackage(candidates, history, {
    minScore,
    maxItems,
    maxPerSource,
    duplicateThreshold: 0.72,
  });
  const selected = editorial.status === 'publish' ? editorial.items : [];
  const weakSignal = selected.length < 2;

  if (editorial.status !== 'publish') {
    await writeResult({ status: 'skip', date: targetDate, reason: editorial.reason, files: [] });
    process.exit(0);
  }

  if (weakSignal && !allowWeakSignal) {
    await writeResult({
      status: 'skip',
      date: targetDate,
      reason: `Only ${selected.length} publishable item(s) passed; at least 2 are required.`,
      files: [],
    });
    process.exit(0);
  }

  // Unique editorial prose via headless Claude when enabled; the deterministic
  // template remains the always-available fallback so publishing never blocks.
  let copy = null;
  if (llmEnabled) {
    try {
      copy = await generateIssueCopy({ date: targetDate, items: selected });
      console.log('LLM editorial copy accepted.');
    } catch (error) {
      console.warn(`LLM editorial copy unavailable (${error.message}); using template copy.`);
    }
  }

  const daPath = path.join(daNewsDir, `${targetDate}.mdx`);
  const enPath = path.join(enNewsDir, `${targetDate}.mdx`);
  const daArticle = renderIssue({ locale: 'da', date: targetDate, editorialPackage: editorial, copy });
  const enArticle = renderIssue({ locale: 'en', date: targetDate, editorialPackage: editorial, copy });

  if (!writeFiles) {
    console.log(daArticle);
    return;
  }

  const writes = [
    await writeIfChanged(daPath, daArticle),
    await writeIfChanged(enPath, enArticle),
  ];

  const entries = await listEntries();
  const nextEntries = entries.some((entry) => entry.date === targetDate)
    ? entries
    : [{ date: targetDate }, ...entries].sort((a, b) => b.date.localeCompare(a.date));

  writes.push(await writeIfChanged(path.join(daNewsDir, 'index.mdx'), renderIndex({ locale: 'da', entries: nextEntries })));
  writes.push(await writeIfChanged(path.join(enNewsDir, 'index.mdx'), renderIndex({ locale: 'en', entries: nextEntries })));

  for (const result of writes) {
    const rel = path.relative(rootDir, result.path);
    console.log(`${result.changed ? 'wrote' : 'kept'} ${rel}${result.reason ? ` (${result.reason})` : ''}`);
  }
  await writeResult({
    status: 'publish',
    date: targetDate,
    reason: 'Editorial package accepted.',
    copySource: copy ? 'llm' : 'template',
    files: writes.filter((result) => result.changed).map((result) => path.relative(rootDir, result.path)),
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
