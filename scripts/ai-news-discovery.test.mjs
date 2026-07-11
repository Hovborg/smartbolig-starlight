import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalizeUrl,
  fetchCandidates,
  parseFeed,
} from "./lib/ai-news-discovery.mjs";

const source = {
  id: "official-ai",
  name: "Official AI",
  url: "https://example.com/feed.xml",
  priority: 10,
  critical: true,
};

test("canonicalizeUrl removes tracking parameters and fragments", () => {
  assert.equal(
    canonicalizeUrl("https://Example.com/news/?utm_source=rss&id=42#details"),
    "https://example.com/news?id=42",
  );
  assert.equal(canonicalizeUrl("javascript:alert(1)"), "");
});

test("parseFeed prefers the Atom alternate link and preserves CDATA text", () => {
  const xml = `<?xml version="1.0"?><feed><entry>
    <title><![CDATA[New <AI> model]]></title>
    <link rel="self" href="https://example.com/feed.xml" />
    <link rel="alternate" href="https://example.com/story?utm_medium=rss" />
    <updated>2026-07-11T08:00:00Z</updated>
    <summary><![CDATA[Evidence with a literal </item> marker.]]></summary>
  </entry></feed>`;

  const [candidate] = parseFeed(xml, source);
  assert.equal(candidate.title, "New model");
  assert.equal(candidate.url, "https://example.com/story?utm_medium=rss");
  assert.equal(candidate.canonicalUrl, "https://example.com/story");
  assert.equal(candidate.summary, "Evidence with a literal marker.");
  assert.equal(candidate.primary, true);
});

test("fetchCandidates tolerates a failed non-critical feed and fetches capped article text", async () => {
  const feeds = [
    source,
    { ...source, id: "optional", name: "Optional", url: "https://optional.test/feed", critical: false },
  ];
  const feedXml = `<rss><channel><item><title>Strong update</title><link>https://example.com/story</link><pubDate>Sat, 11 Jul 2026 08:00:00 GMT</pubDate><description>Summary</description></item></channel></rss>`;
  const failures = [];
  const fetchImpl = async (url) => {
    if (url === "https://optional.test/feed") return new Response("down", { status: 503 });
    if (url === source.url) return new Response(feedXml, { status: 200 });
    if (url === "https://example.com/story") {
      return new Response(`<html><body><main><h1>Strong update</h1><p>${"evidence ".repeat(6000)}</p></main></body></html>`, { status: 200 });
    }
    throw new Error(`unexpected URL ${url}`);
  };

  const candidates = await fetchCandidates(feeds, fetchImpl, {
    onFeedError: (feed) => failures.push(feed.id),
  });

  assert.deepEqual(failures, ["optional"]);
  assert.equal(candidates.length, 1);
  assert.match(candidates[0].bodyText, /^Strong update evidence/);
  assert.ok(candidates[0].bodyText.length <= 40_000);
});

test("fetchCandidates deep-reads only candidates accepted by the prefilter", async () => {
  const feedXml = `<rss><channel><item><title>Old update</title><link>https://example.com/old</link><pubDate>Sat, 4 Jul 2026 08:00:00 GMT</pubDate><description>Summary</description></item></channel></rss>`;
  const requested = [];
  const candidates = await fetchCandidates([source], async (url) => {
    requested.push(url);
    if (url === source.url) return new Response(feedXml, { status: 200 });
    throw new Error("article should not be fetched");
  }, {
    shouldFetchArticle: () => false,
  });

  assert.deepEqual(requested, [source.url]);
  assert.equal(candidates[0].bodyText, "");
});
