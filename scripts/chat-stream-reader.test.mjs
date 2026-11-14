// The reader of a model stream on its own: what it holds back, when it tells
// the model to stop, and that a stopped request reads nothing.
import assert from "node:assert/strict";
import test from "node:test";

import { PROMPT_INTERNAL_MARKERS, heldBackLength, leaksPromptInternals } from "../functions/lib/chat/answer.js";
import { readModelStream } from "../functions/lib/chat/model-stream.js";
import { withTimeout } from "../functions/lib/chat/runtime.js";
import { modelStream, sseStream } from "./lib/chat-stream-fakes.mjs";

// A model stream that records whether the reader told the model to stop.
function watched(parts, options) {
  return watchedRaw(modelStream(parts, options));
}

function watchedRaw(source) {
  const inner = source.getReader();
  const state = { cancelled: false, reads: 0 };
  // No read ahead: the model is asked for a piece only when the reader asks.
  const stream = new ReadableStream(
    {
      async pull(controller) {
        state.reads += 1;
        const { done, value } = await inner.read();
        if (done) controller.close();
        else controller.enqueue(value);
      },
      cancel() {
        state.cancelled = true;
      },
    },
    { highWaterMark: 0 },
  );
  return { stream, state };
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("every marker the stream holds back is one the answer check rejects", () => {
  for (const marker of PROMPT_INTERNAL_MARKERS) {
    assert.equal(leaksPromptInternals(`Se ${marker}>`), true, marker);
    assert.equal(leaksPromptInternals(`Se ${marker.toUpperCase()}>`), true, marker);
  }
  // The other way round: text the check rejects starts with a marker that is held back.
  for (const leak of ["search_smartbolig", "<smartbolig_reference_data>", "</official_reference_data>"]) {
    assert.ok(PROMPT_INTERNAL_MARKERS.some((marker) => leak.startsWith(marker)), leak);
  }
  // Both fold ASCII letters only: a look-alike letter is neither a leak nor held back.
  assert.equal(leaksPromptInternals("Jeg bruger ſearch_smartbolig"), false);
  assert.equal(heldBackLength("Jeg bruger ſearch_"), 0);
});

test("no part of any marker is passed on, wherever the pieces are cut and in either case", async () => {
  for (const marker of PROMPT_INTERNAL_MARKERS) {
    for (const word of [marker, marker.toUpperCase()]) {
      for (let cut = 1; cut < word.length; cut += 1) {
        const seen = [];
        const { stream } = watched(["Se ", word.slice(0, cut), `${word.slice(cut)}> her.`]);

        await readModelStream(stream, { holdBack: heldBackLength, onText: (text) => seen.push(text), stopWhen: leaksPromptInternals });

        assert.equal(seen.join(""), "Se ", `${word} cut at ${cut}`);
      }
    }
  }
});

test("a draft the token limit cut off inside a marker shows none of it", async () => {
  for (const finish of ["length", "max_tokens", "MAX-TOKENS"]) {
    const seen = [];
    const { stream } = watched(["Se ", "<smartbolig_refer"], { finish });

    const result = await readModelStream(stream, { holdBack: heldBackLength, onText: (text) => seen.push(text) });

    assert.deepEqual(seen, ["Se "], finish);
    assert.equal(result.finish_reason, finish);
  }
  // A draft that ended as it should is shown to the end, also when its last word looks like a start.
  const seen = [];
  const { stream } = watched(["Lav en ", "research"]);
  await readModelStream(stream, { holdBack: heldBackLength, onText: (text) => seen.push(text) });
  assert.equal(seen.join(""), "Lav en research");
});

test("a finish reason beside the text, as older models send it, is read", async () => {
  const cut = await readModelStream(sseStream([{ response: "En halv sætning om" }, { response: "", finish_reason: "length" }]));
  const stopped = await readModelStream(sseStream([{ choices: [{ delta: { content: "En halv" } }] }, { choices: [], stop_reason: "max_tokens" }]));
  const whole = await readModelStream(sseStream([{ response: "Et helt svar." }, { response: "", finish_reason: "stop" }], { done: false }));

  assert.equal(cut.finish_reason, "length");
  assert.equal(stopped.finish_reason, "max_tokens");
  assert.deepEqual(whole, { response: "Et helt svar.", finish_reason: "stop" });
});

test("only pieces in a shape the reader knows count as known", async () => {
  const unknown = async (payloads, options) => (await readModelStream(sseStream(payloads, options))).unknown_chunks;

  // Not understood: text under another name, at the top or inside the delta.
  assert.equal(await unknown([{ token: "Brug " }, { token: "en koordinator." }]), 2);
  assert.equal(await unknown([{ choices: [{ delta: { text: "Brug en koordinator." } }] }]), 1);
  assert.equal(await unknown([{ token: "Brug " }], { done: false }), 1);
  // Understood without answer text: a role, reasoning, an empty piece, the usage tail.
  const quiet = [
    { choices: [{ delta: { role: "assistant" } }] },
    { choices: [{ delta: { reasoning_content: "Jeg tænker." } }] },
    { choices: [{ delta: { content: "" } }] },
    { choices: [] },
    { response: "", usage: { total_tokens: 3 } },
  ];
  assert.equal(await unknown(quiet), undefined);
  // An unknown piece beside real text is not worth a log line.
  assert.equal(await unknown([{ token: "x" }, { choices: [{ delta: { content: "Et svar." } }] }]), undefined);
});

test("an error list sent inside the stream is thrown, and the model is told to stop", async () => {
  for (const failure of [{ errors: [{ message: "upstream" }] }, { error: "upstream" }]) {
    const { stream, state } = watchedRaw(sseStream([{ choices: [{ delta: { content: "Brug " } }] }, failure, { choices: [{ delta: { content: "mere" } }] }]));
    await assert.rejects(readModelStream(stream), { name: "ModelStreamError", message: "ModelStreamError" });
    assert.equal(state.cancelled, true);
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
    // The longest end that may be a start counts, not the shortest.
    ["Jeg kalder search_s", 8],
    ["Se <s", 2],
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
  assert.equal(state.reads, 0, "the model was not asked for a single piece");
  assert.equal(state.cancelled, true);
});

test("a request that is stopped while a read is pending tells the model to stop and ends", async () => {
  const controller = new AbortController();
  const seen = [];
  const { stream, state } = watched(["Et ", "svar."], { hangAfter: 1 });

  const reading = readModelStream(stream, { onText: (text) => seen.push(text), signal: controller.signal });
  // The reader now waits for a piece that never comes.
  await wait(20);
  assert.deepEqual(seen, ["Et "]);
  assert.equal(state.cancelled, false);

  controller.abort();
  const result = await Promise.race([reading, wait(1_000).then(() => "still waiting")]);

  assert.notEqual(result, "still waiting");
  assert.equal(state.cancelled, true);
  assert.deepEqual(seen, ["Et "]);
});

test("a request that is stopped from inside a piece reads no more", async () => {
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
