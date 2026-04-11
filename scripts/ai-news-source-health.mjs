#!/usr/bin/env node
import { FEEDS, OFFICIAL_SOURCE_URLS } from './ai-news-sources.mjs';

const timeoutMs = Number(process.env.AI_NEWS_SOURCE_TIMEOUT_MS || 20000);

function withTimeout() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    done: () => clearTimeout(timer),
  };
}

function countEntries(xml) {
  return (xml.match(/<item\b|<entry\b/gi) || []).length;
}

async function fetchText(url, headers = {}) {
  const timeout = withTimeout();
  try {
    const response = await fetch(url, {
      signal: timeout.signal,
      headers: {
        'User-Agent': 'SmartBolig AI News Source Health (+https://smartbolig.net/da/ai/nyheder/)',
        Accept: 'application/rss+xml, application/atom+xml, text/xml;q=0.9, text/html;q=0.5, */*;q=0.3',
        ...headers,
      },
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, text };
  } finally {
    timeout.done();
  }
}

async function checkFeed(feed) {
  try {
    const result = await fetchText(feed.url);
    const entries = countEntries(result.text);
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

async function checkReferenceUrl(url) {
  try {
    const result = await fetchText(url, { Accept: 'text/html, application/rss+xml, application/atom+xml, */*;q=0.5' });
    return { url, ok: result.status >= 200 && result.status < 500, status: result.status };
  } catch (error) {
    return { url, ok: false, status: 0, message: error.message };
  }
}

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

if (failedCritical.length > 0 || workingFeeds.length < 4) {
  console.error('AI News source health failed.');
  if (failedCritical.length > 0) {
    console.error(`Critical feeds failing: ${failedCritical.map((result) => result.feed.id).join(', ')}`);
  }
  console.error(`Working feeds: ${workingFeeds.length}/${feedResults.length}`);
  process.exit(1);
}

console.log(`AI News source health passed (${workingFeeds.length}/${feedResults.length} feeds working).`);
