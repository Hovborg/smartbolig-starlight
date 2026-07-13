const ARTICLE_TEXT_LIMIT = 40_000;

function decodeEntities(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value = "") {
  return decodeEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
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

function neutralizeCdata(xml) {
  return xml.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, inner) =>
    inner.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
}

export function canonicalizeUrl(value) {
  try {
    const url = new URL(String(value).trim());
    if (!/^https?:$/.test(url.protocol)) return "";
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

export function parseFeed(xml, source) {
  const blocks = neutralizeCdata(xml).match(/<item\b[\s\S]*?<\/item>|<entry\b[\s\S]*?<\/entry>/gi) || [];
  return blocks.map((block) => {
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
  }).filter((item) => item.title && item.canonicalUrl && !Number.isNaN(item.published.getTime()));
}

async function fetchText(fetchImpl, url, headers) {
  const response = await fetchImpl(url, {
    headers,
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`.trim());
  return response.text();
}

export async function fetchCandidates(feeds, fetchImpl = fetch, options = {}) {
  const candidates = [];
  for (const feed of feeds) {
    let parsed;
    try {
      const xml = await fetchText(fetchImpl, feed.url, {
        "User-Agent": "SmartBolig AI News Bot (+https://smartbolig.net/da/ai/nyheder/)",
        Accept: "application/rss+xml, application/atom+xml, text/xml;q=0.9, */*;q=0.5",
      });
      parsed = parseFeed(xml, feed);
    } catch (error) {
      options.onFeedError?.(feed, error);
      continue;
    }

    for (const candidate of parsed) {
      if (options.shouldFetchArticle && !options.shouldFetchArticle(candidate)) {
        candidates.push(candidate);
        continue;
      }
      try {
        const html = await fetchText(fetchImpl, candidate.canonicalUrl, {
          "User-Agent": "SmartBolig AI News Bot (+https://smartbolig.net/da/ai/nyheder/)",
          Accept: "text/html, application/xhtml+xml;q=0.9, text/plain;q=0.8",
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
