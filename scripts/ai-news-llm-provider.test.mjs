import assert from "node:assert/strict";
import test from "node:test";

import { CallBudgetExceeded as ErrorsCallBudgetExceeded, DailyBudgetExhausted } from "./lib/news-llm/errors.mjs";
import { MAX_CALLS_PER_RUN, MAX_NEURONS_PER_RUN } from "./lib/news-llm/limits.mjs";
import { DEFAULT_MODELS, modelsFor } from "./lib/news-llm/models.mjs";
import { CallBudgetExceeded, createChat } from "./lib/news-llm/provider.mjs";
import { claudeArgs, createClaudeChat } from "./lib/news-llm/provider-claude.mjs";
import { silent } from "./ai-news-llm-fixtures.mjs";

const baseEnv = { AI_NEWS_LLM_PROVIDER: "http", AI_NEWS_WRITER_MODELS: "w1,w2", AI_NEWS_REVIEWER_MODELS: "r1,r2" };
const request = (extra = {}) => ({ role: "writer", system: "S", user: "U", ...extra });

test("claudeArgs keeps the isolation flags and the model", () => {
  assert.deepEqual(claudeArgs("sonnet"), [
    "-p", "--output-format", "json", "--model", "sonnet",
    "--tools", "",
    "--setting-sources", "",
    "--strict-mcp-config",
    "--disable-slash-commands",
    "--no-session-persistence",
  ]);
});

test("the claude chat sends system and user text on stdin and unwraps the result", async () => {
  const seen = [];
  const chat = createClaudeChat({ bin: "fake-claude", run: async (options) => { seen.push(options); return JSON.stringify({ result: "answer" }); } });
  assert.deepEqual(await chat({ model: "sonnet", system: "SYS", user: "USR" }), { text: "answer", usage: null });
  assert.equal(seen[0].bin, "fake-claude");
  assert.deepEqual(seen[0].args, claudeArgs("sonnet"));
  assert.equal(seen[0].input, "SYS\n\nUSR");
  assert.equal(seen[0].timeoutMs, 240_000);
});

test("the claude chat returns the raw output when the envelope has no string result", async () => {
  const raw = JSON.stringify({ result: { not: "text" } });
  const chat = createClaudeChat({ run: async () => raw });
  assert.equal((await chat({ model: "m", system: "s", user: "u" })).text, raw);
});

test("model defaults per provider and comma separated overrides", () => {
  assert.deepEqual(modelsFor("http", {}), DEFAULT_MODELS.http);
  assert.deepEqual(modelsFor("claude", {}), DEFAULT_MODELS.claude);
  assert.deepEqual(modelsFor("http", { AI_NEWS_WRITER_MODELS: " a , ,b ", AI_NEWS_REVIEWER_MODELS: "c" }), { writer: ["a", "b"], reviewer: ["c"] });
  assert.deepEqual(modelsFor("http", { AI_NEWS_WRITER_MODELS: " , ", AI_NEWS_REVIEWER_MODELS: "" }), DEFAULT_MODELS.http);
  assert.throws(() => modelsFor("nope", {}), /Unknown AI_NEWS_LLM_PROVIDER: nope/);
});

test("the provider is chosen by AI_NEWS_LLM_PROVIDER, else by the presence of a url", () => {
  const call = async () => ({ text: "x" });
  assert.equal(createChat({ env: { AI_NEWS_LLM_URL: "https://relay.invalid/x" }, call }).kind, "http");
  assert.equal(createChat({ env: {}, call }).kind, "claude");
  assert.equal(createChat({ env: { AI_NEWS_LLM_PROVIDER: "claude", AI_NEWS_LLM_URL: "https://relay.invalid/x" }, call }).kind, "claude");
  assert.throws(() => createChat({ env: { AI_NEWS_LLM_PROVIDER: "other" }, call }), /Unknown AI_NEWS_LLM_PROVIDER/);
  assert.throws(() => createChat({ env: { AI_NEWS_LLM_URL: "https://relay.invalid/x" } }), /required for the http provider/);
});

test("AI_NEWS_WRITER_MODELS and AI_NEWS_REVIEWER_MODELS override the model chains", () => {
  const { models } = createChat({ env: baseEnv, call: async () => ({ text: "x" }) });
  assert.deepEqual(models, { writer: ["w1", "w2"], reviewer: ["r1", "r2"] });
});

