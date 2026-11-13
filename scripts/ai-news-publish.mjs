#!/usr/bin/env node
// Builds today's bilingual AI-news issue: fetch official sources, pick a
// candidate pool, write and fact-check each story, render both locales.
// A day without enough fact-checked stories is a successful run with
// AI_NEWS_STATUS=skip. Flow and troubleshooting: docs/nyhedsflow.md.
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FEEDS } from './ai-news-sources.mjs';
import { fetchCandidates, parseFeed } from './lib/ai-news-discovery.mjs';
import { finalizeEditorialPackage, selectEditorialPackage, storyFingerprint } from './lib/ai-news-editorial.mjs';
import { listIssueDates, loadRecentHistory } from './lib/ai-news-history.mjs';
import { renderIndex } from './lib/ai-news-index-page.mjs';
import { issueFingerprint, renderIssue } from './lib/ai-news-render.mjs';
import { dateWindow, recencyBoost, scoreCandidates, scoreItem } from './lib/ai-news-scoring.mjs';
import { produceIssue } from './lib/news-llm/issue.mjs';
import { createChat } from './lib/news-llm/provider.mjs';

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
const requireLlm = args.has('--require-llm') || process.env.AI_NEWS_REQUIRE_LLM === '1';
const llmEnabled = requireLlm || args.has('--llm') || process.env.AI_NEWS_LLM === '1';
const targetDate = args.get('--date') || process.env.AI_NEWS_DATE || new Date().toISOString().slice(0, 10);

// The date becomes part of output filenames — reject anything that is not a
// plain YYYY-MM-DD value (prevents path traversal via --date / AI_NEWS_DATE).
if (!/^\d{4}-\d{2}-\d{2}$/.test(String(targetDate))) {
  console.error(`Invalid date value: ${JSON.stringify(targetDate)}. Expected YYYY-MM-DD.`);
  process.exit(1);
}
const lookbackDays = Number(args.get('--days') || 10);
const minScore = Number(args.get('--min-score') || 14);
// --max-items is the candidate pool. --stories of them are published; the
// rest are reserves for stories the fact check drops.
const maxItems = Number(args.get('--max-items') || 7);
const targetStories = Math.min(Number(args.get('--stories') || 4), maxItems);
// The automatic quality gate needs three sources; manual runs may go lower.
const minStories = allowWeakSignal ? 1 : Math.max(1, Number(args.get('--min-stories') || (requireLlm ? 3 : 2)));
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
  const items = await fetchCandidates(FEEDS, undefined, {
    onFeedError(feed, error) {
      failedFeeds.push(feed);
      console.warn(`Could not fetch ${feed.name}: ${error.message}`);
    },
    onArticleError(candidate, error) {
      console.warn(`Could not deep-read ${candidate.canonicalUrl}: ${error.message}`);
    },
    shouldFetchArticle(candidate) {
      if (candidate.published < start || candidate.published > end) return false;
      return scoreItem(candidate) + recencyBoost(candidate.published, end) >= minScore;
    },
  });
  return { items, failedFeeds };
}

async function writeIfChanged(filePath, content) {
  if (!force && existsSync(filePath) && filePath.endsWith(`${targetDate}.mdx`)) {
    return { path: filePath, changed: false, reason: 'exists' };
  }
  const previous = existsSync(filePath) ? await readFile(filePath, 'utf8') : '';
  if (previous === content) return { path: filePath, changed: false, reason: 'unchanged' };
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf8');
  return { path: filePath, changed: true };
}

// Writes and fact-checks the copy. Returns the stories that passed, or a skip.
async function editorialCopy(pool, history) {
  if (!llmEnabled) return { status: 'publish', editorial: finalizeEditorialPackage(pool.slice(0, targetStories), history), copy: null };
  let llm;
  let issue;
  try {
    llm = createChat();
    issue = await produceIssue({ date: targetDate, candidates: pool, target: targetStories, minimum: minStories, chat: llm.chat });
  } catch (error) {
    if (requireLlm) throw new Error(`Required LLM editorial copy was not produced: ${error.message}`);
    console.warn(`LLM editorial copy unavailable (${error.message}); using template copy.`);
    return { status: 'publish', editorial: finalizeEditorialPackage(pool.slice(0, targetStories), history), copy: null };
  }
  const stats = { calls: llm.stats.calls, neurons: Math.round(llm.stats.neurons), dropped: issue.dropped };
  if (issue.status !== 'publish') return { status: 'skip', reason: issue.reason, stats };
  console.log(`Fact check passed for ${issue.items.length} stories (${issue.dropped.length} dropped, ${stats.calls} model calls).`);
  return { status: 'publish', editorial: finalizeEditorialPackage(issue.items, history), copy: issue.copy, ledeSource: issue.ledeSource, stats };
}

