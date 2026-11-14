// The streamed chat endpoint: which events it sends, in which order, and that
// everything around the answer (limits, refusals, the final body) is unchanged.
import assert from "node:assert/strict";
import test from "node:test";

import { CHAT_MODEL, createChatHandler } from "../functions/api/chat.js";
import {
  DOMAIN_QUESTION,
  PLAIN_QUESTION,
  SEARCH_SOURCE,
  chatEnv,
  chatRequest,
  completion,
  createStreamHarness,
  deltaText,
  eventNames,
  modelStream,
  readEvents,
  searchCall,
} from "./lib/chat-stream-fakes.mjs";

const ANSWER_PARTS = ["En **netværkskoordinator** ", "er det sikre valg ", "til Zigbee2MQTT."];
const ANSWER = ANSWER_PARTS.join("");
const answers = (call) => (call.stream ? modelStream(ANSWER_PARTS) : completion(ANSWER));

test("a streamed question reports the search, then the sources, then the text and the checked answer", async () => {
  const { handler, calls, searches } = createStreamHarness(answers);

  const response = await handler({ request: chatRequest(DOMAIN_QUESTION), env: chatEnv() });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/event-stream; charset=utf-8");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-request-id"), "req-stream-1");

  const events = await readEvents(response);
  assert.equal(eventNames(events), "status sources status delta delta delta done message");
  assert.deepEqual(events[0].data, { stage: "searching" });
  assert.deepEqual(events[1].data, { sources: [SEARCH_SOURCE] });
  assert.deepEqual(events[2].data, { stage: "writing" });
  assert.equal(deltaText(events), ANSWER);
  assert.equal(events.at(-2).data.answer, ANSWER);
  assert.deepEqual(events.at(-2).data.sources, [SEARCH_SOURCE]);
  assert.equal(events.at(-1).data, "[DONE]");

  // One search, then one model call, and that call is the streamed one.
  assert.deepEqual(searches, [DOMAIN_QUESTION]);
  assert.deepEqual(
    calls.map(({ model, stream, tools }) => ({ model, stream, tools })),
    [{ model: CHAT_MODEL, stream: true, tools: false }],
  );
});

test("the done event is exactly the JSON response for the same question", async () => {
  const streamed = createStreamHarness(answers);
  const plain = createStreamHarness(answers);

  const events = await readEvents(
    await streamed.handler({ request: chatRequest(DOMAIN_QUESTION), env: chatEnv() }),
  );
  const json = await plain.handler({ request: chatRequest(DOMAIN_QUESTION, { stream: false }), env: chatEnv() });

  assert.equal(json.headers.get("content-type"), "application/json; charset=utf-8");
  assert.deepEqual(events.find(({ event }) => event === "done").data, await json.json());
  assert.equal(plain.calls[0].stream, false);
});

test("the sources are sent before the first text when the model asks for the search itself", async () => {
  const { handler, calls, searches } = createStreamHarness((call) =>
    call.tools ? searchCall("pris på zigbee koordinator") : modelStream(ANSWER_PARTS),
  );

  const events = await readEvents(await handler({ request: chatRequest(PLAIN_QUESTION), env: chatEnv() }));

  assert.equal(eventNames(events), "status status sources status delta delta delta done message");
  assert.deepEqual(
    events.filter(({ event }) => event === "status").map(({ data }) => data.stage),
    ["reading", "searching", "writing"],
  );
  assert.deepEqual(events[2].data, { sources: [SEARCH_SOURCE] });
  assert.deepEqual(searches, ["pris på zigbee koordinator"]);
  // The step that may end in a tool call is not streamed; the answer step is.
  assert.deepEqual(
    calls.map(({ stream, tools }) => ({ stream, tools })),
    [
      { stream: false, tools: true },
      { stream: true, tools: false },
    ],
  );
});

test("an answer the model gives without searching arrives as one piece after an empty source list", async () => {
  const { handler, calls, searches } = createStreamHarness(() => completion("Hej! Hvad vil du gerne bygge?"));

  const events = await readEvents(await handler({ request: chatRequest("Hej"), env: chatEnv() }));

  assert.equal(eventNames(events), "status sources status delta done message");
  assert.deepEqual(events[1].data, { sources: [] });
  assert.equal(deltaText(events), "Hej! Hvad vil du gerne bygge?");
  assert.equal(events.at(-2).data.sourceMode, "general");
  assert.equal(calls.length, 1);
  assert.deepEqual(searches, []);
});

