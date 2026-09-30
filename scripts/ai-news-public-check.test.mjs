import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { checkPreflightNetwork, checkPublicIssue } from './ai-news-public-check.mjs';

const lookup = async () => [{ address: '93.184.216.34', family: 4 }];
const date = '2026-09-30';
const fingerprint = 'a'.repeat(64);

test('the runner routes preflight and public readback through the guarded Node helper', async () => {
  const runner = await readFile(new URL('./smartbolig-ai-news-daily.ps1', import.meta.url), 'utf8');
  assert.doesNotMatch(runner, /Invoke-WebRequest/);
  assert.match(runner, /ai-news-public-check\.mjs'\) preflight/);
  assert.match(runner, /ai-news-public-check\.mjs'\) issue \$IssueDate \$IssueFingerprint/);
});

test('preflight accepts the fixed public endpoints and rejects an off-host redirect before a second fetch', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push(url);
    assert.equal(options.redirect, 'manual');
    if (url === 'https://openai.com/news/rss.xml') return new Response(null, { status: 200 });
    if (url === 'https://smartbolig.net/da/ai/nyheder/') return new Response(null, { status: 200 });
    throw new Error(`unexpected request: ${url}`);
  };
  assert.deepEqual(await checkPreflightNetwork({ lookup, fetchImpl }), { sourceStatus: 200, publicStatus: 200 });
  assert.deepEqual(calls, ['https://openai.com/news/rss.xml', 'https://smartbolig.net/da/ai/nyheder/']);

  await assert.rejects(checkPreflightNetwork({ lookup, fetchImpl: async () => new Response(null, { status: 206 }) }), /HTTP 206/);

  calls.length = 0;
  await assert.rejects(checkPreflightNetwork({ lookup, fetchImpl: async (url) => {
    calls.push(url);
    return Response.redirect('https://169.254.169.254/latest/meta-data/', 302);
  } }), /blocked/i);
  assert.deepEqual(calls, ['https://openai.com/news/rss.xml']);
});

test('public issue readback checks both languages, both indexes and the exact fingerprint', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    return new Response(url.endsWith(`/${date}/`)
      ? `<p data-issue-fingerprint="${fingerprint}">Published</p>`
      : `<a href="/${url.includes('/en/') ? 'en' : 'da'}/ai/nyheder/${date}/">Issue</a>`);
  };
  await checkPublicIssue(date, fingerprint, { lookup, fetchImpl });
  assert.equal(calls.length, 4);
  await assert.rejects(checkPublicIssue(date, fingerprint, {
    lookup, fetchImpl: async () => new Response(`<p data-issue-fingerprint="${fingerprint}">Partial</p>`, { status: 206 }),
  }), /HTTP 206/);
  await assert.rejects(checkPublicIssue(date, 'b'.repeat(64), { lookup, fetchImpl }), /marker is missing/);
  await assert.rejects(checkPublicIssue('../bad', fingerprint, { lookup, fetchImpl }), /Invalid issue/);
});

test('public issue readback also blocks redirects to private destinations', async () => {
  const calls = [];
  await assert.rejects(checkPublicIssue(date, fingerprint, {
    lookup,
    fetchImpl: async (url) => {
      calls.push(url);
      return Response.redirect('https://127.0.0.1/private', 302);
    },
  }), /blocked/i);
  assert.deepEqual(calls, [`https://smartbolig.net/da/ai/nyheder/${date}/`]);
});
