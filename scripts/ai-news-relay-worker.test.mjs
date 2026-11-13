import assert from "node:assert/strict";
import { timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
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
const { dailyBudget, dayKey } = await import("../workers/news-llm/src/budget.js");
const { BudgetCounter } = await import("../workers/news-llm/src/counter.js");
const { default: worker } = await import("../workers/news-llm/src/index.js");
const { reserve, settle } = await import("../workers/news-llm/src/ledger.js");
const { actualCost, isPriced, neuronsFor, NEURONS_PER_MILLION_TOKENS, worstCase } = await import("../workers/news-llm/src/prices.js");
const { allowedModels, parseRequest } = await import("../workers/news-llm/src/request.js");
const { DEFAULT_MODELS } = await import("./lib/news-llm/models.mjs");

const SECRET = "test-secret-".padEnd(40, "x");
const MODEL = "@cf/google/gemma-4-26b-a4b-it";
const UNPRICED = "@cf/test/unpriced";
const models = new Set([MODEL, "@cf/openai/gpt-oss-120b", UNPRICED]);
const bearer = (token) => ({ authorization: `Bearer ${token}` });
const post = (body, headers = bearer(SECRET), path = "/v1/chat/completions") => new Request(`https://relay.invalid${path}`, {
  method: "POST",
  headers,
  body: typeof body === "string" ? body : JSON.stringify(body),
});
const chatBody = (extra = {}) => ({ model: MODEL, messages: [{ role: "user", content: "hello" }], ...extra });
const parse = async (body) => (await parseRequest(post(body), models)).input;

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
  await assert.doesNotReject(parse(filler("a", 45_000)));
  await assert.rejects(parse(filler("a", 50_000)), /body too large/);
  await assert.rejects(parse(filler("€", 20_000)), /body too large/);
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

test("parseRequest reports the body size and refuses a model without a price", async () => {
  const body = JSON.stringify(chatBody({ messages: [{ role: "user", content: "æøå" }] }));
  const parsed = await parseRequest(post(body), models);
  assert.equal(parsed.bodyBytes, new TextEncoder().encode(body).length);
  assert.ok(parsed.bodyBytes > body.length);
  await assert.rejects(parse(chatBody({ model: UNPRICED })), /model has no price/);
});

test("prices: neurons from tokens, the worst case and the reported cost", () => {
  assert.equal(neuronsFor(MODEL, 1_000_000, 0), 9091);
  assert.equal(neuronsFor(MODEL, 0, 1_000_000), 27273);
  assert.equal(neuronsFor(MODEL, 1000, 1000), 37);
  assert.equal(neuronsFor(MODEL, 0, 0), 0);
  assert.equal(worstCase(MODEL, 20_000, 7000), neuronsFor(MODEL, 20_000, 7000));
  assert.equal(actualCost(MODEL, { prompt_tokens: 1000, completion_tokens: 1000 }), 37);
  assert.equal(actualCost(MODEL, { input_tokens: 1000, output_tokens: 1000 }), 37);
  for (const usage of [undefined, null, {}, { prompt_tokens: 5 }, { prompt_tokens: "x", completion_tokens: 1 }, { prompt_tokens: -1, completion_tokens: 1 }]) {
    assert.equal(actualCost(MODEL, usage), null);
  }
  // Zeros, empty strings, numeric strings and booleans are missing counts, not a free call.
  for (const usage of [
    { prompt_tokens: 0, completion_tokens: 0 },
    { prompt_tokens: 1000, completion_tokens: 0 },
    { prompt_tokens: 0, completion_tokens: 1000 },
    { prompt_tokens: "", completion_tokens: "" },
    { prompt_tokens: "1000", completion_tokens: "1000" },
    { prompt_tokens: true, completion_tokens: true },
    { prompt_tokens: Infinity, completion_tokens: 1 },
    { input_tokens: 0, output_tokens: 0 },
  ]) {
    assert.equal(actualCost(MODEL, usage), null);
  }
  // Reasoning tokens that only show up in the total are charged as output.
  assert.equal(actualCost(MODEL, { prompt_tokens: 1000, completion_tokens: 1000, total_tokens: 2000 }), 37);
  assert.equal(actualCost(MODEL, { prompt_tokens: 1000, completion_tokens: 1000, total_tokens: 5000 }), neuronsFor(MODEL, 1000, 4000));
  assert.equal(actualCost(MODEL, { prompt_tokens: 1000, completion_tokens: 1000, total_tokens: 1500 }), 37);
  assert.equal(actualCost(MODEL, { prompt_tokens: 1000, completion_tokens: 1000, total_tokens: 0 }), 37);
  assert.equal(isPriced(MODEL), true);
  assert.equal(isPriced(UNPRICED), false);
  assert.equal(isPriced("constructor"), false);
});

test("every model the relay allows has a price, and the news job only asks for allowed models", () => {
  const config = readFileSync(new URL("../workers/news-llm/wrangler.jsonc", import.meta.url), "utf8");
  const allowed = allowedModels({ ALLOWED_MODELS: config.match(/"ALLOWED_MODELS":\s*"([^"]+)"/)[1] });
  assert.ok(allowed.size > 0);
  for (const model of allowed) assert.equal(isPriced(model), true, model);
  for (const model of [...DEFAULT_MODELS.http.writer, ...DEFAULT_MODELS.http.reviewer]) assert.equal(allowed.has(model), true, model);
  for (const price of Object.values(NEURONS_PER_MILLION_TOKENS)) assert.ok(price.input > 0 && price.output > 0);
});

test("the day key is the UTC date and the limit comes from DAILY_NEURON_BUDGET", () => {
  assert.equal(dayKey(new Date("2026-11-13T23:59:59Z")), "2026-11-13");
  assert.equal(dailyBudget({}), 8000);
  assert.equal(dailyBudget({ DAILY_NEURON_BUDGET: "1500" }), 1500);
  assert.equal(dailyBudget({ DAILY_NEURON_BUDGET: "0" }), 8000);
  assert.equal(dailyBudget({ DAILY_NEURON_BUDGET: "abc" }), 8000);
});

// Stand-in for a Durable Object's storage.
function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    get: async (key) => map.get(key),
    put: async (key, value) => { map.set(key, value); },
    list: async () => new Map(map),
    delete: async (keys) => { for (const key of [keys].flat()) map.delete(key); },
  };
}
const DAY = "2026-11-13";