test("the next model is used when the first fails, and the failure is recorded", async () => {
  const used = [];
  const call = async ({ model }) => {
    used.push(model);
    if (model === "w1") throw new Error("boom");
    return { text: "ok", usage: { neurons: 2 } };
  };
  const { chat, stats } = createChat({ env: baseEnv, call, log: silent });
  assert.deepEqual(await chat(request()), { text: "ok", model: "w2" });
  assert.deepEqual(used, ["w1", "w2"]);
  assert.equal(stats.calls, 2);
  assert.deepEqual(stats.failures, ["writer w1: boom"]);
});

test("every model failing reports the last error", async () => {
  const { chat } = createChat({ env: baseEnv, call: async ({ model }) => { throw new Error(`down ${model}`); }, log: silent });
  await assert.rejects(chat(request()), /Every writer model failed: down w2/);
});

test("the reviewer avoids the writer's model when another is configured", async () => {
  const used = [];
  const { chat } = createChat({ env: baseEnv, call: async ({ model }) => { used.push(model); return { text: "ok" }; }, log: silent });
  assert.equal((await chat(request({ role: "reviewer", avoid: "r1" }))).model, "r2");
  assert.equal((await chat(request({ role: "reviewer", avoid: "r2" }))).model, "r1");
  assert.deepEqual(used, ["r2", "r1"]);
});

test("the reviewer uses the writer's model when it is the only one configured", async () => {
  const env = { ...baseEnv, AI_NEWS_REVIEWER_MODELS: "r1" };
  const { chat } = createChat({ env, call: async () => ({ text: "ok" }), log: silent });
  assert.equal((await chat(request({ role: "reviewer", avoid: "r1" }))).model, "r1");
});

test("a reviewer fallback skips the avoided model entirely", async () => {
  const used = [];
  const env = { ...baseEnv, AI_NEWS_REVIEWER_MODELS: "r1,r2,r3" };
  const { chat } = createChat({ env, call: async ({ model }) => { used.push(model); if (model === "r2") throw new Error("x"); return { text: "ok" }; }, log: silent });
  assert.equal((await chat(request({ role: "reviewer", avoid: "r1" }))).model, "r3");
  assert.deepEqual(used, ["r2", "r3"]);
});

test("CallBudgetExceeded is thrown once MAX_CALLS_PER_RUN calls were made", async () => {
  const { chat, stats } = createChat({ env: baseEnv, call: async () => ({ text: "ok" }), log: silent });
  for (let index = 0; index < MAX_CALLS_PER_RUN; index += 1) await chat(request());
  assert.equal(stats.calls, MAX_CALLS_PER_RUN);
  await assert.rejects(chat(request()), (error) => error instanceof CallBudgetExceeded && /ceiling/.test(error.message));
  assert.equal(stats.calls, MAX_CALLS_PER_RUN);
});

test("failed attempts count against the call budget", async () => {
  const { chat, stats } = createChat({ env: baseEnv, call: async () => { throw new Error("down"); }, log: silent });
  for (let index = 0; index < MAX_CALLS_PER_RUN / 2; index += 1) await assert.rejects(chat(request()), /Every writer model failed/);
  assert.equal(stats.calls, MAX_CALLS_PER_RUN);
  await assert.rejects(chat(request()), CallBudgetExceeded);
});

test("stats count calls and sum neurons, treating missing usage as zero", async () => {
  const usages = [{ neurons: 10.5 }, undefined, { neurons: "4" }, { other: 1 }];
  const { chat, stats } = createChat({ env: baseEnv, call: async () => ({ text: "ok", usage: usages.shift() }), log: silent });
  for (let index = 0; index < 4; index += 1) await chat(request());
  assert.equal(stats.calls, 4);
  assert.equal(stats.neurons, 14.5);
  assert.equal(stats.budget, null);
  assert.deepEqual(stats.failures, []);
});

