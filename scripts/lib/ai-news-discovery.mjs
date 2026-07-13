import dns from "node:dns/promises";
import { BlockList, isIP } from "node:net";

const ARTICLE_TEXT_LIMIT = 40_000;

// Hard budgets for untrusted feed input — see security review H-2/M-2
// (docs/verification/2026-07-13-security-review.md). Feeds are external input
// even when the publisher is "official": a compromised feed must not be able
// to point the pipeline at internal addresses or feed it unbounded data.
const FEED_BYTE_LIMIT = 2_000_000;
const ARTICLE_BYTE_LIMIT = 1_500_000;
const MAX_FEED_BLOCKS = 100;
const MAX_ARTICLE_FETCHES_PER_FEED = 12;
const MAX_REDIRECTS = 3;

// Loopback, private, link-local (incl. cloud metadata), CGNAT, multicast,
// and reserved ranges — never fetched, in any redirect hop.
const FORBIDDEN_RANGES = new BlockList();
FORBIDDEN_RANGES.addSubnet("0.0.0.0", 8, "ipv4");
FORBIDDEN_RANGES.addSubnet("10.0.0.0", 8, "ipv4");
FORBIDDEN_RANGES.addSubnet("100.64.0.0", 10, "ipv4");
FORBIDDEN_RANGES.addSubnet("127.0.0.0", 8, "ipv4");
FORBIDDEN_RANGES.addSubnet("169.254.0.0", 16, "ipv4");
FORBIDDEN_RANGES.addSubnet("172.16.0.0", 12, "ipv4");
FORBIDDEN_RANGES.addSubnet("192.0.0.0", 24, "ipv4");
FORBIDDEN_RANGES.addSubnet("192.168.0.0", 16, "ipv4");
FORBIDDEN_RANGES.addSubnet("198.18.0.0", 15, "ipv4");
FORBIDDEN_RANGES.addSubnet("224.0.0.0", 3, "ipv4");
FORBIDDEN_RANGES.addAddress("::", "ipv6");
FORBIDDEN_RANGES.addAddress("::1", "ipv6");
FORBIDDEN_RANGES.addSubnet("64:ff9b::", 96, "ipv6");
FORBIDDEN_RANGES.addSubnet("fc00::", 7, "ipv6");
FORBIDDEN_RANGES.addSubnet("fe80::", 10, "ipv6");
FORBIDDEN_RANGES.addSubnet("ff00::", 8, "ipv6");

function isForbiddenAddress(address) {
  let value = String(address).toLowerCase();
  if (value.startsWith("::ffff:") && value.includes(".")) value = value.slice(7);
  const family = isIP(value);
  if (family === 0) return true;
  return FORBIDDEN_RANGES.check(value, family === 6 ? "ipv6" : "ipv4");
}

function normalizeHost(hostname) {
  return String(hostname).toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
}

// Articles may only live on the feed's own host (or a subdomain of it), plus
// any hosts explicitly listed on the source as extraHosts.
function feedAllowedHosts(source) {
  const hosts = new Set();
  try {
    hosts.add(normalizeHost(new URL(source.url).hostname));
  } catch {
    // An unparseable feed URL yields an empty allowlist: nothing is fetched.
  }
  for (const host of source.extraHosts || []) hosts.add(normalizeHost(host));
  hosts.delete("");
  return hosts;
}

function hostAllowed(hostname, allowedHosts) {
  const bare = String(hostname).replace(/^\[|\]$/g, "");
  if (isIP(bare)) return false;
  const host = normalizeHost(bare);
  if (!host) return false;
  for (const base of allowedHosts) {
    if (host === base || host.endsWith(`.${base}`)) return true;
  }
  return false;
}

async function assertPublicHost(url, lookup) {
  const bare = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = await lookup(bare, { all: true });
  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw new Error(`no addresses resolved for ${bare}`);
  }
  for (const entry of addresses) {
    if (isForbiddenAddress(entry.address)) {
      throw new Error(`blocked address ${entry.address} for ${bare}`);
    }
  }
}

// Linear-time replacement helpers. The previous implementations used lazy
// regexes (e.g. /<item[\s\S]*?<\/item>/) which turn quadratic on input with
// many unclosed tags — a cheap DoS for anyone controlling a feed body.

