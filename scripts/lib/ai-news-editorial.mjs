import { createHash } from "node:crypto";

const DEFAULTS = {
  minScore: 14,
  maxItems: 4,
  maxPerSource: 1,
  duplicateThreshold: 0.72,
};

const stopWords = new Set([
  "a", "an", "and", "for", "in", "of", "on", "the", "to", "with",
  "en", "et", "for", "i", "med", "og", "på", "til",
]);

function tokens(value = "") {
  return new Set(String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, " ")
    .split(/[\s-]+/)
    .filter((token) => token.length > 1 && !stopWords.has(token)));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function tokenSimilarity(left, right) {
  const a = tokens(left);
  const b = tokens(right);
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / new Set([...a, ...b]).size;
}

export function storyFingerprint(candidate) {
  const identity = `${candidate.canonicalUrl || candidate.url || ""}\n${[...tokens(candidate.title)].sort().join(" ")}`;
  return sha256(identity);
}

export function sourceSetFingerprint(items) {
  return sha256([...new Set(items.map((item) => item.sourceId || item.source?.id).filter(Boolean))].sort().join("\n"));
}

export function selectEditorialPackage(candidates, history = [], options = {}) {
  const config = { ...DEFAULTS, ...options };
  const recentUrls = new Set(history.map((item) => item.canonicalUrl).filter(Boolean));
  const recentFingerprints = new Set(history.map((item) => item.storyFingerprint).filter(Boolean));
  const recentTitles = history.map((item) => item.title).filter(Boolean);
  const seenUrls = new Set();
  const seenTitles = [];
  const sourceCounts = new Map();

  const eligible = [...candidates]
    .filter((item) => Number(item.score ?? item.source?.priority ?? 0) >= config.minScore)
    .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0))
    .filter((item) => {
      const canonicalUrl = item.canonicalUrl || item.url;
      const fingerprint = storyFingerprint(item);
      if (!canonicalUrl || recentUrls.has(canonicalUrl) || recentFingerprints.has(fingerprint) || seenUrls.has(canonicalUrl)) return false;
      if ([...recentTitles, ...seenTitles].some((title) => tokenSimilarity(item.title, title) >= config.duplicateThreshold)) return false;
      seenUrls.add(canonicalUrl);
      seenTitles.push(item.title);
      return true;
    })
    .filter((item) => {
      const sourceId = item.sourceId || item.source?.id || "unknown";
      const count = sourceCounts.get(sourceId) || 0;
      if (count >= config.maxPerSource) return false;
      sourceCounts.set(sourceId, count + 1);
      return true;
    })
    .slice(0, config.maxItems);

  if (eligible.length === 0) {
    return { status: "skip", reason: "No novel candidate met the editorial score threshold." };
  }
  if (!eligible.some((item) => item.primary || item.source?.primary)) {
    return { status: "skip", reason: "No primary source survived the editorial gate." };
  }

  const setFingerprint = sourceSetFingerprint(eligible);
  if (history.some((item) => item.sourceSetFingerprint === setFingerprint)) {
    return { status: "skip", reason: "The selected source set repeats a recent issue." };
  }

  return {
    status: "publish",
    items: eligible,
    reasons: ["primary-source", "novel-story", "score-threshold"],
    sourceSetFingerprint: setFingerprint,
  };
}
