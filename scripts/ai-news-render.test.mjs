import assert from "node:assert/strict";
import test from "node:test";

import { selectEditorialPackage } from "./lib/ai-news-editorial.mjs";
import { renderIssue } from "./lib/ai-news-render.mjs";

const item = {
  source: { id: "openai-news", name: "OpenAI News", primary: true },
  sourceId: "openai-news",
  sourceName: "OpenAI News",
  primary: true,
  title: "OpenAI adds scoped permissions for home agents",
  url: "https://openai.com/news/scoped-home-agents",
  canonicalUrl: "https://openai.com/news/scoped-home-agents",
  summary: "The update adds scoped tool permissions and a visible approval step for sensitive actions.",
  bodyText: "The official announcement describes staged rollout, evaluation results, permission scopes, administrator controls and known regional availability limits.",
  published: new Date("2026-07-11T08:00:00Z"),
  score: 24,
};

test("renderIssue writes v2 evidence metadata and a complete editorial contract", () => {
  const editorialPackage = selectEditorialPackage([item], []);
  const da = renderIssue({ locale: "da", date: "2026-07-11", editorialPackage });
  const en = renderIssue({ locale: "en", date: "2026-07-11", editorialPackage });

  for (const output of [da, en]) {
    assert.match(output, /editorialVersion: 2/);
    assert.match(output, /storyFingerprint: "[a-f0-9]{64}"/);
    assert.match(output, /sourceSetFingerprint: "[a-f0-9]{64}"/);
    assert.match(output, /scoped permissions for home agents/i);
    assert.match(output, /permission|tilladel/i);
    assert.match(output, /verific|kontroll/i);
    assert.match(output, /uncertain|usikker/i);
    assert.match(output, /https:\/\/openai\.com\/news\/scoped-home-agents/);
  }

  for (const stockPhrase of [
    "Det er en officiel kilde",
    "For SmartBolig-læsere",
    "Det næste skridt",
    "It is an official source",
    "For SmartBolig readers",
    "The next step",
  ]) {
    assert.doesNotMatch(`${da}\n${en}`, new RegExp(stockPhrase, "i"));
  }
});

test("renderIssue neutralizes MDX and Markdown control characters from feeds", () => {
  const hostile = {
    ...item,
    title: "Update {process.env.SECRET} [click]",
    summary: "</script>{dangerousExpression} *untrusted*",
    url: "https://example.com/story(bad)",
    canonicalUrl: "https://example.com/story(bad)",
  };
  const output = renderIssue({
    locale: "en",
    date: "2026-07-11",
    editorialPackage: selectEditorialPackage([hostile], []),
  });

  assert.doesNotMatch(output, /\{process\.env\.SECRET\}|\{dangerousExpression\}|<\/script>/);
  assert.match(output, /story%28bad%29/);
});