test("a refusal is the same JSON response with or without a stream request", async () => {
  const cases = [
    ["rate limit", {}, { CHAT_RATE_LIMITER: { limit: async () => ({ success: false }) } }, 429],
    ["invalid input", { body: JSON.stringify({ locale: "da", messages: [] }) }, {}, 400],
    ["broken JSON", { body: "{" }, {}, 400],
    ["oversized body", { body: JSON.stringify({ locale: "da", messages: [], pad: "x".repeat(30_000) }) }, {}, 413],
    ["foreign origin", { headers: { origin: "https://evil.example" } }, {}, 403],
    ["wrong content type", { headers: { "content-type": "text/plain" } }, {}, 415],
    ["missing binding", {}, { AI: undefined }, 503],
  ];

  for (const [name, requestOptions, envOverrides, status] of cases) {
    const { handler, calls } = createStreamHarness(answers);
    const streamed = await handler({
      request: chatRequest(DOMAIN_QUESTION, requestOptions),
      env: chatEnv(envOverrides),
    });
    const plain = await handler({
      request: chatRequest(DOMAIN_QUESTION, { ...requestOptions, stream: false }),
      env: chatEnv(envOverrides),
    });

    assert.equal(streamed.status, status, name);
    assert.equal(streamed.headers.get("content-type"), "application/json; charset=utf-8", name);
    assert.equal(streamed.headers.get("retry-after"), plain.headers.get("retry-after"), name);
    assert.deepEqual(await streamed.json(), await plain.json(), name);
    assert.equal(calls.length, 0, `${name}: the model must not be called`);
  }
});

test("the rate limiter is asked once per streamed question, with the same key as before", async () => {
  const keys = [];
  const { handler } = createStreamHarness(answers);

  await readEvents(
    await handler({
      request: chatRequest(DOMAIN_QUESTION),
      env: chatEnv({
        CHAT_RATE_LIMITER: {
          limit: async ({ key }) => {
            keys.push(key);
            return { success: true };
          },
        },
      }),
    }),
  );

  assert.deepEqual(keys, ["chat:203.0.113.42"]);
});

test("only a request that asks for text/event-stream is streamed", async () => {
  for (const accept of ["application/json", "*/*", "text/html, text/event-streams"]) {
    const { handler } = createStreamHarness(answers);
    const response = await handler({
      request: chatRequest(DOMAIN_QUESTION, { stream: false, headers: { accept } }),
      env: chatEnv(),
    });
    assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8", accept);
  }

  const { handler } = createStreamHarness(answers);
  const response = await handler({
    request: chatRequest(DOMAIN_QUESTION, { stream: false, headers: { accept: "application/json, Text/Event-Stream;q=0.9" } }),
    env: chatEnv(),
  });
  assert.equal(response.headers.get("content-type"), "text/event-stream; charset=utf-8");
  await response.body.cancel();
});

test("with streaming turned off every request gets the JSON response", async () => {
  const { handler, calls } = createStreamHarness(answers, { streaming: false });

  const response = await handler({ request: chatRequest(DOMAIN_QUESTION), env: chatEnv() });

  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal((await response.json()).answer, ANSWER);
  assert.equal(calls[0].stream, false);
});

test("a failed generation ends the stream with the localized error and no answer", async () => {
  const { handler, logs } = createStreamHarness(() => {
    throw new Error("model down");
  });
  const plain = createStreamHarness(() => {
    throw new Error("model down");
  });

  const events = await readEvents(await handler({ request: chatRequest(DOMAIN_QUESTION), env: chatEnv() }));
  const json = await plain.handler({ request: chatRequest(DOMAIN_QUESTION, { stream: false }), env: chatEnv() });

  assert.equal(eventNames(events), "status sources status error message");
  assert.equal(json.status, 502);
  assert.deepEqual(events.at(-2).data, await json.json());
  assert.match(events.at(-2).data.error.da, /kunne ikke svare/);
  assert.ok(logs.some(({ message }) => message === "SmartBolig chat generation failed"));
});

test("an agent that reports nothing still gets its sources out before the answer", async () => {
  const handler = createChatHandler({
    agentRunner: async ({ searchSmartbolig }) => {
      await searchSmartbolig("zigbee");
      return { answer: "Et svar uden mellemtrin." };
    },
    createRequestId: () => "req-stream-2",
    logger: {},
    siteSearch: () => async () => [{ url: SEARCH_SOURCE.url, title: SEARCH_SOURCE.title, text: "Uddrag." }],
  });

  const events = await readEvents(await handler({ request: chatRequest(DOMAIN_QUESTION), env: chatEnv() }));

  assert.equal(eventNames(events), "sources done message");
  assert.deepEqual(events[0].data, { sources: [SEARCH_SOURCE] });
  assert.equal(events[1].data.answer, "Et svar uden mellemtrin.");
});

test("a reader who leaves stops the model, and that is not logged as a failure", async () => {
  const { handler, calls, logs } = createStreamHarness(() => modelStream(ANSWER_PARTS, { hangAfter: 1 }));
  let finished;

  const response = await handler({
    request: chatRequest(DOMAIN_QUESTION),
    env: chatEnv(),
    waitUntil: (promise) => {
      finished = promise;
    },
  });
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let seen = "";
  while (!seen.includes("event: delta")) seen += decoder.decode((await reader.read()).value);
  await reader.cancel();
  await finished;

  assert.equal(calls.length, 1, "no fallback model after a stop");
  assert.equal(calls[0].signal.aborted, true);
  assert.deepEqual(logs, []);
});
