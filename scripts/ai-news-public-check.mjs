#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchPublicText } from './lib/ai-news-discovery.mjs';

const SOURCE_URL = 'https://openai.com/news/rss.xml';
const SITE_URL = 'https://smartbolig.net/da/ai/nyheder/';

async function checkUrl(url, options = {}) {
  const result = await fetchPublicText(url, {
    fetchImpl: options.fetchImpl,
    lookup: options.lookup,
    readBody: options.readBody,
    source: { url },
    maxBytes: 2_000_000,
    timeoutMs: options.timeoutMs || 20_000,
  });
  if (result.status !== 200) throw new Error(`Public check returned HTTP ${result.status} from ${url}`);
  return result;
}

export async function checkPreflightNetwork(options = {}) {
  const source = await checkUrl(SOURCE_URL, { ...options, readBody: false });
  const publicPage = await checkUrl(SITE_URL, { ...options, readBody: false });
  return { sourceStatus: source.status, publicStatus: publicPage.status };
}

export async function checkPublicIssue(date, fingerprint, options = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^[a-f0-9]{64}$/.test(fingerprint)) {
    throw new Error('Invalid issue date or fingerprint');
  }
  const targets = [
    [`https://smartbolig.net/da/ai/nyheder/${date}/`, `data-issue-fingerprint="${fingerprint}"`],
    [`https://smartbolig.net/en/ai/nyheder/${date}/`, `data-issue-fingerprint="${fingerprint}"`],
    [SITE_URL, `/da/ai/nyheder/${date}`],
    ['https://smartbolig.net/en/ai/nyheder/', `/en/ai/nyheder/${date}`],
  ];
  for (const [url, marker] of targets) {
    const result = await checkUrl(url, options);
    if (!result.text.includes(marker)) throw new Error(`Public issue marker is missing at ${url}`);
  }
  return { articleStatus: 200, indexStatus: 200 };
}

async function main() {
  const [mode, date, fingerprint] = process.argv.slice(2);
  if (mode === 'preflight' && !date && !fingerprint) {
    console.log(JSON.stringify(await checkPreflightNetwork()));
  } else if (mode === 'issue' && date && fingerprint) {
    await checkPublicIssue(date, fingerprint);
    console.log('PUBLIC_ISSUE_OK');
  } else {
    throw new Error('Usage: ai-news-public-check.mjs preflight | issue YYYY-MM-DD FINGERPRINT');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
