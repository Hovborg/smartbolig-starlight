import assert from "node:assert/strict";
import test from "node:test";

import { buildCopyPrompt, extractJson, generateIssueCopy, validateIssueCopy } from "./lib/ai-news-llm.mjs";

const items = [{
  sourceName: "OpenAI News",
  title: "OpenAI adds scoped permissions for home agents",
  summary: "The update adds scoped tool permissions and a visible approval step.",
  bodyText: "The official announcement describes staged rollout and permission scopes.",
  published: new Date("2026-07-11T08:00:00Z"),
}];

const validCopy = {
  lede: { da: "Dagens udgave handler om tilladelser.", en: "Today's issue is about permissions." },
  stories: [{
    what: { da: "OpenAI har indført afgrænsede tilladelser.", en: "OpenAI introduced scoped permissions." },
    why: { da: "Det reducerer skaden ved en fejl.", en: "It reduces the blast radius of a mistake." },
    verify: { da: "Afprøv en blokeret handling i testmiljø.", en: "Try a blocked action in a test environment." },
    uncertainty: { da: "Udrulningstakten er ikke oplyst.", en: "The rollout pace is not stated." },
  }],
};

test("buildCopyPrompt wraps source material as untrusted data", () => {
  const prompt = buildCopyPrompt({ date: "2026-07-11", items });
  assert.match(prompt, /<source_material index="1">/);
  assert.match(prompt, /untrusted text quoted from external websites/);
  assert.match(prompt, /exactly 1 element\(s\)/);
  assert.match(prompt, /scoped permissions for home agents/);
});

test("validateIssueCopy accepts complete bilingual copy", () => {
  const { ok, problems } = validateIssueCopy(validCopy, 1);
  assert.deepEqual(problems, []);
  assert.equal(ok, true);
});

test("validateIssueCopy rejects URLs, markdown, missing fields, and length overruns", () => {
  const broken = structuredClone(validCopy);
  broken.stories[0].what.da = "Læs mere på https://example.com nu.";
  broken.stories[0].why.en = "See [docs](https://example.com).";
  broken.stories[0].verify.da = "";
  broken.stories[0].uncertainty.en = Array.from({ length: 80 }, () => "word").join(" ");
  const { ok, problems } = validateIssueCopy(broken, 1);
  assert.equal(ok, false);
  assert.ok(problems.some((problem) => problem.includes("what.da") && problem.includes("URL")));
  assert.ok(problems.some((problem) => problem.includes("why.en") && problem.includes("markdown")));
  assert.ok(problems.some((problem) => problem.includes("verify.da")));
  assert.ok(problems.some((problem) => problem.includes("uncertainty.en") && problem.includes("exceeds")));
});

test("validateIssueCopy rejects story-count mismatches", () => {
  const { ok, problems } = validateIssueCopy(validCopy, 3);
  assert.equal(ok, false);
  assert.ok(problems.some((problem) => problem.includes("exactly 3")));
});

test("extractJson tolerates fences and prose around the object", () => {
  const parsed = extractJson('Here you go:\n```json\n{"a": 1}\n```\nDone.');
  assert.deepEqual(parsed, { a: 1 });
});

test("generateIssueCopy parses the claude -p JSON envelope and validates", async () => {
  const seenArgs = [];
  const run = async ({ bin, args, input }) => {
    seenArgs.push({ bin, args });
    assert.match(input, /<source_material index="1">/);
    return JSON.stringify({ result: JSON.stringify(validCopy) });
  };
  const copy = await generateIssueCopy({ date: "2026-07-11", items, run, bin: "claude-test", model: "sonnet" });
  assert.deepEqual(copy, validCopy);
  assert.equal(seenArgs[0].bin, "claude-test");
  assert.deepEqual(seenArgs[0].args, ["-p", "--output-format", "json", "--model", "sonnet"]);
});

test("generateIssueCopy throws when the model output fails validation", async () => {
  const run = async () => JSON.stringify({ result: JSON.stringify({ lede: validCopy.lede, stories: [] }) });
  await assert.rejects(
    generateIssueCopy({ date: "2026-07-11", items, run }),
    /LLM copy rejected/,
  );
});
