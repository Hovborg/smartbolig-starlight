// Ranks feed items for the daily issue. Product announcements outrank release
// feeds, and routine release noise (nightlies, alphas, bare version tags) is
// pushed down so it only surfaces on quiet days.
import { HIGH_SIGNAL_KEYWORDS } from "../ai-news-sources.mjs";

const RELEASE_FEEDS = new Set(["openai-codex", "claude-code", "gemini-cli", "openclaw", "ollama"]);
const PRODUCT_SOURCES = new Set([
  "openai-news", "google-ai", "anthropic-news", "google-deepmind", "mistral-news", "home-assistant-blog",
]);

export function scoreItem(item) {
  const haystack = `${item.source.name} ${item.title} ${item.summary}`.toLowerCase();
  let score = item.source.priority;
  const isReleaseFeed = RELEASE_FEEDS.has(item.source.id);

  for (const [keyword, weight] of HIGH_SIGNAL_KEYWORDS) {
    if (haystack.includes(keyword)) score += weight;
  }

  if (/\bv?\d+\.\d+\.\d+\b/.test(item.title)) score += 1;
  if (isReleaseFeed) score -= 4;
  if (isReleaseFeed && !/\b(security|safety|pricing|deprecation|breaking|permission|privacy|usage|context|browser|model|agent|workflow|mcp|api)\b/i.test(haystack)) {
    score -= 6;
  }
  if (/\bnightly\b/i.test(item.title)) score -= 8;
  if (/\balpha\b/i.test(item.title)) score -= 4;
  if (/\b(preview|beta|rc)\b/i.test(item.title)) score -= 3;
  if (/\b(cherry-pick|patch version|dependency bump)\b/i.test(`${item.title} ${item.summary}`)) score -= 7;
  if (/^release v?\d+\.\d+\.\d+/i.test(item.title)) score -= 4;
  if (/^(v|rust-v)?\d+\.\d+\.\d+/i.test(item.title)) score -= 4;
  if (/\b(academy|customer success|research with chatgpt|data analysis)\b/i.test(item.title)) score -= 5;

  return score;
}

// Covers `days` whole UTC days, ending on (and including) the target date.
export function dateWindow(dateString, days) {
  const end = new Date(`${dateString}T23:59:59.999Z`);
  const start = new Date(`${dateString}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return { start, end };
}

export function recencyBoost(published, end) {
  const daysOld = Math.max(0, (end.getTime() - published.getTime()) / 86_400_000);
  return Math.max(0, 8 - Math.floor(daysOld));
}

export function scoreCandidates(items, { targetDate, lookbackDays }) {
  const { start, end } = dateWindow(targetDate, lookbackDays);
  const byUrl = new Map();

  for (const item of items) {
    if (item.published < start || item.published > end) continue;
    const scored = { ...item, score: scoreItem(item) + recencyBoost(item.published, end) };
    const existing = byUrl.get(item.url);
    if (!existing || existing.score < scored.score) byUrl.set(item.url, scored);
  }

  const candidates = [...byUrl.values()].sort((a, b) => (b.score !== a.score ? b.score - a.score : b.published - a.published));
  return [
    ...candidates.filter((item) => PRODUCT_SOURCES.has(item.source.id)),
    ...candidates.filter((item) => !PRODUCT_SOURCES.has(item.source.id)),
  ];
}
