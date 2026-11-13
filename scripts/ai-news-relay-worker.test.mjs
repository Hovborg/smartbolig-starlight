import assert from "node:assert/strict";
import { timingSafeEqual } from "node:crypto";
import test from "node:test";

// Node has no crypto.subtle.timingSafeEqual (Workers do). Install a stand-in
// before the worker modules run.
if (typeof crypto.subtle.timingSafeEqual !== "function") {
  Object.defineProperty(crypto.subtle, "timingSafeEqual", {
    configurable: true,
    value: (a, b) => {
      if (a.byteLength !== b.byteLength) throw new TypeError("Input buffers must have the same byte length");
      return timingSafeEqual(a, b);
    },
  });
}

const { answerText, finishReason } = await import("../workers/news-llm/src/answer.js");
const { authorized } = await import("../workers/news-llm/src/auth.js");
const { dailyBudget, dayKey, hasRoom, recordSpend, spentToday } = await import("../workers/news-llm/src/budget.js");
const { default: worker } = await import("../workers/news-llm/src/index.js");
const { allowedModels, parseRequest } = await import("../workers/news-llm/src/request.js");

const SECRET = "test-secret-".padEnd(40, "x");
const MODEL = "@cf/test/model-a";
const models = new Set([MODEL, "@cf/test/model-b"]);
const bearer = (token) => ({ authorization: `Bearer ${token}` });
const post = (body, headers = bearer(SECRET), path = "/v1/chat/completions") => new Request(`https://relay.invalid${path}`, {
  method: "POST",
  headers,
  body: typeof body === "string" ? body : JSON.stringify(body),
});
const chatBody = (extra = {}) => ({ model: MODEL, messages: [{ role: "user", content: "hello" }], ...extra });
const parse = (body) => parseRequest(post(body), models);

test("authorized accepts only the exact bearer secret", async () => {
  assert.equal(await authorized(post("{}"), SECRET), true);
  assert.equal(await authorized(post("{}", bearer("wrong".padEnd(40, "x"))), SECRET), false);
  assert.equal(await authorized(post("{}", bearer(`${SECRET}x`)), SECRET), false);
  assert.equal(await authorized(post("{}", bearer("")), SECRET), false);
});

test("authorized rejects a missing or non-bearer header", async () => {
  assert.equal(await authorized(post("{}", {}), SECRET), false);
  assert.equal(await authorized(post("{}", { authorization: `Basic ${SECRET}` }), SECRET), false);
  assert.equal(await authorized(post("{}", { authorization: SECRET }), SECRET), false);
});

test("authorized rejects a missing, short or non-string configured secret", async () => {
  const short = "s".repeat(31);
  assert.equal(await authorized(post("{}", bearer(short)), short), false);
  assert.equal(await authorized(post("{}", bearer("")), ""), false);
  assert.equal(await authorized(post("{}", bearer("undefined")), undefined), false);
  assert.equal(await authorized(post("{}", bearer("123")), 123), false);
  assert.equal(await authorized(post("{}", bearer("s".repeat(32))), "s".repeat(32)), true);
});

test("allowedModels parses a comma separated list", () => {
  assert.deepEqual([...allowedModels({ ALLOWED_MODELS: " a , b,, " })], ["a", "b"]);
  assert.deepEqual([...allowedModels({})], []);
});

test("parseRequest accepts a valid body and applies defaults", async () => {
  assert.deepEqual(await parse(chatBody()), { model: MODEL, messages: [{ role: "user", content: "hello" }], max_tokens: 1200, temperature: 0.2 });
});

test("parseRequest keeps only role and content and ignores other top-level keys", async () => {
  const result = await parse(chatBody({ stream: true, tools: [1], messages: [{ role: "system", content: "s", extra: "x" }, { role: "assistant", content: "a" }] }));
  assert.deepEqual(result.messages, [{ role: "system", content: "s" }, { role: "assistant", content: "a" }]);
  assert.equal("stream" in result, false);
  assert.equal("tools" in result, false);
});