test("stats keep the reported tokens per model and the relay's latest daily total", async () => {
  const answers = [
    { text: "ok", usage: { prompt_tokens: 100, completion_tokens: 20, neurons: 5 }, budget: { spent: 5, limit: 8000 } },
    { text: "ok", usage: { input_tokens: 50, output_tokens: 10, neurons: 2 }, budget: { spent: 7, limit: 8000 } },
    { text: "ok", usage: null, budget: { spent: "many", limit: 8000 } },
  ];
  const { chat, stats } = createChat({ env: baseEnv, call: async () => answers.shift(), log: silent });
  const first = await chat(request());
  await chat(request());
  await chat(request());
  assert.deepEqual(stats.byModel, { [first.model]: { answers: 3, inputTokens: 150, outputTokens: 30, neurons: 7 } });
  // A total that is not a number is ignored; the last good one stays.
  assert.deepEqual(stats.budget, { spent: 7, limit: 8000 });
});

test("maxTokens is passed through to the provider call", async () => {
  const seen = [];
  const { chat } = createChat({ env: baseEnv, call: async (options) => { seen.push(options); return { text: "ok" }; }, log: silent });
  await chat(request({ maxTokens: 123 }));
  assert.deepEqual(seen[0], { model: "w1", system: "S", user: "U", maxTokens: 123 });
});

test("errors.mjs and provider.mjs export the same CallBudgetExceeded", () => {
  assert.equal(CallBudgetExceeded, ErrorsCallBudgetExceeded);
  assert.ok(new DailyBudgetExhausted("x") instanceof CallBudgetExceeded);
});

test("a budget error from the provider is rethrown at once without trying the next model", async () => {
  for (const ErrorClass of [CallBudgetExceeded, DailyBudgetExhausted]) {
    const used = [];
    const { chat, stats } = createChat({ env: baseEnv, call: async ({ model }) => { used.push(model); throw new ErrorClass("budget"); }, log: silent });
    await assert.rejects(chat(request()), (error) => error instanceof ErrorClass);
    assert.deepEqual(used, ["w1"]);
    assert.deepEqual(stats.failures, []);
  }
});

test("the neuron ceiling for one run stops the next call", async () => {
  const { chat, stats } = createChat({ env: baseEnv, call: async () => ({ text: "ok", usage: { neurons: MAX_NEURONS_PER_RUN - 1 } }), log: silent });
  await chat(request());
  await chat(request());
  assert.equal(stats.neurons, 2 * (MAX_NEURONS_PER_RUN - 1));
  assert.equal(stats.calls, 2);
  await assert.rejects(chat(request()), (error) => error instanceof CallBudgetExceeded && /Neuron ceiling/.test(error.message));
  assert.equal(stats.calls, 2);
});

test("exactly reaching the neuron ceiling blocks the next call, one under does not", async () => {
  let neurons = MAX_NEURONS_PER_RUN;
  const { chat } = createChat({ env: baseEnv, call: async () => ({ text: "ok", usage: { neurons } }), log: silent });
  await chat(request());
  await assert.rejects(chat(request()), CallBudgetExceeded);
  neurons = MAX_NEURONS_PER_RUN - 1;
  const second = createChat({ env: baseEnv, call: async () => ({ text: "ok", usage: { neurons } }), log: silent });
  await second.chat(request());
  assert.equal((await second.chat(request())).text, "ok");
});

test("every HTTP attempt, retries included, counts against MAX_CALLS_PER_RUN", async () => {
  let requests = 0;
  const fetchImpl = async () => {
    requests += 1;
    return new Response("busy", { status: 503 });
  };
  const waits = [];
  const { chat, stats } = createChat({
    env: { ...baseEnv, AI_NEWS_LLM_URL: "https://relay.invalid/v1/chat/completions", AI_NEWS_LLM_KEY: "k" },
    http: { fetchImpl, wait: async (ms) => { waits.push(ms); } },
    log: silent,
  });
  await assert.rejects(chat(request()), /Every writer model failed/);
  // One model chain of two models, each tried with three attempts.
  assert.equal(requests, 6);
  assert.equal(stats.calls, 6);
  while (requests < MAX_CALLS_PER_RUN) {
    await chat(request()).catch((error) => {
      if (error instanceof CallBudgetExceeded) return;
      assert.match(error.message, /Every writer model failed|ceiling/);
    });
    if (stats.calls >= MAX_CALLS_PER_RUN) break;
  }
  assert.equal(stats.calls, MAX_CALLS_PER_RUN);
  assert.equal(requests, MAX_CALLS_PER_RUN);
  await assert.rejects(chat(request()), (error) => error instanceof CallBudgetExceeded && /ceiling/.test(error.message));
  assert.equal(requests, MAX_CALLS_PER_RUN, "no request is sent once the ceiling is reached");
});