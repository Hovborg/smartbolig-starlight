#!/usr/bin/env node
import { FEEDS, OFFICIAL_SOURCE_URLS } from './ai-news-sources.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchPublicText } from './lib/ai-news-discovery.mjs';

const timeoutMs = Number(process.env.AI_NEWS_SOURCE_TIMEOUT_MS || 20000);

function countEntries(feed, body) {
  if (feed.kind === 'html-listing') {
    return new Set([...body.matchAll(/href="(\/news\/[a-z0-9][a-z0-9-]*)"/gi)].map((match) => match[1])).size;
  }
  return (body.match(/<item\b|<entry\b/gi) || []).length;
}

export async function fetchText(url, headers = {}, { fetchImpl, lookup, source = { url }, readBody = true } = {}) {
  return fetchPublicText(url, {
    fetchImpl,
    lookup,
    source,
    timeoutMs,
    maxBytes: 2_000_000,
    allowHttpErrors: true,
    readBody,
    headers: {
      'User-Agent': 'SmartBolig AI News Source Health (+https://smartbolig.net/da/ai/nyheder/)',
      Accept: 'application/rss+xml, application/atom+xml, text/xml;q=0.9, text/html;q=0.5, */*;q=0.3',
      ...headers,
    },
  });
}

async function checkFeed(feed) {
  try {
    const result = await fetchText(feed.url, {}, { source: feed });
    const entries = countEntries(feed, result.text);
    const ok = result.ok && entries > 0;
    return {
      feed,
      ok,
      status: result.status,
      entries,
      message: ok ? `${feed.name}: ${entries} entries` : `${feed.name}: HTTP ${result.status}, ${entries} entries`,
    };
  } catch (error) {
    return {
      feed,
      ok: false,
      status: 0,
      entries: 0,
      message: `${feed.name}: ${error.message}`,
    };
  }
}

export async function checkReferenceUrl(url, options = {}) {
  try {
    const result = await fetchText(url, { Accept: 'text/html, application/rss+xml, application/atom+xml, */*;q=0.5' }, { ...options, readBody: false });
    return { url, ok: result.ok, status: result.status };
  } catch (error) {
    return { url, ok: false, status: 0, message: error.message };
  }
}

async function main() {
  const feedResults = [];
  for (const feed of FEEDS) {
    feedResults.push(await checkFeed(feed));
  }

  for (const result of feedResults) {
    console.log(`${result.ok ? 'OK' : 'FAIL'} ${result.message}`);
  }

  const referenceResults = [];
  for (const url of OFFICIAL_SOURCE_URLS) {
    referenceResults.push(await checkReferenceUrl(url));
  }

  const badReferenceUrls = referenceResults.filter((result) => !result.ok);
  for (const result of badReferenceUrls) {
    console.warn(`WARN reference URL unavailable: ${result.url} (${result.message || `HTTP ${result.status}`})`);
  }

  const failedCritical = feedResults.filter((result) => result.feed.critical && !result.ok);
  const workingFeeds = feedResults.filter((result) => result.ok);

  // Quorum scales with the number of configured feeds (at most 2 may be down)
  // instead of a hardcoded count that silently loosens when feeds are added.
  const requiredWorkingFeeds = Math.max(2, feedResults.length - 2);

  if (failedCritical.length > 0 || workingFeeds.length < requiredWorkingFeeds) {
    console.error('AI News source health failed.');
    if (failedCritical.length > 0) {
      console.error(`Critical feeds failing: ${failedCritical.map((result) => result.feed.id).join(', ')}`);
    }
    console.error(`Working feeds: ${workingFeeds.length}/${feedResults.length}`);
    process.exit(1);
  }

  console.log(`AI News source health passed (${workingFeeds.length}/${feedResults.length} feeds working).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