test("ledger: a reservation is booked up to the limit and refused above it", async () => {
  const storage = fakeStorage();
  assert.deepEqual(await reserve(storage, { day: DAY, cost: 600.2, limit: 1000 }), { ok: true, spent: 601 });
  assert.deepEqual(await reserve(storage, { day: DAY, cost: 399, limit: 1000 }), { ok: true, spent: 1000 });
  assert.deepEqual(await reserve(storage, { day: DAY, cost: 1, limit: 1000 }), { ok: false, spent: 1000 });
  assert.equal(storage.map.get(DAY), 1000);
});

test("ledger: settling swaps the reservation for the real cost, up or down, never below zero", async () => {
  const storage = fakeStorage({ [DAY]: 1000 });
  assert.deepEqual(await settle(storage, { day: DAY, reserved: 400, actual: 150 }), { spent: 750 });
  assert.deepEqual(await settle(storage, { day: DAY, reserved: 100, actual: 130 }), { spent: 780 });
  assert.deepEqual(await settle(storage, { day: DAY, reserved: 5000, actual: 0 }), { spent: 0 });
});

test("ledger: bad input is refused and a garbage stored value counts as zero", async () => {
  const storage = fakeStorage({ [DAY]: "garbage" });
  for (const args of [{ day: "today", cost: 1, limit: 10 }, { day: DAY, cost: -1, limit: 10 }, { day: DAY, cost: "1", limit: 10 }, { day: DAY, cost: 1 }]) {
    await assert.rejects(reserve(storage, args), /invalid reservation/);
  }
  for (const args of [{ day: DAY, reserved: 1 }, { day: DAY, reserved: -1, actual: 1 }, { day: "x", reserved: 1, actual: 1 }]) {
    await assert.rejects(settle(storage, args), /invalid settlement/);
  }
  assert.deepEqual(await reserve(storage, { day: DAY, cost: 7, limit: 10 }), { ok: true, spent: 7 });
});

