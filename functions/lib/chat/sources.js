// SmartBolig source handling: canonical URLs, titles and search chunk normalization.

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

export function normalizeSearchChunks(chunks) {
  if (!Array.isArray(chunks)) return { results: [], sources: [] };

  const results = [];
  const sourceMap = new Map();

  for (const chunk of chunks.slice(0, MAX_SEARCH_RESULTS)) {
    const url = canonicalSmartboligUrl(chunk?.item?.key);
    const text = typeof chunk?.text === "string" ? chunk.text.trim().slice(0, MAX_SEARCH_CHUNK_CHARS) : "";
    if (!url || !text) continue;

    const title = safeTitle(chunk?.item?.metadata, url);
    results.push({
      text,
      score: Number.isFinite(chunk?.score) ? chunk.score : null,
      sourceTitle: title,
      sourceUrl: url,
    });
    if (!sourceMap.has(url)) sourceMap.set(url, { title, url });
  }

  return { results, sources: [...sourceMap.values()] };
}