test("parseRequest limits the body size in bytes", async () => {
  const filler = (character, count) => chatBody({ messages: [{ role: "user", content: character.repeat(count) }] });
  await assert.doesNotReject(parse(filler("a", 90_000)));
  await assert.rejects(parse(filler("a", 100_000)), /body too large/);
  await assert.rejects(parse(filler("€", 40_000)), /body too large/);
});

test("parseRequest rejects broken JSON, unknown models and a missing model", async () => {
  await assert.rejects(parse("{not json"), SyntaxError);
  await assert.rejects(parse(chatBody({ model: "@cf/other/model" })), /model not allowed/);
  await assert.rejects(parse({ messages: chatBody().messages }), /model not allowed/);
  await assert.rejects(parse("null"), /model not allowed/);
});

test("parseRequest bounds the number and shape of messages", async () => {
  const user = { role: "user", content: "x" };
  await assert.rejects(parse(chatBody({ messages: [] })), /non-empty array/);
  await assert.rejects(parse(chatBody({ messages: "hi" })), /non-empty array/);
  await assert.rejects(parse(chatBody({ messages: Array(9).fill(user) })), /non-empty array/);
  await assert.doesNotReject(parse(chatBody({ messages: Array(8).fill(user) })));
  for (const message of [null, "text", { role: "tool", content: "x" }, { role: "user" }, { role: "user", content: 5 }, { role: "user", content: "  " }]) {
    await assert.rejects(parse(chatBody({ messages: [message] })), /invalid message/);
  }
});

test("parseRequest clamps max_tokens to 16..8000 and ignores non-integers", async () => {
  assert.equal((await parse(chatBody({ max_tokens: 5 }))).max_tokens, 16);
  assert.equal((await parse(chatBody({ max_tokens: 16 }))).max_tokens, 16);
  assert.equal((await parse(chatBody({ max_tokens: 4000 }))).max_tokens, 4000);
  assert.equal((await parse(chatBody({ max_tokens: 8000 }))).max_tokens, 8000);
  assert.equal((await parse(chatBody({ max_tokens: 1_000_000 }))).max_tokens, 8000);
  assert.equal((await parse(chatBody({ max_tokens: 1.5 }))).max_tokens, 1200);
  assert.equal((await parse(chatBody({ max_tokens: "900" }))).max_tokens, 1200);
});

test("parseRequest clamps temperature to 0..1 and ignores non-numbers", async () => {
  assert.equal((await parse(chatBody({ temperature: 5 }))).temperature, 1);
  assert.equal((await parse(chatBody({ temperature: -3 }))).temperature, 0);
  assert.equal((await parse(chatBody({ temperature: 0.7 }))).temperature, 0.7);
  assert.equal((await parse(chatBody({ temperature: "0.9" }))).temperature, 0.2);
});

test("parseRequest passes only the known reasoning_effort values", async () => {
  for (const effort of ["low", "medium", "high"]) assert.equal((await parse(chatBody({ reasoning_effort: effort }))).reasoning_effort, effort);
  for (const effort of ["extreme", "HIGH", 3, null]) assert.equal("reasoning_effort" in (await parse(chatBody({ reasoning_effort: effort }))), false);
});

test("answerText and finishReason understand both Workers AI result shapes", () => {
  assert.equal(answerText("plain"), "plain");
  assert.equal(answerText({ response: "r" }), "r");
  assert.equal(answerText({ choices: [{ message: { content: "c" } }] }), "c");
  assert.equal(answerText({ choices: [{ message: { content: [{ type: "text", text: "a" }, { type: "image" }, { type: "text", text: "b" }] } }] }), "ab");
  assert.equal(answerText({}), "");
  assert.equal(answerText(null), "");
  assert.equal(finishReason({ choices: [{ finish_reason: "length" }] }), "length");
  assert.equal(finishReason({ stop_reason: "end_turn" }), "end_turn");
  assert.equal(finishReason({}), "stop");
});

