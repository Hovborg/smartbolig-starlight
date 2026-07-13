import assert from "node:assert/strict";
import test from "node:test";

import {
  sourceSetFingerprint,
  storyFingerprint,
  tokenSimilarity,
  selectEditorialPackage,
} from "./lib/ai-news-editorial.mjs";

const candidate = (overrides = {}) => ({
  source: { id: "openai-news", name: "OpenAI News", priority: 10, primary: true },
  sourceId: "openai-news",
  sourceName: "OpenAI News",
  primary: true,
  title: "OpenAI launches a safer home automation model",
  url: "https://openai.com/news/home-model?utm_source=rss",
  canonicalUrl: "https://openai.com/news/home-model",
  summary: "The model adds safer tool permissions and lower latency for assistants.",
  bodyText: "Official documentation describes permission boundaries, evaluations, rollout and known limitations.",
  published: new Date("2026-07-11T08:00:00Z"),
  score: 24,
  ...overrides,
});

test("story fingerprints are stable and title similarity detects near duplicates", () => {
  assert.equal(storyFingerprint(candidate()), storyFingerprint(candidate({ url: "https://openai.com/news/home-model?ref=other" })));
  assert.ok(tokenSimilarity(
    "OpenAI launches safer home automation model",
    "OpenAI launches a safer model for home automation",
  ) >= 0.72);
});

test("a strong primary-source story is accepted", () => {
  const result = selectEditorialPackage([candidate()], [], { minScore: 14, maxItems: 4 });
  assert.equal(result.status, "publish");
  assert.equal(result.items.length, 1);
  assert.ok(result.reasons.includes("primary-source"));
});

test("the editorial package enforces per-source diversity", () => {
  const result = selectEditorialPackage([
    candidate(),
    candidate({
      title: "OpenAI changes API pricing for image models",
      canonicalUrl: "https://openai.com/news/image-pricing",
      url: "https://openai.com/news/image-pricing",
      score: 23,
    }),
  ], [], { minScore: 14, maxItems: 4, maxPerSource: 1 });

  assert.equal(result.status, "publish");
  assert.equal(result.items.length, 1);
});

test("canonical and semantic repeats from recent history are rejected", () => {
  const byUrl = selectEditorialPackage([candidate()], [{
    canonicalUrl: candidate().canonicalUrl,
    title: "Different title",
  }]);
  assert.equal(byUrl.status, "skip");

  const byTitle = selectEditorialPackage([candidate()], [{
    canonicalUrl: "https://example.com/other",
    title: "OpenAI launches a safer model for home automation",
  }]);
  assert.equal(byTitle.status, "skip");
});

test("a repeated source set and a weak release-only day are skipped", () => {
  const items = [
    candidate(),
    candidate({ sourceId: "google-ai", source: { id: "google-ai", name: "Google AI", priority: 9, primary: true }, canonicalUrl: "https://blog.google/ai/update", title: "Gemini adds safer smart-home tools" }),
  ];
  const repeatedSet = selectEditorialPackage(items, [{
    sourceSetFingerprint: sourceSetFingerprint(items),
  }]);
  assert.equal(repeatedSet.status, "skip");
  assert.match(repeatedSet.reason, /source set/i);

  const weak = selectEditorialPackage([
    candidate({ primary: false, score: 3, sourceId: "release-feed", title: "Release v1.2.3" }),
  ], []);
  assert.equal(weak.status, "skip");
});
