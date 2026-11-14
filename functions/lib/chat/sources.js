// SmartBolig source handling: canonical URLs, titles and search result normalization.

import { MAX_SEARCH_CHUNK_CHARS, MAX_SEARCH_RESULTS } from "./limits.js";

const SMARTBOLIG_HOSTS = new Set(["smartbolig.net", "www.smartbolig.net"]);

function canonicalSmartboligUrl(rawKey) {
  if (typeof rawKey !== "string" || !rawKey.trim()) return null;

  let url;
  try {
    url = new URL(rawKey.trim(), "https://smartbolig.net");
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || !SMARTBOLIG_HOSTS.has(url.hostname.toLowerCase())) {
    return null;
  }

  url.hostname = "smartbolig.net";
  url.port = "";
  url.username = "";
  url.password = "";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function titleFromUrl(url) {
  const pathname = new URL(url).pathname;
  const segment = pathname.split("/").filter(Boolean).at(-1) || "SmartBolig";
  let title;
  try {
    title = decodeURIComponent(segment);
  } catch {
    title = segment;
  }
  title = title.replace(/\.(?:md|mdx|html?)$/i, "").replace(/[-_]+/g, " ").trim();
  if (!title) return "SmartBolig";
  return `${title.charAt(0).toUpperCase()}${title.slice(1)}`.slice(0, 100);
}

function safeTitle(metadata, url) {
  const title = metadata?.title;
  if (typeof title === "string" && title.trim()) {
    return title.trim().replace(/\s+/g, " ").slice(0, 100);
  }
  return titleFromUrl(url);
}

/**
 * Results from the site's own index ([{ url, title, heading, text, score }]) as
 * model context and source links. Only smartbolig.net addresses pass, the text
 * is cut to a fixed size, and a page is listed once as a source.
 */
export function normalizeSearchResults(found) {
  if (!Array.isArray(found)) return { results: [], sources: [] };

  const results = [];
  const sourceMap = new Map();

  for (const item of found.slice(0, MAX_SEARCH_RESULTS)) {
    const url = canonicalSmartboligUrl(item?.url);
    const body = typeof item?.text === "string" ? item.text.trim() : "";
    if (!url || !body) continue;

    const heading = typeof item.heading === "string" ? item.heading.trim().replace(/\s+/g, " ").slice(0, 160) : "";
    const title = safeTitle(item, url);
    results.push({
      text: (heading ? `${heading}
${body}` : body).slice(0, MAX_SEARCH_CHUNK_CHARS),
      score: Number.isFinite(item.score) ? item.score : null,
      sourceTitle: title,
      sourceUrl: url,
    });
    if (!sourceMap.has(url)) sourceMap.set(url, { title, url });
  }

  return { results, sources: [...sourceMap.values()] };
}
