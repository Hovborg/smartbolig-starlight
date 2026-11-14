// The widget's side of a streamed answer: how it asks, when it falls back to the
// JSON response, how the view follows the text, and what the source promises about
// the rest. Stop and focus are in chat-stream-keyboard.test.mjs.
import assert from "node:assert/strict";
import test from "node:test";

import { createFollowScroll } from "../src/scripts/assistant/follow-scroll.ts";
import { requestAnswer } from "../src/scripts/assistant/request.ts";
import { readAssistantSource } from "./lib/assistant-source.mjs";
import { SEARCH_SOURCE, bodyOf, sse } from "./lib/chat-stream-fakes.mjs";

const DONE = { answer: "Brug en netværkskoordinator.", sources: [SEARCH_SOURCE], sourceMode: "mixed" };
const streamResponse = (text, options) =>
  new Response(bodyOf(text, { size: 9, ...options }), { headers: { "content-type": "text/event-stream; charset=utf-8" } });
const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });

// requestAnswer against a scripted fetch. Returns what was asked and what the handlers saw.
async function ask(t, responses, { signal = new AbortController().signal } = {}) {
  const requests = [];
  const seen = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    requests.push({ url, accept: init.headers.accept, body: JSON.parse(init.body) });
    const next = responses[requests.length - 1];
    if (next instanceof Error) throw next;
    return next;
  });
  const handlers = {
    onStage: (stage) => seen.push(`stage:${stage}`),
    onSources: (sources) => seen.push(`sources:${sources.length}`),
    onText: (text) => seen.push(`text:${text}`),
    onRestart: () => seen.push("restart"),
  };
  const outcome = await requestAnswer({ locale: "da", messages: [] }, signal, handlers).then(
    (result) => ({ result }),
    (error) => ({ error }),
  );
  return { ...outcome, requests, seen };
}

test("the widget asks for a stream and passes on what it reads", async (t) => {
  const stream = [
    sse("status", { stage: "searching" }),
    sse("sources", { sources: [SEARCH_SOURCE] }),
    sse("status", { stage: "writing" }),
    sse("delta", { text: "Brug en " }),
    sse("delta", { text: "netværkskoordinator." }),
    sse("done", DONE),
    "data: [DONE]\n\n",
  ].join("");

  const { result, requests, seen } = await ask(t, [streamResponse(stream)]);

  assert.deepEqual(result, DONE);
  assert.deepEqual(requests, [{ url: "/api/chat", accept: "text/event-stream", body: { locale: "da", messages: [] } }]);
  assert.deepEqual(seen, ["stage:searching", "sources:1", "stage:writing", "text:Brug en ", "text:netværkskoordinator."]);
});

test("a JSON reply to a stream request is handled as before: an answer, or a refusal with its code", async (t) => {
  const answered = await ask(t, [jsonResponse(DONE)]);
  assert.deepEqual(answered.result, DONE);
  assert.equal(answered.requests.length, 1);

  const refused = await ask(t, [jsonResponse({ code: "rate_limited" }, 429)]);
  assert.equal(refused.error.code, "rate_limited");
  assert.equal(refused.error.statusCode, 429);
  assert.equal(refused.requests.length, 1, "a refusal is not retried");
});

test("a stream that fails before any text is asked again as JSON, once", async (t) => {
  const failures = [
    streamResponse(sse("status", { stage: "writing" }) + sse("error", { code: "assistant_unavailable" }) + "data: [DONE]\n\n"),
    streamResponse(sse("status", { stage: "searching" })),
    streamResponse(sse("status", { stage: "searching" }) + sse("status", { stage: "writing" }), { failAt: 18 }),
  ];

  for (const failure of failures) {
    const { result, requests, seen } = await ask(t, [failure, jsonResponse(DONE)]);
    assert.deepEqual(result, DONE);
    assert.deepEqual(
      requests.map(({ accept }) => accept),
      ["text/event-stream", undefined],
    );
    assert.equal(seen.at(-1), "restart");
  }

  const twice = await ask(t, [
    streamResponse(sse("error", { code: "assistant_unavailable" })),
    jsonResponse({ code: "assistant_unavailable" }, 502),
  ]);
  assert.equal(twice.error.statusCode, 502);
  assert.equal(twice.requests.length, 2);
});

test("a stream that fails after text was shown is an error and is not asked again", async (t) => {
  const failures = [
    sse("delta", { text: "Brug en " }) + sse("error", { code: "assistant_unavailable" }) + "data: [DONE]\n\n",
    sse("delta", { text: "Brug en " }),
  ];

  for (const failure of failures) {
    const { error, requests, seen } = await ask(t, [streamResponse(failure), jsonResponse(DONE)]);
    assert.equal(error.message, "AssistantRequestFailed");
    assert.equal(requests.length, 1);
    assert.ok(!seen.includes("restart"));
  }

  const dropped = await ask(t, [
    streamResponse(sse("delta", { text: "Brug en " }) + sse("delta", { text: "netværks" }), { failAt: 45 }),
    jsonResponse(DONE),
  ]);
  assert.equal(dropped.error.message, "AssistantRequestFailed");
  assert.equal(dropped.requests.length, 1);
});