test("ledger: days older than three days are dropped, newer ones kept", async () => {
  const storage = fakeStorage({ "2026-11-09": 5, "2026-11-10": 6, "2026-11-12": 7, other: 1 });
  await reserve(storage, { day: DAY, cost: 1, limit: 10 });
  assert.deepEqual([...storage.map.keys()].sort(), ["2026-11-10", "2026-11-12", DAY, "other"].sort());
});

test("counter: runs the two ledger operations and nothing else", async () => {
  const storage = fakeStorage();
  const counter = new BudgetCounter({ storage });
  const ask = async (body) => {
    const response = await counter.fetch(new Request("https://budget.internal/", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));
    return { status: response.status, body: await response.json() };
  };
  assert.deepEqual(await ask({ op: "reserve", day: DAY, cost: 10, limit: 100 }), { status: 200, body: { ok: true, spent: 10 } });
  assert.deepEqual(await ask({ op: "settle", day: DAY, reserved: 10, actual: 4 }), { status: 200, body: { spent: 4 } });
  assert.equal((await ask({ op: "constructor" })).status, 400);
  assert.equal((await ask({ op: "reserve", day: DAY, cost: -1, limit: 100 })).status, 500);
  assert.equal((await ask("{not json")).status, 500);
  assert.equal(storage.map.get(DAY), 4);
});

// A Durable Object handles one request at a time. The stand-in namespace
// keeps that order with a promise chain, and runs the real counter.
function fakeCounter({ spent = 0, fail } = {}) {
  const storage = fakeStorage(spent ? { [dayKey()]: spent } : {});
  const counter = new BudgetCounter({ storage });
  const log = [];
  let queue = Promise.resolve();
  const namespace = {
    idFromName: (name) => name,
    get: () => ({
      fetch: (url, init) => {
        const body = JSON.parse(init.body);
        log.push(body);
        const failure = fail?.(body);
        if (failure === "error") return Promise.resolve(Response.json({ error: "broken" }, { status: 500 }));
        if (failure) return Promise.reject(new Error("counter down"));
        const answer = queue.then(() => counter.fetch(new Request(url, { method: "POST", body: init.body })));
        queue = answer.catch(() => {});
        return answer;
      },
    }),
  };
  return { namespace, log, spent: () => storage.map.get(dayKey()) ?? 0 };
}

const USAGE = { prompt_tokens: 100, completion_tokens: 50 };
const USAGE_NEURONS = neuronsFor(MODEL, 100, 50);
const reservedFor = (body) => worstCase(MODEL, new TextEncoder().encode(JSON.stringify(body)).length, body.max_tokens ?? 1200);

function makeEnv({ spent = 0, limited = false, run, fail, withCounter = true, extra = {} } = {}) {
  const log = { limit: [], run: [] };
  const counter = fakeCounter({ spent, fail });
  const env = {
    NEWS_LLM_SECRET: SECRET,
    ALLOWED_MODELS: `${MODEL},${UNPRICED}`,
    CALL_LIMITER: { limit: async (options) => { log.limit.push(options); return { success: !limited }; } },
    AI: { run: async (model, options) => { log.run.push({ model, options }); return run ? run(model, options) : { response: "answer", usage: USAGE }; } },
    ...(withCounter ? { BUDGET_COUNTER: counter.namespace } : {}),
    ...extra,
  };
  return { env, log, counter };
}
const call = async (request, env) => {
  const response = await worker.fetch(request, env);
  return { status: response.status, body: await response.json() };
};

test("other paths and methods give 404 before any check", async () => {
  const { env, log, counter } = makeEnv();
  assert.equal((await call(post(chatBody(), bearer(SECRET), "/v1/models"), env)).status, 404);
  assert.equal((await call(new Request("https://relay.invalid/v1/chat/completions"), env)).status, 404);
  assert.deepEqual([log.limit.length, counter.log.length, log.run.length], [0, 0, 0]);
});

test("a bad secret gives 401 before the rate limiter, the counter or the model is touched", async () => {
  const { env, log, counter } = makeEnv();
  const result = await call(post(chatBody(), bearer("nope".padEnd(40, "x"))), env);
  assert.deepEqual(result, { status: 401, body: { error: "unauthorized" } });
  assert.deepEqual([log.limit.length, counter.log.length, log.run.length], [0, 0, 0]);
});

