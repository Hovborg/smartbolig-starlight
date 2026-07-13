import assert from "node:assert/strict";
import test from "node:test";

import { selectEditorialPackage } from "./lib/ai-news-editorial.mjs";
import { renderIssue, renderRepeatIssue } from "./lib/ai-news-render.mjs";

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

test("renderIssue writes v3 evidence metadata and a complete editorial contract", () => {
  const editorialPackage = selectEditorialPackage([item], []);
  const da = renderIssue({ locale: "da", date: "2026-07-11", editorialPackage });
  const en = renderIssue({ locale: "en", date: "2026-07-11", editorialPackage });

  for (const output of [da, en]) {
    assert.match(output, /editorialVersion: 3/);
    assert.match(output, /copySource: template/);
    assert.match(output, /signal: low/);
    assert.match(output, /\b(Kilde|Source): \[/);
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

// Regression for security review H-1 (docs/verification/2026-07-13-security-review.md):
// these exact payloads previously survived safeText() and rendered as an active
// javascript: link and a remote tracking image via Astro's Markdown processor.
test("renderIssue neutralizes active Markdown links, images, and code from feed text", () => {
  const hostile = {
    ...item,
    summary: "[click](javascript:alert(document.domain)) ![track](https://attacker.invalid/pixel) `rm -rf`",
    bodyText: "",
  };
  const output = renderIssue({
    locale: "en",
    date: "2026-07-11",
    editorialPackage: selectEditorialPackage([hostile], []),
  });

  assert.doesNotMatch(output, /\[click\]\(javascript:/);
  assert.doesNotMatch(output, /!\[track\]\(/);
  assert.doesNotMatch(output, /\]\(\s*javascript:/i);
  assert.doesNotMatch(output, /`rm -rf`/);
  // The words themselves must survive as plain text.
  assert.match(output, /click/);
  assert.match(output, /track/);
});

test("renderIssue uses validated LLM copy and escapes it like feed text", () => {
  const editorialPackage = selectEditorialPackage([item], []);
  const copy = {
    lede: { da: "Dagens vigtigste ændring handler om tilladelser.", en: "Today's main change concerns permissions." },
    stories: [{
      what: { da: "OpenAI har tilføjet {styrede} tilladelser.", en: "OpenAI added {scoped} permissions." },
      why: { da: "Det begrænser hvad en agent kan udløse.", en: "It limits what an agent can trigger." },
      verify: { da: "Prøv en følsom handling i testmiljø.", en: "Try a sensitive action in a test environment." },
      uncertainty: { da: "Udrulningen er ikke beskrevet.", en: "The rollout is not described." },
    }],
  };
  const da = renderIssue({ locale: "da", date: "2026-07-11", editorialPackage, copy });
  const en = renderIssue({ locale: "en", date: "2026-07-11", editorialPackage, copy });

  assert.match(da, /copySource: llm/);
  assert.match(da, /Dagens vigtigste ændring handler om tilladelser\./);
  assert.match(da, /Det begrænser hvad en agent kan udløse\./);
  assert.doesNotMatch(da, /\{styrede\}/);
  assert.match(en, /Today's main change concerns permissions\./);
  assert.doesNotMatch(en, /\{scoped\}/);
});

test("renderRepeatIssue writes an honest low-signal repeat digest", () => {
  const output = renderRepeatIssue({
    locale: "da",
    date: "2026-05-17",
    repeatOfDate: "2026-05-16",
    items: [item, { ...item, title: "Second story", canonicalUrl: "https://openai.com/news/second" }],
  });

  assert.match(output, /copySource: repeat/);
  assert.match(output, /signal: low/);
  assert.match(output, /repeatOf: "2026-05-16"/);
  assert.match(output, /Ingen nye kvalificerede kilder/);
  assert.match(output, /\/da\/ai\/nyheder\/2026-05-16\//);
  assert.match(output, /Kilde: /);
});