function escapeXmlText(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function neutralizeCdata(xml) {
  const parts = [];
  let index = 0;
  while (index < xml.length) {
    const start = xml.indexOf("<![CDATA[", index);
    if (start === -1) {
      parts.push(xml.slice(index));
      break;
    }
    parts.push(xml.slice(index, start));
    const end = xml.indexOf("]]>", start + 9);
    if (end === -1) {
      parts.push(escapeXmlText(xml.slice(start + 9)));
      break;
    }
    parts.push(escapeXmlText(xml.slice(start + 9, end)));
    index = end + 3;
  }
  return parts.join("");
}

function unwrapCdata(value) {
  const parts = [];
  let index = 0;
  while (index < value.length) {
    const start = value.indexOf("<![CDATA[", index);
    if (start === -1) {
      parts.push(value.slice(index));
      break;
    }
    parts.push(value.slice(index, start));
    const end = value.indexOf("]]>", start + 9);
    if (end === -1) {
      parts.push(value.slice(start + 9));
      break;
    }
    parts.push(value.slice(start + 9, end));
    index = end + 3;
  }
  return parts.join("");
}

function decodeEntities(value = "") {
  return unwrapCdata(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// Removes <tagName ...>...</tagName> sections in a single pass. An unclosed
// section swallows the remainder of the input (its content is never text).
function stripSections(value, tagName) {
  const parts = [];
  const lower = value.toLowerCase();
  const open = `<${tagName}`;
  const close = `</${tagName}`;
  let index = 0;
  while (index < value.length) {
    const start = lower.indexOf(open, index);
    if (start === -1) {
      parts.push(value.slice(index));
      break;
    }
    const boundary = lower[start + open.length];
    if (boundary !== undefined && !/[\s>/]/.test(boundary)) {
      parts.push(value.slice(index, start + open.length));
      index = start + open.length;
      continue;
    }
    parts.push(value.slice(index, start), " ");
    const end = lower.indexOf(close, start + open.length);
    if (end === -1) break;
    const closeEnd = lower.indexOf(">", end);
    if (closeEnd === -1) break;
    index = closeEnd + 1;
  }
  return parts.join("");
}

export function stripHtml(value = "") {
  let text = decodeEntities(value);
  text = stripSections(text, "script");
  text = stripSections(text, "style");
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readTag(block, tagName) {
  const match = block.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? stripHtml(match[1]) : "";
}

function readLink(block) {
  const textLink = readTag(block, "link");
  if (textLink) return textLink;
  const linkTags = [...block.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0]);
  const preferred = linkTags.find((tag) => /rel=["']alternate["']/i.test(tag))
    || linkTags.find((tag) => !/\brel=/i.test(tag))
    || linkTags[0];
  return decodeEntities(preferred?.match(/href=["']([^"']+)["']/i)?.[1] || "");
}

export function canonicalizeUrl(value) {
  try {
    const url = new URL(String(value).trim());
    // HTTPS only: every official source publishes over HTTPS, and downstream
    // fetching must never be downgradable to plaintext by feed content.
    if (url.protocol !== "https:") return "";
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_.+|fbclid|gclid|mc_cid|mc_eid)$/i.test(key)) url.searchParams.delete(key);
    }
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString().replace(/\/$/, url.search ? "" : "");
  } catch {
    return "";
  }
}

// Extracts up to MAX_FEED_BLOCKS <item>/<entry> blocks with a linear scan.
function extractFeedBlocks(xml) {
  const blocks = [];
  const lower = xml.toLowerCase();
  for (const tagName of ["item", "entry"]) {
    const open = `<${tagName}`;
    const close = `</${tagName}`;
    let index = 0;
    while (blocks.length < MAX_FEED_BLOCKS) {
      const start = lower.indexOf(open, index);
      if (start === -1) break;
      const boundary = lower[start + open.length];
      if (boundary !== undefined && !/[\s>/]/.test(boundary)) {
        index = start + open.length;
        continue;
      }
      const end = lower.indexOf(close, start + open.length);
      if (end === -1) break;
      const closeEnd = lower.indexOf(">", end);
      if (closeEnd === -1) break;
      blocks.push(xml.slice(start, closeEnd + 1));
      index = closeEnd + 1;
    }
    if (blocks.length > 0) break;
  }
  return blocks;
}

export function parseFeed(xml, source) {
  const allowedHosts = feedAllowedHosts(source);
  return extractFeedBlocks(neutralizeCdata(xml)).map((block) => {
    const publishedRaw = readTag(block, "pubDate") || readTag(block, "published") || readTag(block, "updated");
    const published = new Date(publishedRaw);
    const url = readLink(block);
    return {
      source,
      sourceId: source.id,
      sourceName: source.name,
      primary: Boolean(source.primary ?? source.critical),
      title: readTag(block, "title"),
      url,
      canonicalUrl: canonicalizeUrl(url),
      summary: readTag(block, "description") || readTag(block, "summary") || readTag(block, "content"),
      published,
      publishedRaw,
      bodyText: "",
    };
  }).filter((item) => {
    if (!item.title || !item.canonicalUrl || Number.isNaN(item.published.getTime())) return false;
    // Off-domain items are dropped outright: they would otherwise be published
    // as source links and become deep-read targets (SSRF).
    try {
      return hostAllowed(new URL(item.canonicalUrl).hostname, allowedHosts);
    } catch {
      return false;
    }
  });
}

// Parses an HTML news listing (used for publishers without RSS, e.g.
// www.anthropic.com/news): anchors to article slugs with an inline <time>
// and a heading. Undated anchors are skipped — they cannot be date-windowed.
// Anchor segments are located with a linear scan; only relative /news/ hrefs
// are accepted, so every item stays on the listing's own host.
export function parseHtmlListing(html, source) {
  const base = new URL(source.url);
  const seen = new Set();
  const items = [];
  const text = String(html);
  const lower = text.toLowerCase();
  let index = 0;

  while (items.length < MAX_FEED_BLOCKS) {
    const start = lower.indexOf("<a", index);
    if (start === -1) break;
    const boundary = lower[start + 2];
    if (boundary !== undefined && !/[\s>/]/.test(boundary)) {
      index = start + 2;
      continue;
    }
    const end = lower.indexOf("</a", start);
    if (end === -1) break;
    const segment = text.slice(start, end);
    index = end + 3;

    const href = segment.match(/^<a\b[^>]*href="(\/news\/[a-z0-9][a-z0-9-]*)"/i)?.[1];
    if (!href) continue;
    const title = stripHtml(segment.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i)?.[1] || "");
    const publishedRaw = stripHtml(segment.match(/<time[^>]*>([\s\S]*?)<\/time>/i)?.[1] || "");
    const published = new Date(publishedRaw);
    const url = new URL(href, base).toString();
    const canonicalUrl = canonicalizeUrl(url);
    if (!title || !canonicalUrl || Number.isNaN(published.getTime()) || seen.has(canonicalUrl)) continue;
    seen.add(canonicalUrl);
    items.push({
      source,
      sourceId: source.id,
      sourceName: source.name,
      primary: Boolean(source.primary ?? source.critical),
      title,
      url,
      canonicalUrl,
      summary: "",
      published,
      publishedRaw,
      bodyText: "",
    });
  }
  return items;
}

async function readBodyCapped(response, maxBytes) {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new Error(`response exceeds ${maxBytes} bytes`);
  }
  if (!response.body) {
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > maxBytes) throw new Error(`response exceeds ${maxBytes} bytes`);
    return text;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new Error(`response exceeds ${maxBytes} bytes`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

// Guarded fetch: HTTPS-only, allowlisted hosts, no IP literals, no private or
// metadata destinations (DNS-checked), redirects validated hop by hop, and a
// hard byte cap on the body.
async function fetchText(fetchImpl, url, { headers, allowedHosts, lookup, maxBytes }) {
  let current = new URL(url);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (current.protocol !== "https:") throw new Error(`blocked non-HTTPS URL ${current}`);
    if (!hostAllowed(current.hostname, allowedHosts)) throw new Error(`blocked host ${current.hostname}`);
    await assertPublicHost(current, lookup);
    const response = await fetchImpl(current.toString(), {
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error(`redirect without Location from ${current.hostname}`);
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`.trim());
    return readBodyCapped(response, maxBytes);
  }
  throw new Error(`too many redirects for ${url}`);
}

export async function fetchCandidates(feeds, fetchImpl = fetch, options = {}) {
  const lookup = options.lookup || ((host, opts) => dns.lookup(host, opts));
  const candidates = [];
  for (const feed of feeds) {
    const allowedHosts = feedAllowedHosts(feed);
    let parsed;
    try {
      const body = await fetchText(fetchImpl, feed.url, {
        headers: {
          "User-Agent": "SmartBolig AI News Bot (+https://smartbolig.net/da/ai/nyheder/)",
          Accept: feed.kind === "html-listing"
            ? "text/html, application/xhtml+xml;q=0.9, */*;q=0.5"
            : "application/rss+xml, application/atom+xml, text/xml;q=0.9, */*;q=0.5",
        },
        allowedHosts,
        lookup,
        maxBytes: FEED_BYTE_LIMIT,
      });
      parsed = feed.kind === "html-listing" ? parseHtmlListing(body, feed) : parseFeed(body, feed);
      if (feed.kind === "html-listing" && parsed.length === 0) {
        throw new Error("HTML listing yielded no dated articles (markup may have changed)");
      }
    } catch (error) {
      options.onFeedError?.(feed, error);
      continue;
    }

    let articleFetches = 0;
    for (const candidate of parsed) {
      if (options.shouldFetchArticle && !options.shouldFetchArticle(candidate)) {
        candidates.push(candidate);
        continue;
      }
      if (articleFetches >= MAX_ARTICLE_FETCHES_PER_FEED) {
        candidates.push(candidate);
        continue;
      }
      articleFetches += 1;
      try {
        const html = await fetchText(fetchImpl, candidate.canonicalUrl, {
          headers: {
            "User-Agent": "SmartBolig AI News Bot (+https://smartbolig.net/da/ai/nyheder/)",
            Accept: "text/html, application/xhtml+xml;q=0.9, text/plain;q=0.8",
          },
          allowedHosts,
          lookup,
          maxBytes: ARTICLE_BYTE_LIMIT,
        });
        candidate.bodyText = stripHtml(html).slice(0, ARTICLE_TEXT_LIMIT);
      } catch (error) {
        options.onArticleError?.(candidate, error);
      }
      candidates.push(candidate);
    }
  }
  return candidates;
}