test("budget helpers: day key, configured limit, room check and recorded spend", async () => {
  assert.equal(dayKey(new Date("2026-11-13T23:59:59Z")), "neurons:2026-11-13");
  assert.equal(dailyBudget({}), 8000);
  assert.equal(dailyBudget({ DAILY_NEURON_BUDGET: "1500" }), 1500);
  assert.equal(dailyBudget({ DAILY_NEURON_BUDGET: "0" }), 8000);
  assert.equal(dailyBudget({ DAILY_NEURON_BUDGET: "abc" }), 8000);
  assert.equal(hasRoom(7300, 8000), true);
  assert.equal(hasRoom(7301, 8000), false);

  const now = new Date("2026-11-13T10:00:00Z");
  const store = new Map();
  const kv = { get: async (key) => store.get(key) ?? null, put: async (key, value, options) => { store.set(key, value); store.options = options; } };
  assert.equal(await spentToday(kv, now), 0);
  assert.equal(await recordSpend(kv, 100, { neurons: 12.2 }, now), 113);
  assert.equal(await spentToday(kv, now), 113);
  assert.equal(store.options.expirationTtl, 3 * 86_400);
  assert.equal(await recordSpend(kv, 113, undefined, now), 813);
  assert.equal(await recordSpend(kv, 0, { neurons: -4 }, now), 700);
  store.set(dayKey(now), "garbage");
  assert.equal(await spentToday(kv, now), 0);
});

function makeEnv({ spent = null, limited = false, run, put, get, withBudget = true, extra = {} } = {}) {
  const log = { limit: [], run: [], put: [], get: [] };
  const env = {
    NEWS_LLM_SECRET: SECRET,
    ALLOWED_MODELS: `${MODEL}`,
    CALL_LIMITER: { limit: async (options) => { log.limit.push(options); return { success: !limited }; } },
    AI: { run: async (model, options) => { log.run.push({ model, options }); return run ? run(model, options) : { response: "answer", usage: { neurons: 50 } }; } },
    ...extra,
  };
  if (withBudget) {
    env.BUDGET = {
      get: async (key) => { log.get.push(key); if (get) return get(key); return spent; },
      put: async (key, value, options) => { log.put.push({ key, value, options }); if (put) return put(key, value, options); },
    };
  }
  return { env, log };
}
const call = async (request, env) => {
  const response = await worker.fetch(request, env);
  return { status: response.status, body: await response.json() };
};

test("other paths and methods give 404 before any check", async () => {
  const { env, log } = makeEnv();
  assert.equal((await call(post(chatBody(), bearer(SECRET), "/v1/models"), env)).status, 404);
  assert.equal((await call(new Request("https://relay.invalid/v1/chat/completions"), env)).status, 404);
  assert.deepEqual([log.limit.length, log.run.length], [0, 0]);
});

test("a bad secret gives 401 before the rate limiter or the model is touched", async () => {
  const { env, log } = makeEnv();
  const result = await call(post(chatBody(), bearer("nope".padEnd(40, "x"))), env);
  assert.deepEqual(result, { status: 401, body: { error: "unauthorized" } });
  assert.deepEqual([log.limit.length, log.get.length, log.run.length], [0, 0, 0]);
});

test("a limited caller gets 429 without a budget read or a model call", async () => {
  const { env, log } = makeEnv({ limited: true });
  assert.deepEqual(await call(post(chatBody()), env), { status: 429, body: { error: "rate_limited" } });
  assert.deepEqual(log.limit, [{ key: "news" }]);
  assert.deepEqual([log.get.length, log.run.length], [0, 0]);
});

test("a bad body gives 400 with a short detail and no model call", async () => {
  for (const body of ["{not json", chatBody({ model: "@cf/other/model" }), chatBody({ messages: [] })]) {
    const { env, log } = makeEnv();
    const { status, body: answer } = await call(post(body), env);
    assert.equal(status, 400);
    assert.equal(answer.error, "bad_request");
    assert.ok(answer.detail.length > 0 && answer.detail.length <= 200);
    assert.equal(log.run.length, 0);
  }
});