async function main() {
  // A second run on the same day must not spend model calls on an issue that
  // already exists.
  if (writeFiles && !force && existsSync(path.join(daNewsDir, `${targetDate}.mdx`))) {
    await writeResult({ status: 'skip', date: targetDate, reason: `The issue for ${targetDate} already exists.`, exists: true, files: [] });
    return;
  }

  const { items: rawItems, failedFeeds } = await fetchItems();

  // A day where every critical feed is down must fail loudly — exit 0 would be
  // indistinguishable from a legitimately quiet news day.
  const criticalFeeds = FEEDS.filter((feed) => feed.critical);
  const failedCritical = failedFeeds.filter((feed) => feed.critical);
  if (criticalFeeds.length > 0 && failedCritical.length === criticalFeeds.length) {
    console.error(`All critical feeds failed (${failedCritical.map((feed) => feed.name).join(', ')}). Aborting instead of treating this as a quiet news day.`);
    process.exit(1);
  }

  const candidates = scoreCandidates(rawItems, { targetDate, lookbackDays });
  const history = await loadRecentHistory({ newsDir: daNewsDir, targetDate });
  const selection = selectEditorialPackage(candidates, history, {
    minScore,
    maxItems,
    maxPerSource,
    duplicateThreshold: 0.72,
    minEvidenceChars: fixturePaths.length > 0 ? 0 : 240,
  });

  if (selection.status !== 'publish') {
    await writeResult({ status: 'skip', date: targetDate, reason: selection.reason, files: [] });
    return;
  }
  if (selection.items.length < minStories) {
    await writeResult({
      status: 'skip',
      date: targetDate,
      reason: `Only ${selection.items.length} publishable item(s) passed; at least ${minStories} are required.`,
      files: [],
    });
    return;
  }

  const outcome = await editorialCopy(selection.items, history);
  const editorial = outcome.editorial;
  if (outcome.status !== 'publish' || editorial.status !== 'publish') {
    await writeResult({ status: 'skip', date: targetDate, reason: outcome.reason || editorial.reason, files: [], ...outcome.stats });
    return;
  }
  const { copy } = outcome;

  const daArticle = renderIssue({ locale: 'da', date: targetDate, editorialPackage: editorial, copy });
  const enArticle = renderIssue({ locale: 'en', date: targetDate, editorialPackage: editorial, copy });
  if (!writeFiles) {
    console.log(daArticle);
    return;
  }

  const writes = [
    await writeIfChanged(path.join(daNewsDir, `${targetDate}.mdx`), daArticle),
    await writeIfChanged(path.join(enNewsDir, `${targetDate}.mdx`), enArticle),
  ];
  const latestDate = [targetDate, ...await listIssueDates(daNewsDir)].sort((a, b) => b.localeCompare(a))[0];
  writes.push(await writeIfChanged(path.join(daNewsDir, 'index.mdx'), renderIndex({ locale: 'da', latestDate })));
  writes.push(await writeIfChanged(path.join(enNewsDir, 'index.mdx'), renderIndex({ locale: 'en', latestDate })));

  for (const result of writes) {
    const rel = path.relative(rootDir, result.path);
    console.log(`${result.changed ? 'wrote' : 'kept'} ${rel}${result.reason ? ` (${result.reason})` : ''}`);
  }
  await writeResult({
    status: 'publish',
    date: targetDate,
    reason: 'Editorial package accepted.',
    copySource: copy ? 'llm' : 'template',
    semanticReview: copy?.semanticReview || 'not-run',
    ledeSource: outcome.ledeSource || 'template',
    stories: editorial.items.length,
    ...outcome.stats,
    storyFingerprint: editorial.items[0] ? storyFingerprint(editorial.items[0]) : '',
    issueFingerprint: issueFingerprint({ date: targetDate, items: editorial.items, copy }),
    files: writes.filter((result) => result.changed).map((result) => path.relative(rootDir, result.path)),
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
