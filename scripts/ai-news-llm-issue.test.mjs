import assert from "node:assert/strict";
import test from "node:test";

import { finalizeEditorialPackage, sourceSetFingerprint } from "./lib/ai-news-editorial.mjs";
import { fallbackLede } from "./lib/news-llm/lede.mjs";
import { produceIssue } from "./lib/news-llm/issue.mjs";
import { CallBudgetExceeded, DailyBudgetExhausted } from "./lib/news-llm/errors.mjs";
import { routedChat, silent, sourceItem, validLede, validStory } from "./ai-news-llm-fixtures.mjs";

const candidate = (name) => sourceItem({ title: `Story ${name}`, canonicalUrl: `https://openai.com/news/${name}` });
const pool = (...names) => names.map(candidate);
const build = (options) => produceIssue({ date: "2026-07-11", log: silent, ...options });

test("production stops once the target is reached and leaves the rest untouched", async () => {
  const router = routedChat();
  const issue = await build({ candidates: pool("a", "b", "c", "d", "e"), target: 2, minimum: 2, chat: router.chat });
  assert.equal(issue.status, "publish");
  assert.deepEqual(issue.items.map((item) => item.title), ["Story a", "Story b"]);
  assert.deepEqual(router.kinds("story").map((call) => call.title), ["Story a", "Story b"]);
  assert.equal(issue.copy.stories.length, 2);
  assert.deepEqual(issue.copy.stories[0], validStory());
});

test("a published issue carries the lede, its source and the passed marker", async () => {
  const issue = await build({ candidates: pool("a", "b"), target: 2, minimum: 2, chat: routedChat().chat });
  assert.deepEqual(issue.copy.lede, validLede());
  assert.equal(issue.ledeSource, "llm");
  assert.equal(issue.copy.semanticReview, "passed");
  assert.deepEqual(issue.dropped, []);
});

test("reserve candidates replace a dropped story and the drop is reported", async () => {
  const router = routedChat({ verdicts: { "Story a": false } });
  const issue = await build({ candidates: pool("a", "b", "c", "d"), target: 2, minimum: 2, chat: router.chat });
  assert.equal(issue.status, "publish");
  assert.deepEqual(issue.items.map((item) => item.title), ["Story b", "Story c"]);
  assert.equal(issue.dropped.length, 1);
  assert.equal(issue.dropped[0].title, "Story a");
  assert.equal(issue.dropped[0].url, "https://openai.com/news/a");
  assert.ok(issue.dropped[0].reasons.length > 0);
  assert.equal(router.kinds("story").some((call) => call.title === "Story d"), false);
});

test("the issue is skipped when fewer than minimum stories pass", async () => {
  const router = routedChat({ verdicts: { "Story a": false } });
  const issue = await build({ candidates: pool("a", "b", "c"), target: 3, minimum: 3, chat: router.chat });
  assert.equal(issue.status, "skip");
  assert.equal(issue.reason, "2 of 3 stories passed the fact check; 3 are required.");
  assert.equal(issue.dropped.length, 1);
  assert.equal("copy" in issue, false);
  assert.equal(router.kinds("lede").length, 0);
});

test("a story is never published without a passed review", async () => {
  const verdicts = Object.fromEntries(["a", "b", "c"].map((name) => [`Story ${name}`, false]));
  const router = routedChat({ verdicts });
  const issue = await build({ candidates: pool("a", "b", "c"), target: 3, minimum: 2, chat: router.chat });
  assert.equal(issue.status, "skip");
  assert.equal(issue.dropped.length, 3);
  assert.equal("items" in issue, false);
});

test("every published story was reviewed and passed", async () => {
  const router = routedChat({ verdicts: { "Story b": false } });
  const issue = await build({ candidates: pool("a", "b", "c"), target: 2, minimum: 2, chat: router.chat });
  for (const item of issue.items) {
    assert.ok(router.kinds("review").some((call) => call.title === item.title), `${item.title} was reviewed`);
  }
  assert.equal(issue.items.some((item) => item.title === "Story b"), false);
});

test("an exhausted call budget stops further stories and publishes what passed", async () => {
  const router = routedChat({ failWith: ({ kind, title }) => (kind === "story" && title === "Story c" ? new CallBudgetExceeded("ceiling") : undefined) });
  const issue = await build({ candidates: pool("a", "b", "c", "d"), target: 3, minimum: 2, chat: router.chat });
  assert.equal(issue.status, "publish");
  assert.deepEqual(issue.items.map((item) => item.title), ["Story a", "Story b"]);
  assert.equal(router.kinds("story").some((call) => call.title === "Story d"), false);
});

test("an exhausted call budget during the lede keeps the issue with the fallback lede", async () => {
  const router = routedChat({ failWith: ({ kind }) => (kind === "lede" ? new CallBudgetExceeded("ceiling") : undefined) });
  const issue = await build({ candidates: pool("a", "b"), target: 2, minimum: 2, chat: router.chat });
  assert.equal(issue.status, "publish");
  assert.equal(issue.ledeSource, "fallback");
  assert.deepEqual(issue.copy.lede, fallbackLede(issue.items.map((item) => ({ item, story: validStory() }))));
});

test("a rejected lede publishes with the fallback lede", async () => {
  const issue = await build({ candidates: pool("a", "b"), target: 2, minimum: 2, chat: routedChat({ ledeOk: false }).chat });
  assert.equal(issue.status, "publish");
  assert.equal(issue.ledeSource, "fallback");
});

