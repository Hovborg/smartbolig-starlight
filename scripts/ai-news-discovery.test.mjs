import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalizeUrl,
  fetchCandidates,
  parseFeed,
  parseHtmlListing,
} from "./lib/ai-news-discovery.mjs";

test("parseHtmlListing extracts dated Anthropic-style articles and skips undated ones", () => {
  const listingSource = { id: "anthropic-news", name: "Anthropic News", url: "https://www.anthropic.com/news", kind: "html-listing", primary: true };
  const html = `
    <a href="/news/hard-questions" class="featured"><h2 class="headline">Inviting hard questions</h2></a>
    <a href="/news/claude-sonnet-5" class="grid"><div class="meta"><span class="caption">Product</span><time class="date">Jun 30, 2026</time></div><h3>Introducing Claude Sonnet 5</h3></a>
    <a href="/news/claude-sonnet-5" class="dupe"><time>Jun 30, 2026</time><h3>Introducing Claude Sonnet 5</h3></a>
    <a href="/news/redeploying-fable-5" class="grid"><time>Jun 30, 2026</time><h3>Redeploying Fable 5</h3></a>
  `;
  const items = parseHtmlListing(html, listingSource);

  assert.equal(items.length, 2);
  assert.equal(items[0].title, "Introducing Claude Sonnet 5");
  assert.equal(items[0].canonicalUrl, "https://www.anthropic.com/news/claude-sonnet-5");
  assert.equal(items[0].sourceId, "anthropic-news");
  assert.equal(items[0].primary, true);
  assert.equal(Number.isNaN(items[0].published.getTime()), false);
  assert.equal(items[1].title, "Redeploying Fable 5");
});

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

test("canonicalizeUrl rejects plain-HTTP urls", () => {
  assert.equal(canonicalizeUrl("http://example.com/story"), "");
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

// Deterministic stand-in for DNS: every hostname resolves to a public address.
const publicLookup = async () => [{ address: "93.184.216.34", family: 4 }];

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
    lookup: publicLookup,
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
    lookup: publicLookup,
  });

  assert.deepEqual(requested, [source.url]);
  assert.equal(candidates[0].bodyText, "");
});

// Regressions for security review H-2/M-2
// (docs/verification/2026-07-13-security-review.md): the discovery layer must
// never fetch private/metadata addresses, follow unvalidated redirects, keep
// off-domain feed items, or read unbounded response bodies.

test("parseFeed drops items that link outside the feed's own domain", () => {
  const xml = `<rss><channel>
    <item><title>Legit</title><link>https://example.com/story</link><pubDate>Sat, 11 Jul 2026 08:00:00 GMT</pubDate></item>
    <item><title>Lookalike</title><link>https://example.com.attacker.example/story</link><pubDate>Sat, 11 Jul 2026 08:00:00 GMT</pubDate></item>
    <item><title>Metadata</title><link>https://169.254.169.254/latest/meta-data/</link><pubDate>Sat, 11 Jul 2026 08:00:00 GMT</pubDate></item>
  </channel></rss>`;
  const items = parseFeed(xml, source);
  assert.deepEqual(items.map((item) => item.title), ["Legit"]);
});

test("parseFeed allows subdomains of the feed host and ignores a www prefix", () => {
  const xml = `<rss><channel>
    <item><title>Subdomain</title><link>https://help.example.com/story</link><pubDate>Sat, 11 Jul 2026 08:00:00 GMT</pubDate></item>
    <item><title>Apex</title><link>https://example.com/story2</link><pubDate>Sat, 11 Jul 2026 08:00:00 GMT</pubDate></item>
  </channel></rss>`;
  const items = parseFeed(xml, { ...source, url: "https://www.example.com/feed.xml" });
  assert.deepEqual(items.map((item) => item.title), ["Subdomain", "Apex"]);
});

test("parseFeed ignores unclosed blocks and stays linear on hostile input", () => {
  assert.deepEqual(parseFeed("<rss><item><title>never closed</title>", source), []);
  const hostile = "<rss>" + "<item>".repeat(100_000);
  const startedAt = process.hrtime.bigint();
  assert.deepEqual(parseFeed(hostile, source), []);
  const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
  assert.ok(elapsedMs < 5_000, `parseFeed took ${elapsedMs}ms on unclosed tags`);
});

test("fetchCandidates blocks feeds whose host resolves to a private address", async () => {
  const requested = [];
  const failures = [];
  const candidates = await fetchCandidates([source], async (url) => {
    requested.push(url);
    return new Response("<rss></rss>", { status: 200 });
  }, {
    onFeedError: (feed, error) => failures.push(String(error.message)),
    lookup: async () => [{ address: "10.0.0.5", family: 4 }],
  });

  assert.deepEqual(requested, []);
  assert.deepEqual(candidates, []);
  assert.equal(failures.length, 1);
});

test("fetchCandidates refuses redirects to private or metadata addresses", async () => {
  const feedXml = `<rss><channel><item><title>Story</title><link>https://example.com/story</link><pubDate>Sat, 11 Jul 2026 08:00:00 GMT</pubDate><description>Summary</description></item></channel></rss>`;
  const requested = [];
  const articleErrors = [];
  const candidates = await fetchCandidates([source], async (url) => {
    requested.push(url);
    if (url === source.url) return new Response(feedXml, { status: 200 });
    if (url === "https://example.com/story") return Response.redirect("https://169.254.169.254/latest/meta-data/", 302);
    throw new Error(`unexpected URL ${url}`);
  }, {
    onArticleError: (candidate, error) => articleErrors.push(String(error.message)),
    lookup: publicLookup,
  });

  assert.ok(!requested.includes("https://169.254.169.254/latest/meta-data/"));
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].bodyText, "");
  assert.equal(articleErrors.length, 1);
  // The guard itself must reject the redirect target — not just report the
  // 3xx status as an HTTP error while native fetch would have followed it.
  assert.match(articleErrors[0], /169\.254\.169\.254|blocked/i);
});

test("fetchCandidates rejects oversized feed bodies", async () => {
  const failures = [];
  const candidates = await fetchCandidates([source], async () =>
    new Response("x".repeat(3_500_000), { status: 200 }), {
    onFeedError: (feed, error) => failures.push(String(error.message)),
    lookup: publicLookup,
  });

  assert.deepEqual(candidates, []);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /bytes/i);
});

test("fetchCandidates caps deep-reads per feed but keeps every candidate", async () => {
  const itemsXml = Array.from({ length: 20 }, (_, index) =>
    `<item><title>Story ${index}</title><link>https://example.com/story-${index}</link><pubDate>Sat, 11 Jul 2026 08:00:00 GMT</pubDate></item>`).join("");
  const articleRequests = [];
  const candidates = await fetchCandidates([source], async (url) => {
    if (url === source.url) return new Response(`<rss><channel>${itemsXml}</channel></rss>`, { status: 200 });
    articleRequests.push(url);
    return new Response("<html><body>article text</body></html>", { status: 200 });
  }, { lookup: publicLookup });

  assert.equal(candidates.length, 20);
  assert.equal(articleRequests.length, 12);
});
