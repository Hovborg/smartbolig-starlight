import assert from "node:assert/strict";
import test from "node:test";

import { CallBudgetExceeded, DailyBudgetExhausted } from "./lib/news-llm/errors.mjs";
import { createHttpChat } from "./lib/news-llm/provider-http.mjs";

const KEY = "sk-test-secret-key-0123456789";
const URL_ = "https://relay.invalid/v1/chat/completions";
const answer = (content, extra = {}) => new Response(JSON.stringify({
  choices: [{ message: { content }, finish_reason: "stop", ...extra }],
  usage: { neurons: 7 },
}), { status: 200 });
const status = (code) => new Response("upstream body", { status: code });

function harness(queue) {
  const requests = [];
  const waits = [];
  const fetchImpl = async (url, init) => {
    requests.push({ url, init });
    const next = queue.shift();
    if (next instanceof Error) throw next;
    return next;
  };
  const chat = createHttpChat({ url: URL_, key: KEY, fetchImpl, wait: async (ms) => { waits.push(ms); } });
  return { chat, requests, waits };
}
const call = (chat, extra = {}) => chat({ model: "m", system: "S", user: "U", ...extra });

test("the http provider needs a url and a key", () => {
  assert.throws(() => createHttpChat({ url: "", key: KEY }), /required/);
  assert.throws(() => createHttpChat({ url: URL_, key: "" }), /required/);
});

test("a request carries the bearer header and a bounded OpenAI style body", async () => {
  const { chat, requests } = harness([answer("hello")]);
  const result = await call(chat);
  assert.deepEqual(result, { text: "hello", usage: { neurons: 7 } });
  const { url, init } = requests[0];
  assert.equal(url, URL_);
  assert.equal(init.method, "POST");
  assert.equal(init.headers.authorization, `Bearer ${KEY}`);
  const body = JSON.parse(init.body);
  assert.deepEqual(body.messages, [{ role: "system", content: "S" }, { role: "user", content: "U" }]);
  assert.equal(body.model, "m");
  assert.equal(body.max_tokens, 7000);
  assert.equal(body.temperature, 0.2);
  assert.equal("reasoning_effort" in body, false);
  assert.equal(init.body.includes(KEY), false);
});

test("reasoning effort and token limits are only sent when given", async () => {
  const { chat, requests } = harness([answer("x")]);
  await call(chat, { reasoningEffort: "low", maxTokens: 900, temperature: 0 });
  const body = JSON.parse(requests[0].init.body);
  assert.equal(body.reasoning_effort, "low");
  assert.equal(body.max_tokens, 900);
  assert.equal(body.temperature, 0);
});

for (const code of [408, 429, 500, 502, 503, 504]) {
  test(`HTTP ${code} is retried with the injected wait`, async () => {
    const { chat, requests, waits } = harness([status(code), answer("recovered")]);
    assert.equal((await call(chat)).text, "recovered");
    assert.equal(requests.length, 2);
    assert.deepEqual(waits, [2_000]);
  });
}

test("retries stop after two waits and the last status is reported", async () => {
  const { chat, requests, waits } = harness([status(503), status(503), status(503)]);
  await assert.rejects(call(chat), /answered 503/);
  assert.equal(requests.length, 3);
  assert.deepEqual(waits, [2_000, 8_000]);
});

test("a network error is retried and reported by name only", async () => {
  const failure = Object.assign(new Error(`connect failed for ${KEY}`), { name: "TypeError" });
  const { chat, requests, waits } = harness([failure, answer("back")]);
  assert.equal((await call(chat)).text, "back");
  assert.equal(requests.length, 2);
  assert.deepEqual(waits, [2_000]);

  const failing = harness([failure, failure, failure]);
  await assert.rejects(call(failing.chat), (error) => {
    assert.match(error.message, /unreachable: TypeError/);
    assert.equal(error.message.includes(KEY), false);
    return true;
  });
});

for (const code of [400, 401, 403, 404]) {
  test(`HTTP ${code} is not retried`, async () => {
    const { chat, requests, waits } = harness([status(code), answer("never reached")]);
    await assert.rejects(call(chat), new RegExp(`answered ${code}`));
    assert.equal(requests.length, 1);
    assert.deepEqual(waits, []);
  });
}

test("empty, whitespace and missing content throw", async () => {
  for (const response of [answer(""), answer("   \n"), new Response(JSON.stringify({ choices: [] })), new Response(JSON.stringify({ choices: [{ message: { content: null } }] }))]) {
    const { chat } = harness([response]);
    await assert.rejects(call(chat), /returned no text/);
  }
});

test("finish_reason length is an error", async () => {
  const { chat } = harness([answer("partial", { finish_reason: "length" })]);
  await assert.rejects(call(chat), /cut off at the token limit/);
});

test("usage is null when the endpoint sends none", async () => {
  const { chat } = harness([new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }))]);
  assert.deepEqual(await call(chat), { text: "ok", usage: null });
});

test("the key never appears in any thrown error message", async () => {
  const scenarios = [[status(401)], [status(500), status(500), status(500)], [answer("")], [answer("x", { finish_reason: "length" })]];
  for (const queue of scenarios) {
    const { chat } = harness(queue);
    await assert.rejects(call(chat), (error) => {
      assert.equal(error.message.includes(KEY), false);
      return true;
    });
  }
});

const json429 = (body) => new Response(JSON.stringify(body), { status: 429 });

test("a 429 with daily_budget_exhausted throws DailyBudgetExhausted at once, without retry", async () => {
  const { chat, requests, waits } = harness([json429({ error: "daily_budget_exhausted", budget: { spent: 7400, limit: 8000 } }), answer("never reached")]);
  await assert.rejects(call(chat), (error) => error instanceof DailyBudgetExhausted && error instanceof CallBudgetExceeded);
  assert.equal(requests.length, 1);
  assert.deepEqual(waits, []);
});

test("any other 429 is still retried", async () => {
  for (const response of [json429({ error: "rate_limited" }), new Response("not json", { status: 429 }), json429({})]) {
    const { chat, requests, waits } = harness([response, answer("recovered")]);
    assert.equal((await call(chat)).text, "recovered");
    assert.equal(requests.length, 2);
    assert.deepEqual(waits, [2_000]);
  }
});

test("a daily budget 429 after a retry still stops immediately", async () => {
  const { chat, requests, waits } = harness([status(503), json429({ error: "daily_budget_exhausted" })]);
  await assert.rejects(call(chat), DailyBudgetExhausted);
  assert.equal(requests.length, 2);
  assert.deepEqual(waits, [2_000]);
});

test("onAttempt runs before every attempt and a ceiling it throws is not retried", async () => {
  const attempts = [];
  const requests = [];
  const queue = [status(503), status(503), answer("third")];
  const fetchImpl = async () => { requests.push(1); return queue.shift(); };
  const chat = createHttpChat({ url: URL_, key: KEY, fetchImpl, wait: async () => {}, onAttempt: () => attempts.push(requests.length) });
  assert.equal((await call(chat)).text, "third");
  assert.deepEqual(attempts, [0, 1, 2], "called before each request");

  let sent = 0;
  const capped = createHttpChat({
    url: URL_, key: KEY, wait: async () => {},
    fetchImpl: async () => { sent += 1; return status(503); },
    onAttempt: () => { if (sent >= 2) throw new CallBudgetExceeded("ceiling"); },
  });
  await assert.rejects(call(capped), CallBudgetExceeded);
  assert.equal(sent, 2);
});