test("a browser that cannot read a streamed body asks for JSON from the start", async (t) => {
  const response = jsonResponse(DONE);
  const original = globalThis.ReadableStream;
  globalThis.ReadableStream = undefined;
  t.after(() => {
    globalThis.ReadableStream = original;
  });

  const { result, requests } = await ask(t, [response]);
  globalThis.ReadableStream = original;

  assert.deepEqual(result, DONE);
  assert.deepEqual(requests.map(({ accept }) => accept), [undefined]);
});

test("a stopped request is not retried", async (t) => {
  const controller = new AbortController();
  controller.abort();
  const abort = new DOMException("The operation was aborted.", "AbortError");

  const stopped = await ask(t, [abort, jsonResponse(DONE)], { signal: controller.signal });
  assert.equal(stopped.error.name, "AbortError");
  assert.equal(stopped.requests.length, 1);

  // Stopped while the stream was being read: the read fails, the signal says why.
  const midway = await ask(t, [streamResponse(sse("status", { stage: "writing" }), { failAt: 9 }), jsonResponse(DONE)], {
    signal: controller.signal,
  });
  assert.ok(midway.error);
  assert.equal(midway.requests.length, 1);
});

test("the view follows the writing position, shows the first words and leaves a reader who scrolled up alone", (t) => {
  // A scrolled box 200 px high. Elements sit at fixed places in its content.
  class Box extends EventTarget {
    scrollTop = 0;
    clientHeight = 200;
    scrollHeight = 1_000;
    isConnected = true;
    getBoundingClientRect() { return { top: 100, bottom: 300 }; }
  }
  const before = Object.getOwnPropertyDescriptor(globalThis, "HTMLElement");
  Object.defineProperty(globalThis, "HTMLElement", { value: Box, configurable: true, writable: true });
  t.after(() => (before ? Object.defineProperty(globalThis, "HTMLElement", before) : delete globalThis.HTMLElement));
  const conversation = new Box();
  const at = (top, bottom) => ({
    isConnected: true,
    getBoundingClientRect: () => ({ top: 100 + top - conversation.scrollTop, bottom: 100 + bottom - conversation.scrollTop }),
  });
  const scrollTo = (top) => {
    conversation.scrollTop = top;
    conversation.dispatchEvent(new Event("scroll"));
  };
  const follow = createFollowScroll({ root: { querySelector: () => conversation } });

  // Waiting for text: the whole draft with its sources is brought into view.
  const bubble = at(400, 700);
  follow.start();
  follow.follow(bubble);
  assert.equal(conversation.scrollTop, 700 + 12 - 200);

  // The first words appear at the top of the bubble, above what is in view.
  follow.reveal(bubble);
  assert.equal(conversation.scrollTop, 400 - 12);
  const writingLine = at(430, 480);
  follow.follow(writingLine);
  assert.equal(conversation.scrollTop, 388, "the view never moves up to follow");

  // The text grows: the view moves down with the line that is being written.
  const later = at(430, 900);
  follow.follow(later);
  assert.equal(conversation.scrollTop, 900 + 12 - 200);

  // The reader scrolls up to read: nothing moves the view until the next answer.
  scrollTo(300);
  follow.follow(at(430, 990));
  follow.reveal(bubble);
  follow.toBottom();
  assert.equal(conversation.scrollTop, 300);

  follow.start();
  follow.toBottom();
  assert.equal(conversation.scrollTop, 1_000);
});

test("the widget streams with fetch, stays quiet while a draft changes and can be stopped", async () => {
  const source = await readAssistantSource();

  // fetch with a streamed body, not EventSource: the request is a POST.
  assert.doesNotMatch(source, /new EventSource/);
  assert.match(source, /accept:\s*["']text\/event-stream["']/);
  assert.match(source, /typeof ReadableStream === ["']function["']/);

  for (const copy of [
    "Søger i guiderne …",
    "Skriver svar …",
    "Læser dit spørgsmål …",
    "Searching the guides …",
    "Writing the answer …",
    "Reading your question …",
    "Svaret blev stoppet.",
    "The answer was stopped.",
  ]) {
    assert.ok(source.includes(copy), `missing status copy: ${copy}`);
  }

  // A draft is silent for screen readers; the status line and the finished answer speak.
  assert.match(source, /article\.setAttribute\(["']aria-live["'],\s*["']off["']\)/);
  assert.match(source, /article\.setAttribute\(["']aria-busy["'],\s*["']true["']\)/);
  assert.match(source, /draft\.setStage\(label\);\s*setStatus\(label\)/);
  assert.match(source, /article\.replaceWith\(renderMessage\(message\)\)/);

  // Stop: its own button, a real abort, and nothing half-written is stored.
  assert.match(source, /<button[^>]*data-chat-stop[^>]*hidden/);
  assert.match(source, /function stopAnswer\(\)\s*\{[\s\S]{0,120}abortController\.abort\(\)/);
  assert.match(source, /renderError\(copy\.stopped,\s*\{\s*quiet:\s*true\s*\}\)/);
  assert.equal((source.match(/store\.items\.push\(/g) || []).length, 2, "only the question and the finished answer are stored");

  // The reader keeps the scroll position, and reduced motion gets whole lines.
  assert.match(source, /if \(top > conversation\.scrollTop\) conversation\.scrollTop = top/);
  assert.match(source, /overflow-anchor:\s*none/);
  assert.match(source, /visibleDraft\(text,\s*reducedMotion\.matches\)/);
  assert.match(source, /requestAnimationFrame\(paint\)/);
});
