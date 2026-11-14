import assert from "node:assert/strict";
import test from "node:test";

import { MAX_FEEDBACK_CHARS, MAX_FEEDBACK_REASONS, MAX_STORY_REPAIRS } from "./lib/news-llm/limits.mjs";
import { boundFeedback, produceStory } from "./lib/news-llm/story.mjs";
import { PASS, reject, scriptedChat, silent, sourceItem, validStory } from "./ai-news-llm-fixtures.mjs";

const run = (script) => {
  const harness = scriptedChat(script);
  return { ...harness, result: produceStory({ date: "2026-07-11", item: sourceItem(), chat: harness.chat, log: silent }) };
};
const feedbackLines = (user) => (user.match(/<checker_feedback>\n([\s\S]*?)\n<\/checker_feedback>/)?.[1] || "").split("\n").filter(Boolean);

test("a story that passes first try costs one draft and one review", async () => {
  const { result, byRole } = run({ writer: [validStory()], reviewer: [PASS] });
  const outcome = await result;
  assert.deepEqual(outcome, { status: "passed", story: validStory(), attempts: 1 });
  assert.equal(byRole("writer").length, 1);
  assert.equal(byRole("reviewer").length, 1);
});

test("the reviewer is told which model wrote the draft", async () => {
  const { result, byRole } = run({ writer: [validStory()], reviewer: [PASS], writerModel: "model-a" });
  await result;
  assert.equal(byRole("reviewer")[0].avoid, "model-a");
});

test("a format error buys one retry that names the problem", async () => {
  const { result, byRole } = run({ writer: ["not json at all", validStory()], reviewer: [PASS] });
  const outcome = await result;
  assert.equal(outcome.status, "passed");
  assert.equal(outcome.attempts, 1);
  assert.equal(byRole("writer").length, 2);
  assert.match(byRole("writer")[1].user, /Format error in your reply: no JSON object/);
});

test("a story that breaks the word caps is retried with the validator's message", async () => {
  const long = validStory();
  long.what.en = Array(95).fill("word").join(" ");
  const { result, byRole } = run({ writer: [long, validStory()], reviewer: [PASS] });
  assert.equal((await result).status, "passed");
  assert.match(byRole("writer")[1].user, /what\.en: exceeds 90 words/);
});

test("two format failures drop the story without a fact check", async () => {
  const { result, byRole } = run({ writer: ["nope", "still nope"] });
  const outcome = await result;
  assert.equal(outcome.status, "dropped");
  assert.equal(outcome.attempts, 1);
  assert.match(outcome.reasons[0], /Format error in your reply/);
  assert.equal(byRole("reviewer").length, 0);
});

test("an ungrounded number triggers a repair before any review", async () => {
  const invented = validStory();
  invented.what.en = "The vendor says it added scoped permissions for 99 agent products";
  const { result, byRole } = run({ writer: [invented, validStory()], reviewer: [PASS] });
  const outcome = await result;
  assert.equal(outcome.status, "passed");
  assert.equal(outcome.attempts, 2);
  assert.equal(byRole("reviewer").length, 1);
  assert.match(byRole("writer")[1].user, /The number 99 does not occur in the source/);
});

test("numbers that the source states are accepted", async () => {
  const grounded = validStory();
  grounded.what.en = "The vendor says the update launched on 2026-07-11 for its agent products";
  const { result } = run({ writer: [grounded], reviewer: [PASS] });
  assert.equal((await result).status, "passed");
});

test("a reviewer rejection leads to a repair with the issue as feedback, then a pass", async () => {
  const { result, byRole } = run({ writer: [validStory(), validStory(" again")], reviewer: [reject("it is much faster"), PASS] });
  const outcome = await result;
  assert.equal(outcome.status, "passed");
  assert.equal(outcome.attempts, 2);
  const [first, second] = byRole("writer");
  assert.equal(first.user.includes("<checker_feedback>"), false);
  assert.match(second.user, /why\.en: "it is much faster" is unsupported\. Source: not in source/);
  assert.deepEqual(outcome.story, validStory(" again"));
});