test("an unexpected error from the model layer is not swallowed", async () => {
  const router = routedChat({ failWith: ({ kind }) => (kind === "story" ? new Error("kaboom") : undefined) });
  await assert.rejects(build({ candidates: pool("a", "b"), target: 2, minimum: 2, chat: router.chat }), /kaboom/);
});

const primary = (id, overrides = {}) => ({ sourceId: id, source: { id, primary: true }, primary: true, title: id, ...overrides });

test("finalizeEditorialPackage publishes surviving items with a source set fingerprint", () => {
  const items = [primary("openai-news"), primary("google-ai")];
  const result = finalizeEditorialPackage(items, []);
  assert.equal(result.status, "publish");
  assert.equal(result.items, items);
  assert.equal(result.sourceSetFingerprint, sourceSetFingerprint(items));
  assert.ok(result.reasons.includes("fact-checked"));
});

test("finalizeEditorialPackage skips when no primary source survived", () => {
  const items = [primary("a", { primary: false, source: { id: "a", primary: false } })];
  const result = finalizeEditorialPackage(items, []);
  assert.equal(result.status, "skip");
  assert.match(result.reason, /No primary source/);
  assert.equal(finalizeEditorialPackage([primary("a", { primary: false, source: { id: "a" } }), primary("b", { primary: false, source: { id: "b", primary: true } })], []).status, "publish");
});

test("finalizeEditorialPackage skips when the source set repeats history", () => {
  const items = [primary("openai-news"), primary("google-ai")];
  const history = [{ sourceSetFingerprint: sourceSetFingerprint(items) }];
  const result = finalizeEditorialPackage(items, history);
  assert.equal(result.status, "skip");
  assert.match(result.reason, /repeats a recent issue/);
  assert.equal(finalizeEditorialPackage([primary("openai-news")], history).status, "publish");
});

test("a daily budget error stops further stories and publishes what passed with a fallback lede", async () => {
  const router = routedChat({ failWith: ({ kind, title }) => (kind === "story" && title === "Story c" ? new DailyBudgetExhausted("daily") : (kind === "lede" ? new DailyBudgetExhausted("daily") : undefined)) });
  const issue = await build({ candidates: pool("a", "b", "c", "d"), target: 3, minimum: 2, chat: router.chat });
  assert.equal(issue.status, "publish");
  assert.equal(issue.items.length, 2);
  assert.equal(issue.ledeSource, "fallback");
  assert.equal(router.kinds("story").some((call) => call.title === "Story d"), false);
});

test("a budget error with too few stories passed skips the issue", async () => {
  const router = routedChat({ failWith: ({ kind, title }) => (kind === "story" && title === "Story b" ? new CallBudgetExceeded("ceiling") : undefined) });
  const issue = await build({ candidates: pool("a", "b", "c"), target: 3, minimum: 3, chat: router.chat });
  assert.equal(issue.status, "skip");
  assert.match(issue.reason, /1 of 1 stories passed.*3 are required/);
  assert.equal(router.kinds("lede").length, 0);
});

const fromSource = (name, sourceId) => sourceItem({ title: `Story ${name}`, canonicalUrl: `https://openai.com/news/${name}`, sourceId, primary: true });

test("a repeated source set keeps processing the pool until another source changes it", async () => {
  const candidates = [fromSource("a", "s1"), fromSource("b", "s2"), fromSource("c", "s3"), fromSource("d", "s4")];
  const recentSourceSets = [sourceSetFingerprint(candidates.slice(0, 2))];
  const router = routedChat();
  const issue = await build({ candidates, target: 2, minimum: 2, chat: router.chat, recentSourceSets });
  assert.equal(issue.status, "publish");
  assert.deepEqual(issue.items.map((item) => item.title), ["Story a", "Story b", "Story c"]);
  assert.deepEqual(router.kinds("story").map((call) => call.title), ["Story a", "Story b", "Story c"]);
  const final = finalizeEditorialPackage(issue.items, recentSourceSets.map((sourceSetFingerprint) => ({ sourceSetFingerprint })));
  assert.equal(final.status, "publish");
  assert.equal(final.sourceSetFingerprint, sourceSetFingerprint(issue.items));
});

test("without a repeat the loop still stops at the target", async () => {
  const candidates = [fromSource("a", "s1"), fromSource("b", "s2"), fromSource("c", "s3")];
  const router = routedChat();
  const issue = await build({ candidates, target: 2, minimum: 2, chat: router.chat, recentSourceSets: [sourceSetFingerprint(candidates.slice(1))] });
  assert.deepEqual(issue.items.map((item) => item.title), ["Story a", "Story b"]);
  assert.equal(router.kinds("story").length, 2);
});

test("a repeated source set with no other candidate is still skipped, without extra calls", async () => {
  for (const verdicts of [{}, { "Story c": false }]) {
    const candidates = [fromSource("a", "s1"), fromSource("b", "s2"), ...(verdicts["Story c"] === false ? [fromSource("c", "s3")] : [])];
    const history = [{ sourceSetFingerprint: sourceSetFingerprint(candidates.slice(0, 2)) }];
    const router = routedChat({ verdicts });
    const issue = await build({ candidates, target: 2, minimum: 2, chat: router.chat, recentSourceSets: history.map((row) => row.sourceSetFingerprint) });
    // A rejected story is repaired a few times, so count candidates, not calls.
    assert.deepEqual([...new Set(router.kinds("story").map((call) => call.title))], candidates.map((item) => item.title), "no calls beyond the pool");
    assert.equal(issue.status, "publish");
    const final = finalizeEditorialPackage(issue.items, history);
    assert.equal(final.status, "skip");
    assert.match(final.reason, /repeats a recent issue/);
  }
});