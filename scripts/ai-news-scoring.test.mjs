import assert from "node:assert/strict";
import test from "node:test";

import { dateWindow, recencyBoost, scoreCandidates, scoreItem } from "./lib/ai-news-scoring.mjs";

// "Zed" and "zebra" match no high-signal keyword, so the base score is the priority.
const item = ({ source, ...rest } = {}) => ({
  source: { id: "misc", name: "Zed", priority: 10, ...source },
  title: "Zebra",
  summary: "zebra",
  url: "https://example.com/a",
  published: new Date("2026-11-13T08:00:00Z"),
  ...rest,
});

test("a neutral item scores its source priority", () => {
  assert.equal(scoreItem(item()), 10);
});

test("keywords in the source name, title or summary add their weight", () => {
  assert.equal(scoreItem(item({ summary: "pricing" })), 16);
  assert.equal(scoreItem(item({ title: "Claude Zebra" })), 19);
  assert.equal(scoreItem(item({ source: { name: "Gemini feed" } })), 19);
});

test("a version number in the title adds one point", () => {
  assert.equal(scoreItem(item({ title: "Zebra 1.2.3" })), 11);
});

test("nightly, alpha and preview-like titles are pushed down", () => {
  assert.equal(scoreItem(item({ title: "Zebra nightly" })), 2);
  assert.equal(scoreItem(item({ title: "Zebra alpha" })), 6);
  for (const word of ["preview", "beta", "rc"]) assert.equal(scoreItem(item({ title: `Zebra ${word}` })), 7, word);
});

test("cherry-pick, patch and dependency noise is pushed down", () => {
  assert.equal(scoreItem(item({ summary: "cherry-pick fix" })), 3);
  assert.equal(scoreItem(item({ title: "Zebra patch version" })), 3);
});

test("bare version titles and release tags are penalised", () => {
  assert.equal(scoreItem(item({ title: "1.2.3 Zebra" })), 7);
  assert.equal(scoreItem(item({ title: "Release v1.2.3" })), 8);
});

test("academy and customer-success titles are pushed down", () => {
  assert.equal(scoreItem(item({ title: "OpenAI Academy Zebra" })), 5);
});

test("release feeds lose points unless the text carries a real signal", () => {
  assert.equal(scoreItem(item({ source: { id: "openai-codex" } })), 0);
  assert.equal(scoreItem(item({ source: { id: "openai-codex" }, summary: "pricing" })), 12);
  assert.equal(scoreItem(item({ source: { id: "ollama" }, summary: "pricing" })), 12);
});

test("dateWindow covers whole UTC days ending on the target date", () => {
  const { start, end } = dateWindow("2026-11-13", 3);
  assert.equal(start.toISOString(), "2026-11-11T00:00:00.000Z");
  assert.equal(end.toISOString(), "2026-11-13T23:59:59.999Z");
  assert.equal(dateWindow("2026-03-01", 2).start.toISOString(), "2026-02-28T00:00:00.000Z");
  assert.equal(dateWindow("2026-11-13", 1).start.toISOString(), "2026-11-13T00:00:00.000Z");
});

test("recencyBoost falls by one per whole day and never goes negative", () => {
  const end = new Date("2026-11-13T23:59:59.999Z");
  const ago = (days) => new Date(end.getTime() - days * 86_400_000);
  assert.equal(recencyBoost(ago(0), end), 8);
  assert.equal(recencyBoost(ago(0.5), end), 8);
  assert.equal(recencyBoost(ago(1), end), 7);
  assert.equal(recencyBoost(ago(7), end), 1);
  assert.equal(recencyBoost(ago(8), end), 0);
  assert.equal(recencyBoost(ago(30), end), 0);
  assert.equal(recencyBoost(ago(-2), end), 8);
});

const options = { targetDate: "2026-11-13", lookbackDays: 3 };

test("candidates outside the window are dropped", () => {
  const result = scoreCandidates([
    item({ url: "https://e.com/in" }),
    item({ url: "https://e.com/old", published: new Date("2026-11-10T23:59:59Z") }),
    item({ url: "https://e.com/future", published: new Date("2026-11-14T00:00:00Z") }),
    item({ url: "https://e.com/edge", published: new Date("2026-11-11T00:00:00Z") }),
  ], options);
  assert.deepEqual(result.map((entry) => entry.url).sort(), ["https://e.com/edge", "https://e.com/in"]);
});

test("the same URL keeps its higher scored copy and the score includes recency", () => {
  const result = scoreCandidates([item({ source: { priority: 5 } }), item({ source: { priority: 12 } })], options);
  assert.equal(result.length, 1);
  assert.equal(result[0].score, 12 + 8);
});

test("candidates sort by score, then newest first", () => {
  const same = { source: { priority: 10 } };
  const result = scoreCandidates([
    item({ ...same, url: "https://e.com/older", published: new Date("2026-11-13T01:00:00Z") }),
    item({ ...same, url: "https://e.com/newer", published: new Date("2026-11-13T09:00:00Z") }),
    item({ source: { priority: 20 }, url: "https://e.com/top" }),
  ], options);
  assert.deepEqual(result.map((entry) => entry.url), ["https://e.com/top", "https://e.com/newer", "https://e.com/older"]);
});

test("product announcements come before higher scored non-product sources", () => {
  const result = scoreCandidates([
    item({ source: { id: "misc", priority: 30 }, url: "https://e.com/misc" }),
    item({ source: { id: "openai-news", priority: 5 }, url: "https://e.com/product" }),
  ], options);
  assert.deepEqual(result.map((entry) => entry.url), ["https://e.com/product", "https://e.com/misc"]);
});