test("a good request returns the OpenAI shaped answer and records the spend", async () => {
  const { env, log } = makeEnv({ spent: "1000" });
  const { status, body } = await call(post(chatBody({ max_tokens: 300, reasoning_effort: "low" })), env);
  assert.equal(status, 200);
  assert.deepEqual(body, {
    model: MODEL,
    choices: [{ index: 0, message: { role: "assistant", content: "answer" }, finish_reason: "stop" }],
    usage: { neurons: 50 },
    budget: { spent: 1050, limit: 8000 },
  });
  assert.deepEqual(log.run, [{ model: MODEL, options: { reasoning_effort: "low", messages: [{ role: "user", content: "hello" }], max_tokens: 300, temperature: 0.2, stream: false } }]);
  assert.equal(log.put.length, 1);
  assert.equal(log.put[0].value, "1050");
  assert.match(log.put[0].key, /^neurons:\d{4}-\d{2}-\d{2}$/);
});

test("the response is not cacheable JSON", async () => {
  const { env } = makeEnv();
  const response = await worker.fetch(post(chatBody()), env);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(response.headers.get("content-type"), /application\/json/);
});

test("a throwing model call gives 502, a bounded detail, and is still charged", async () => {
  const { env, log } = makeEnv({ spent: "200", run: () => { throw new Error(`boom ${"x".repeat(500)}`); } });
  const { status, body } = await call(post(chatBody()), env);
  assert.equal(status, 502);
  assert.equal(body.error, "upstream_failed");
  assert.ok(body.detail.startsWith("boom") && body.detail.length === 300);
  assert.equal(log.put.length, 1);
  assert.equal(log.put[0].value, "900");
});

test("a missing budget binding gives 503 and no model call", async () => {
  const { env, log } = makeEnv({ withBudget: false });
  assert.deepEqual(await call(post(chatBody()), env), { status: 503, body: { error: "budget_unavailable" } });
  assert.equal(log.run.length, 0);
});

test("a failing budget read gives 503 and no model call", async () => {
  const { env, log } = makeEnv({ get: () => { throw new Error("kv down"); } });
  assert.deepEqual(await call(post(chatBody()), env), { status: 503, body: { error: "budget_unavailable" } });
  assert.deepEqual([log.run.length, log.put.length], [0, 0]);
});

test("a used up daily budget gives 429 daily_budget_exhausted without a model call or a write", async () => {
  const { env, log } = makeEnv({ spent: "7400" });
  assert.deepEqual(await call(post(chatBody()), env), { status: 429, body: { error: "daily_budget_exhausted", budget: { spent: 7400, limit: 8000 } } });
  assert.deepEqual([log.run.length, log.put.length], [0, 0]);
});

test("the last call that fits the budget still runs", async () => {
  assert.equal((await call(post(chatBody()), makeEnv({ spent: "7300" }).env)).status, 200);
  assert.equal((await call(post(chatBody()), makeEnv({ spent: "7301" }).env)).status, 429);
});

test("DAILY_NEURON_BUDGET overrides the default ceiling", async () => {
  const { env, log } = makeEnv({ spent: "400", extra: { DAILY_NEURON_BUDGET: "1000" } });
  const { status, body } = await call(post(chatBody()), env);
  assert.equal(status, 429);
  assert.deepEqual(body.budget, { spent: 400, limit: 1000 });
  assert.equal(log.run.length, 0);
});

test("a call without usage is charged the unknown-call amount", async () => {
  const { env, log } = makeEnv({ spent: "0", run: () => ({ response: "x" }) });
  const { body } = await call(post(chatBody()), env);
  assert.equal(body.usage, null);
  assert.equal(log.put[0].value, "700");
});

test("a failing budget write after the model call gives 503", async () => {
  const { env, log } = makeEnv({ put: () => { throw new Error("kv write failed"); } });
  assert.deepEqual(await call(post(chatBody()), env), { status: 503, body: { error: "budget_unavailable" } });
  assert.equal(log.run.length, 1);
});