test("a limited caller gets 429 without a reservation or a model call", async () => {
  const { env, log, counter } = makeEnv({ limited: true });
  assert.deepEqual(await call(post(chatBody()), env), { status: 429, body: { error: "rate_limited" } });
  assert.deepEqual(log.limit, [{ key: "news" }]);
  assert.deepEqual([counter.log.length, log.run.length], [0, 0]);
});

test("a bad body gives 400 with a short detail, no reservation and no model call", async () => {
  for (const body of ["{not json", chatBody({ model: "@cf/other/model" }), chatBody({ model: UNPRICED }), chatBody({ messages: [] })]) {
    const { env, log, counter } = makeEnv();
    const { status, body: answer } = await call(post(body), env);
    assert.equal(status, 400);
    assert.equal(answer.error, "bad_request");
    assert.ok(answer.detail.length > 0 && answer.detail.length <= 200);
    assert.deepEqual([counter.log.length, log.run.length], [0, 0]);
  }
});

test("a good request books the worst case, then settles to the real cost and reports it", async () => {
  const request = chatBody({ max_tokens: 300, reasoning_effort: "low" });
  const reserved = reservedFor(request);
  const { env, log, counter } = makeEnv({ spent: 1000 });
  const { status, body } = await call(post(request), env);
  assert.equal(status, 200);
  assert.deepEqual(body, {
    model: MODEL,
    choices: [{ index: 0, message: { role: "assistant", content: "answer" }, finish_reason: "stop" }],
    usage: { ...USAGE, neurons: USAGE_NEURONS },
    budget: { spent: 1000 + USAGE_NEURONS, limit: 8000 },
  });
  assert.deepEqual(log.run, [{ model: MODEL, options: { reasoning_effort: "low", messages: [{ role: "user", content: "hello" }], max_tokens: 300, temperature: 0.2, stream: false } }]);
  assert.deepEqual(counter.log, [
    { op: "reserve", day: dayKey(), cost: reserved, limit: 8000 },
    { op: "settle", day: dayKey(), reserved, actual: USAGE_NEURONS },
  ]);
  assert.ok(reserved > USAGE_NEURONS);
  assert.equal(counter.spent(), 1000 + USAGE_NEURONS);
});

test("the response is not cacheable JSON", async () => {
  const { env } = makeEnv();
  const response = await worker.fetch(post(chatBody()), env);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(response.headers.get("content-type"), /application\/json/);
});

test("the reservation is on the books while the model runs, so overlapping calls are both counted", async () => {
  const request = chatBody();
  const reserved = reservedFor(request);
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const { env, log, counter } = makeEnv({ extra: { DAILY_NEURON_BUDGET: String(reserved * 2) }, run: async () => { await gate; return { response: "answer", usage: USAGE }; } });
  const first = call(post(request), env);
  const second = call(post(request), env);
  while (log.run.length < 2) await new Promise((resolve) => setTimeout(resolve, 1));
  assert.equal(counter.spent(), reserved * 2);
  // A third call has no room, although neither of the first two has finished.
  const third = await call(post(request), env);
  assert.deepEqual(third, { status: 429, body: { error: "daily_budget_exhausted", budget: { spent: reserved * 2, limit: reserved * 2 } } });
  assert.equal(log.run.length, 2);
  release();
  assert.deepEqual([(await first).status, (await second).status], [200, 200]);
  assert.equal(counter.spent(), USAGE_NEURONS * 2);
});

test("a throwing model call gives 502, a bounded detail, and keeps its whole reservation", async () => {
  const reserved = reservedFor(chatBody());
  const { env, counter } = makeEnv({ spent: 200, run: () => { throw new Error(`boom ${"x".repeat(500)}`); } });
  const { status, body } = await call(post(chatBody()), env);
  assert.equal(status, 502);
  assert.equal(body.error, "upstream_failed");
  assert.ok(body.detail.startsWith("boom") && body.detail.length === 300);
  assert.deepEqual(body.budget, { spent: 200 + reserved, limit: 8000 });
  assert.equal(counter.log.length, 1);
  assert.equal(counter.spent(), 200 + reserved);
});