test("a story still rejected after MAX_STORY_REPAIRS is dropped with reasons", async () => {
  const attempts = MAX_STORY_REPAIRS + 1;
  const { result, byRole } = run({
    writer: Array.from({ length: attempts }, () => validStory()),
    reviewer: Array.from({ length: attempts }, () => reject("it is much faster")),
  });
  const outcome = await result;
  assert.equal(outcome.status, "dropped");
  assert.equal(outcome.attempts, attempts);
  assert.equal(byRole("writer").length, attempts);
  assert.equal(byRole("reviewer").length, attempts);
  assert.match(outcome.reasons[0], /it is much faster/);
  assert.equal("story" in outcome, false);
});

test("a malformed verdict twice counts as a rejection and feeds the next draft", async () => {
  const { result, byRole } = run({ writer: [validStory(), validStory()], reviewer: ["garbage", "{\"pass\":true}", PASS] });
  const outcome = await result;
  assert.equal(outcome.status, "passed");
  assert.equal(outcome.attempts, 2);
  assert.equal(byRole("reviewer").length, 3);
  assert.match(byRole("writer")[1].user, /fact check gave no valid verdict/);
});

test("one malformed verdict is retried once and a valid pass then counts", async () => {
  const { result, byRole } = run({ writer: [validStory()], reviewer: ["garbage", PASS] });
  const outcome = await result;
  assert.equal(outcome.status, "passed");
  assert.equal(outcome.attempts, 1);
  assert.equal(byRole("reviewer").length, 2);
});

test("a verdict that passes with issues is not a pass", async () => {
  const contradictory = { pass: true, issues: [{ claim: "x" }] };
  const { result } = run({ writer: [validStory(), validStory(), validStory()], reviewer: Array(6).fill(contradictory) });
  assert.equal((await result).status, "dropped");
});

test("boundFeedback strips angle brackets, collapses whitespace and drops empties", () => {
  assert.deepEqual(boundFeedback(["a <b>x</b>\n\n y", "", "   ", null, "ok"]), ["a b x /b y", "ok"]);
});

test("boundFeedback limits the number of reasons and the length of each", () => {
  const reasons = Array.from({ length: MAX_FEEDBACK_REASONS + 4 }, (_, index) => `${index}${"x".repeat(MAX_FEEDBACK_CHARS * 2)}`);
  const bounded = boundFeedback(reasons);
  assert.equal(bounded.length, MAX_FEEDBACK_REASONS);
  for (const reason of bounded) assert.equal(reason.length, MAX_FEEDBACK_CHARS);
});

test("feedback handed to the writer is bounded in count and length", async () => {
  const many = {
    pass: false,
    issues: Array.from({ length: MAX_FEEDBACK_REASONS + 5 }, (_, index) => ({ field: "why.en", claim: `claim ${index} ${"y".repeat(MAX_FEEDBACK_CHARS * 2)} <end>`, type: "stronger", source: "no" })),
  };
  const { result, byRole } = run({ writer: [validStory(), validStory()], reviewer: [many, PASS] });
  await result;
  const lines = feedbackLines(byRole("writer")[1].user);
  assert.equal(lines.length, MAX_FEEDBACK_REASONS);
  for (const line of lines) assert.ok(line.length <= MAX_FEEDBACK_CHARS + 2, `line is ${line.length} chars`);
  assert.equal(byRole("writer")[1].user.includes("<end>"), false);
});

test("dropped reasons are bounded too", async () => {
  const many = { pass: false, issues: Array.from({ length: 10 }, (_, index) => ({ claim: `claim ${index} ${"z".repeat(900)}` })) };
  const { result } = run({ writer: Array(3).fill(validStory()), reviewer: Array(3).fill(many) });
  const outcome = await result;
  assert.equal(outcome.reasons.length, MAX_FEEDBACK_REASONS);
  assert.ok(outcome.reasons.every((reason) => reason.length <= MAX_FEEDBACK_CHARS));
});
