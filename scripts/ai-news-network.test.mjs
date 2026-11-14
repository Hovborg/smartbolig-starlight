import assert from 'node:assert/strict';
import test from 'node:test';
import { checkReferenceUrl, fetchText as fetchHealthText } from './ai-news-source-health.mjs';
import { changedIssueDates } from './ai-news-quality-changed.mjs';
import { fetchPublicText } from './lib/ai-news-discovery.mjs';
import { pinnedHttpsRequest } from './lib/public-https.mjs';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { gzipSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';

const lookup = async () => [{ address: '93.184.216.34', family: 4 }];
const officialUrl = 'https://openai.com/index/example';

test('the real publisher does not replace the pinned production transport with global fetch', async () => {
  const source = await readFile(new URL('./ai-news-publish.mjs', import.meta.url), 'utf8');
  assert.equal(/fetchCandidates\(FEEDS,\s*(?:globalThis\.)?fetch\s*[,)]/.test(source), false, 'production discovery must use the default pinned transport');
});

const consume = (options) => fetchHealthText(officialUrl, {}, options);

test('source health blocks off-domain redirects before reading internal data', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push(url);
    // Model native fetch following a redirect unless explicitly disabled.
    if (options.redirect !== 'manual') return new Response('PRIVATE_MARKER');
    return Response.redirect('https://169.254.169.254/latest/meta-data/', 302);
  };
  await assert.rejects(consume({ fetchImpl, lookup }), /blocked/i);
  assert.deepEqual(calls, [officialUrl]);
});

test('source health rejects private DNS answers without fetching', async () => {
  let requests = 0;
  const options = {
    lookup: async () => [{ address: '10.0.0.5', family: 4 }],
    fetchImpl: async () => { requests++; return new Response('PRIVATE_MARKER'); },
  };
  await assert.rejects(consume(options), /blocked address/);
  assert.equal(requests, 0);
});

test('source health rejects oversized streamed bodies', async () => {
  const options = { lookup, fetchImpl: async () => new Response('x'.repeat(2_100_000)) };
  await assert.rejects(consume(options), /bytes/);
});

test('source health still reads normal public content', async () => {
  const result = await consume({ lookup, fetchImpl: async () => new Response('<p>Public evidence</p>') });
  assert.equal(result.text, '<p>Public evidence</p>');
});
test('changed-issue quality covers English-only edits and deduplicates pairs', () => {
  assert.deepEqual(changedIssueDates([
    'src/content/docs/en/ai/nyheder/2026-09-03.mdx',
    'src/content/docs/da/ai/nyheder/2026-09-02.mdx',
    'src/content/docs/en/ai/nyheder/2026-09-02.mdx',
    'src/content/docs/en/ai/nyheder/index.mdx',
    'README.md',
  ]), ['2026-09-02', '2026-09-03']);
});

test('native HTTPS transport pins vetted DNS records while retaining TLS hostname', async () => {
  const addresses = await lookup();
  const response = await pinnedHttpsRequest(officialUrl, { addresses }, (url, options, callback) => {
    assert.equal(url.hostname, 'openai.com');
    assert.equal(options.servername, 'openai.com');
    assert.equal(options.agent, false);
    options.lookup(url.hostname, { all: true }, (error, records) => {
      assert.equal(error, null);
      assert.deepEqual(records, addresses);
    });
    options.lookup(url.hostname, {}, (error, address, family) => {
      assert.equal(error, null);
      assert.equal(address, '93.184.216.34');
      assert.equal(family, 4);
    });
    const request = new EventEmitter();
    request.end = () => callback(Object.assign(Readable.from([Buffer.from('Pinned public response')]), {
      statusCode: 200, statusMessage: 'OK', headers: {},
    }));
    return request;
  });
  assert.equal(await response.text(), 'Pinned public response');
});

test('the body ceiling applies after decompression and cancels the response', async () => {
  const compressed = gzipSync('x'.repeat(1000));
  const fetchImpl = (url, options) => pinnedHttpsRequest(url, options, (_url, _options, callback) => {
    const request = new EventEmitter();
    request.end = () => callback(Object.assign(Readable.from([compressed]), {
      statusCode: 200, statusMessage: 'OK', headers: { 'content-encoding': 'gzip', 'content-length': String(compressed.length) },
    }));
    return request;
  });
  await assert.rejects(fetchPublicText(officialUrl, { fetchImpl, lookup, maxBytes: 100 }), /exceeds 100 bytes/);
});

test('an inherited Content-Encoding name is rejected without throwing from the response callback', async () => {
  const requestImpl = (_url, _options, callback) => {
    const request = new EventEmitter();
    request.end = () => setImmediate(() => callback(Object.assign(Readable.from(['body']), {
      statusCode: 200, statusMessage: 'OK', headers: { 'content-encoding': '__proto__' },
    })));
    return request;
  };
  await assert.rejects(
    pinnedHttpsRequest(officialUrl, { addresses: await lookup() }, requestImpl),
    /Unsupported response encoding/,
  );
});

test('malformed response headers reject inside the asynchronous callback', async () => {
  const requestImpl = (_url, _options, callback) => {
    const request = new EventEmitter();
    request.end = () => setImmediate(() => callback(Object.assign(Readable.from(['body']), {
      statusCode: 200, statusMessage: 'OK', headers: { 'x-invalid': 'line\nbreak' },
    })));
    return request;
  };
  await assert.rejects(pinnedHttpsRequest(officialUrl, { addresses: await lookup() }, requestImpl));
});

test('DNS lookup is included in the overall request deadline', async () => {
  // AbortSignal.timeout is unrefed; keep the test event loop alive until it fires.
  const keepAlive = setInterval(() => {}, 1000);
  try {
    await assert.rejects(fetchPublicText(officialUrl, {
      lookup: () => new Promise(() => {}), timeoutMs: 20,
      fetchImpl: () => { throw new Error('must not fetch'); },
    }), { name: 'TimeoutError' });
  } finally { clearInterval(keepAlive); }
});

test('reference health preserves HTTP status reporting for unavailable public pages', async () => {
  const result = await fetchHealthText(officialUrl, {}, { lookup, fetchImpl: async () => new Response('Missing', { status: 404 }) });
  assert.equal(result.status, 404);
  assert.equal(result.ok, false);
});

test('reference health cancels unused bodies instead of downloading large documentation', async () => {
  let cancelled = false;
  const result = await fetchHealthText(officialUrl, {}, {
    lookup, readBody: false,
    fetchImpl: async () => new Response(new ReadableStream({ cancel() { cancelled = true; } }), {
      headers: { 'content-length': '999999999' },
    }),
  });
  assert.equal(result.status, 200);
  assert.equal(result.text, '');
  assert.equal(cancelled, true);
});

test('reference health reports deleted, denied and failing references as unavailable', async () => {
  for (const status of [200, 403, 404, 410, 429, 500]) {
    const result = await checkReferenceUrl(officialUrl, {
      lookup, fetchImpl: async () => new Response('Status only', { status }),
    });
    assert.equal(result.ok, status === 200, `HTTP ${status}`);
    assert.equal(result.status, status);
  }
});
