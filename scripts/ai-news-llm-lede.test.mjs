import assert from "node:assert/strict";
import test from "node:test";

import { MAX_LEDE_REPAIRS } from "./lib/news-llm/limits.mjs";
import { fallbackLede, produceLede } from "./lib/news-llm/lede.mjs";
import { CallBudgetExceeded } from "./lib/news-llm/provider.mjs";
import { PASS, reject, scriptedChat, silent, sourceItem, validLede, validStory } from "./ai-news-llm-fixtures.mjs";

const stories = [
  { item: sourceItem({ sourceName: "OpenAI News" }), story: validStory() },
  { item: sourceItem({ sourceName: "Google AI Releases", title: "Google ships a thing" }), story: validStory() },
];
const run = (script, list = stories) => {
  const harness = scriptedChat(script);
  return { ...harness, result: produceLede({ stories: list, chat: harness.chat, log: silent }) };
};
const attempts = MAX_LEDE_REPAIRS + 1;

test("fallbackLede is built from the count and the publisher names only", () => {
  const lede = fallbackLede(stories);
  assert.match(lede.en, /^Today's issue covers 2 updates from OpenAI and Google AI\./);
  assert.match(lede.da, /^Dagens udgave dækker 2 opdateringer fra OpenAI og Google AI\./);
});

test("fallbackLede lists three publishers, dedupes and survives missing names", () => {
  const named = (name) => ({ item: sourceItem({ sourceName: name }), story: validStory() });
  assert.match(fallbackLede([named("A News"), named("B"), named("C releases")]).en, /from A, B and C\./);
  assert.match(fallbackLede([named("A"), named("A")]).en, /covers 2 updates from A\./);
  assert.match(fallbackLede([{ item: { title: "t" }, story: validStory() }]).en, /covers 1 updates from \./);
});

test("a lede that passes the fact check is marked as llm", async () => {
  const { result, byRole } = run({ writer: [validLede()], reviewer: [PASS], writerModel: "model-a" });
  assert.deepEqual(await result, { lede: validLede(), source: "llm" });
  assert.equal(byRole("reviewer")[0].avoid, "model-a");
});

test("extra properties from the model are not copied into the lede", async () => {
  const { result } = run({ writer: [{ ...validLede(), note: "extra" }], reviewer: [PASS] });
  assert.deepEqual(Object.keys((await result).lede), ["en", "da"]);
});

test("a writer that never returns valid JSON ends in the fallback without a review", async () => {
  const { result, byRole } = run({ writer: Array(attempts).fill("no json") });
  const outcome = await result;
  assert.equal(outcome.source, "fallback");
  assert.deepEqual(outcome.lede, fallbackLede(stories));
  assert.equal(byRole("reviewer").length, 0);
  assert.equal(byRole("writer").length, attempts);
});

test("a lede that breaks the format rules is rewritten once with feedback", async () => {
  const { result, byRole } = run({ writer: [{ en: "Too short", da: "For kort" }, validLede()], reviewer: [PASS] });
  assert.equal((await result).source, "llm");
  assert.match(byRole("writer")[1].user, /lede\.en: under 8 words/);
});

test("a number that no story states sends the lede back to the writer", async () => {
  const invented = { ...validLede(), en: "Today's issue covers a permissions update for 77 agents and what remains open." };
  const { result, byRole } = run({ writer: [invented, validLede()], reviewer: [PASS] });
  assert.equal((await result).source, "llm");
  assert.match(byRole("writer")[1].user, /The number 77 is not in the stories/);
});

test("a reviewer rejection leads to a repair and then a pass", async () => {
  const { result, byRole } = run({ writer: [validLede(), validLede()], reviewer: [reject("wrong claim", "lede.en"), PASS] });
  assert.equal((await result).source, "llm");
  assert.match(byRole("writer")[1].user, /lede\.en: "wrong claim" is unsupported\. Stories: not in source/);
});

test("the fallback is used when the reviewer rejects after MAX_LEDE_REPAIRS", async () => {
  const { result, byRole } = run({ writer: Array(attempts).fill(validLede()), reviewer: Array(attempts).fill(reject("wrong", "lede.da")) });
  const outcome = await result;
  assert.equal(outcome.source, "fallback");
  assert.deepEqual(outcome.lede, fallbackLede(stories));
  assert.equal(byRole("writer").length, attempts);
});

test("an unreadable verdict is not a pass", async () => {
  const { result, byRole } = run({ writer: Array(attempts).fill(validLede()), reviewer: Array(attempts).fill("garbage") });
  assert.equal((await result).source, "fallback");
  assert.match(byRole("writer")[1].user, /fact check gave no valid verdict/);
});

test("a reviewer call that throws counts as no verdict, not as a crash", async () => {
  const { result } = run({ writer: Array(attempts).fill(validLede()), reviewer: Array(attempts).fill(new Error("reviewer down")) });
  assert.equal((await result).source, "fallback");
});

test("a lede call that exhausts the call budget surfaces as CallBudgetExceeded", async () => {
  const { result } = run({ writer: [new CallBudgetExceeded("ceiling")] });
  await assert.rejects(result, CallBudgetExceeded);
});

// produceLede only guards the reviewer call. A writer outage (every model
// failed) throws out of produceLede, and produceIssue rethrows it, so a lede
// outage costs the whole issue even though the stories already passed.
test("a writer outage during the lede falls back instead of throwing", async () => {
  const { result } = run({ writer: [new Error("Every writer model failed: down")] });
  assert.equal((await result).source, "fallback");
});
