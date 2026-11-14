// The reader of a model stream on its own: what it holds back, when it tells
// the model to stop, and that a stopped request reads nothing.
import assert from "node:assert/strict";
import test from "node:test";

import { PROMPT_INTERNAL_MARKERS, heldBackLength, leaksPromptInternals } from "../functions/lib/chat/answer.js";
import { readModelStream } from "../functions/lib/chat/model-stream.js";
import { withTimeout } from "../functions/lib/chat/runtime.js";
import { modelStream } from "./lib/chat-stream-fakes.mjs";

// A model stream that records whether the reader told the model to stop.
function watched(parts, options) {
  const inner = modelStream(parts, options).getReader();
  const state = { cancelled: false, reads: 0 };
  const stream = new ReadableStream({
    async pull(controller) {
      state.reads += 1;
      const { done, value } = await inner.read();
      if (done) controller.close();
      else controller.enqueue(value);
    },
    cancel() {
      state.cancelled = true;
    },
  });
  return { stream, state };
}

test("every marker the stream holds back is one the answer check rejects", () => {
  for (const marker of PROMPT_INTERNAL_MARKERS) {
    assert.equal(leaksPromptInternals(`Se ${marker}>`), true, marker);
    assert.equal(leaksPromptInternals(`Se ${marker.toUpperCase()}>`), true, marker);
  }
  // The other way round: text the check rejects starts with a marker that is held back.
  for (const leak of ["search_smartbolig", "<smartbolig_reference_data>", "</official_reference_data>"]) {
    assert.ok(PROMPT_INTERNAL_MARKERS.some((marker) => leak.startsWith(marker)), leak);
  }
});

test("the end of a text is held back exactly as far as it may start a prompt internal", () => {
  const cases = [
    ["Et helt almindeligt svar.", 0],
    ["Jeg kalder search", 6],
    ["Jeg kalder SEARCH_SMART", 12],
    ["Se <", 1],
    ["Se </", 2],
    ["Se <smartbolig_reference_dat", 25],
    ["Se </official_ref", 14],
    ["Tryk på <Enter", 0],
    ["en research", 6],
    ["", 0],
  ];

  for (const [text, expected] of cases) assert.equal(heldBackLength(text), expected, text);
});

test("held-back text is passed on in order, and nothing is passed twice", async () => {
  const seen = [];
  const { stream } = watched(["Tryk <", "Enter> og s", "earch", "_x nu", "."]);

  const result = await readModelStream(stream, { holdBack: heldBackLength, onText: (text) => seen.push(text) });

  assert.equal(seen.join(""), "Tryk <Enter> og search_x nu.");
  assert.equal(result.response, seen.join(""));
  assert.deepEqual(seen, ["Tryk ", "<Enter> og ", "search_x nu", "."]);
});

test("a stopped request reads nothing and tells the model to stop", async () => {
  const controller = new AbortController();
  controller.abort();
  const seen = [];
  const { stream, state } = watched(["Et ", "svar."]);

  await readModelStream(stream, { onText: (text) => seen.push(text), signal: controller.signal });

  assert.deepEqual(seen, []);
  assert.equal(state.cancelled, true);
});

test("a request that is stopped while the reader waits tells the model to stop", async () => {
  const controller = new AbortController();
  const seen = [];
  const { stream, state } = watched(["Et ", "svar."], { hangAfter: 1 });

  const reading = readModelStream(stream, {
    onText: (text) => {
      seen.push(text);
      controller.abort();
    },
    signal: controller.signal,
  });
  await reading;

  assert.deepEqual(seen, ["Et "]);
  assert.equal(state.cancelled, true);
});

test("the model is told to stop when the answer is rejected or finished early", async () => {
  const rejected = watched(["Jeg bruger ", "search_smartbolig", " nu."]);
  const tooLong = watched(["x".repeat(30), "y".repeat(30)]);

  const leak = await readModelStream(rejected.stream, { stopWhen: leaksPromptInternals });
  const long = await readModelStream(tooLong.stream, { maxChars: 40 });

  assert.equal(rejected.state.cancelled, true);
  assert.equal(leak.response, "Jeg bruger search_smartbolig");
  assert.equal(tooLong.state.cancelled, true);
  assert.equal(long.finish_reason, "length");
});

test("an operation is never started for a request that is already stopped", async () => {
  const controller = new AbortController();
  controller.abort();
  let started = false;

  await assert.rejects(
    withTimeout(
      async () => {
        started = true;
      },
      1_000,
      controller.signal,
    ),
    { name: "AbortError" },
  );
  assert.equal(started, false);
});