test("an answer that reports zero tokens is charged the worst case", async () => {
  const reserved = reservedFor(chatBody());
  const { env, counter } = makeEnv({ run: () => ({ response: "x", usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } }) });
  const { status, body } = await call(post(chatBody()), env);
  assert.equal(status, 200);
  assert.equal(body.usage.neurons, reserved);
  assert.equal(body.budget.spent, reserved);
  assert.equal(counter.spent(), reserved);
});

test("a missing counter binding gives 503 and no model call", async () => {
  const { env, log } = makeEnv({ withCounter: false });
  assert.deepEqual(await call(post(chatBody()), env), { status: 503, body: { error: "budget_unavailable" } });
  assert.equal(log.run.length, 0);
});

test("a counter that cannot be reached gives 503 and no model call", async () => {
  const { env, log } = makeEnv({ fail: () => true });
  assert.deepEqual(await call(post(chatBody()), env), { status: 503, body: { error: "budget_unavailable" } });
  assert.equal(log.run.length, 0);
});

test("a counter that answers with an error gives 503 and no model call", async () => {
  const { env, log } = makeEnv({ fail: () => "error" });
  assert.deepEqual(await call(post(chatBody()), env), { status: 503, body: { error: "budget_unavailable" } });
  assert.equal(log.run.length, 0);
});

test("a call that does not fit the day's budget gives 429 without a model call or a booking", async () => {
  const reserved = reservedFor(chatBody());
  const spent = 8000 - reserved + 1;
  const { env, log, counter } = makeEnv({ spent });
  assert.deepEqual(await call(post(chatBody()), env), { status: 429, body: { error: "daily_budget_exhausted", budget: { spent, limit: 8000 } } });
  assert.equal(log.run.length, 0);
  assert.equal(counter.spent(), spent);
});

test("the last call that fits the budget still runs", async () => {
  const reserved = reservedFor(chatBody());
  assert.equal((await call(post(chatBody()), makeEnv({ spent: 8000 - reserved }).env)).status, 200);
  assert.equal((await call(post(chatBody()), makeEnv({ spent: 8000 - reserved + 1 }).env)).status, 429);
});

test("DAILY_NEURON_BUDGET overrides the default ceiling", async () => {
  const { env, log } = makeEnv({ spent: 990, extra: { DAILY_NEURON_BUDGET: "1000" } });
  const { status, body } = await call(post(chatBody()), env);
  assert.equal(status, 429);
  assert.deepEqual(body.budget, { spent: 990, limit: 1000 });
  assert.equal(log.run.length, 0);
});

test("an answer without token counts is charged the worst case", async () => {
  const reserved = reservedFor(chatBody());
  const { env, counter } = makeEnv({ run: () => ({ response: "x" }) });
  const { status, body } = await call(post(chatBody()), env);
  assert.equal(status, 200);
  assert.deepEqual(body.usage, { neurons: reserved });
  assert.deepEqual(body.budget, { spent: reserved, limit: 8000 });
  assert.equal(counter.log.length, 1);
  assert.equal(counter.spent(), reserved);
});

test("a model that reports more than the worst case is charged what it reports", async () => {
  const reserved = reservedFor(chatBody({ max_tokens: 16 }));
  const usage = { prompt_tokens: 100_000, completion_tokens: 1 };
  const { env, counter } = makeEnv({ run: () => ({ response: "x", usage }) });
  const { body } = await call(post(chatBody({ max_tokens: 16 })), env);
  assert.ok(body.usage.neurons > reserved);
  assert.equal(counter.spent(), neuronsFor(MODEL, 100_000, 1));
});

test("a failing settlement still returns the answer and leaves the reservation on the books", async () => {
  const reserved = reservedFor(chatBody());
  const { env, counter } = makeEnv({ fail: (body) => body.op === "settle" });
  const { status, body } = await call(post(chatBody()), env);
  assert.equal(status, 200);
  assert.equal(body.usage.neurons, USAGE_NEURONS);
  assert.deepEqual(body.budget, { spent: reserved, limit: 8000 });
  assert.equal(counter.spent(), reserved);
});
