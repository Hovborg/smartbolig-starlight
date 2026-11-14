// The browser's reading of a streamed answer: bytes to events, events to an
// outcome, and which part of a half-written answer is shown. No DOM involved.
import assert from "node:assert/strict";
import test from "node:test";

import { createSseDecoder } from "../functions/lib/chat/sse-decoder.js";
import { createChatEventReader, readChatStream, visibleDraft } from "../src/lib/assistant-stream.mjs";
import {
  DOMAIN_QUESTION,
  SEARCH_SOURCE,
  bodyOf,
  chatEnv,
  chatRequest,
  completion,
  createStreamHarness,
  modelStream,
  sse,
} from "./lib/chat-stream-fakes.mjs";

const bytes = (text) => new TextEncoder().encode(text);
const DONE = { answer: "Brug en netværkskoordinator.", sources: [SEARCH_SOURCE], sourceMode: "mixed" };

test("the decoder joins chunks that end inside a line or inside a character", () => {
  const text = `event: delta\ndata: {"text":"Søg i guiden på æøå 🙂"}\n\nevent: status\r\ndata: {"stage":"writing"}\r\n\r\n`;
  const whole = createSseDecoder();
  const expected = [...whole.push(bytes(text)), ...whole.end()];
  assert.deepEqual(expected, [
    { event: "delta", data: '{"text":"Søg i guiden på æøå 🙂"}' },
    { event: "status", data: '{"stage":"writing"}' },
  ]);

  // One byte at a time splits every multi-byte character and every line.
  for (const size of [1, 2, 3, 5, 11]) {
    const decoder = createSseDecoder();
    const all = bytes(text);
    const messages = [];
    for (let offset = 0; offset < all.length; offset += size) {
      messages.push(...decoder.push(all.slice(offset, offset + size)));
    }
    messages.push(...decoder.end());
    assert.deepEqual(messages, expected, `chunks of ${size} byte(s)`);
  }
});

test("the decoder skips comments, joins data lines and keeps a last event without its blank line", () => {
  const decoder = createSseDecoder();
  const messages = [
    ...decoder.push(bytes(": keep-alive\n\ndata: one\ndata: two\n\nretry: 500\nid: 7\nevent: delta\ndata:no-space")),
    ...decoder.end(),
  ];

  assert.deepEqual(messages, [
    { event: "message", data: "one\ntwo" },
    { event: "delta", data: "no-space" },
  ]);
});

test("the event reader types the known events and ignores everything else", () => {
  const reader = createChatEventReader();
  const events = reader.push(
    bytes(
      [
        sse("status", { stage: "searching" }),
        sse("status", { stage: "dancing" }),
        sse("sources", { sources: [SEARCH_SOURCE] }),
        sse("sources", { sources: "none" }),
        sse("usage", { tokens: 12 }),
        "event: delta\ndata: {broken\n\n",
        sse("delta", { text: "" }),
        sse("delta", { text: "Hej" }),
        sse("done", { answer: "  " }),
        sse("done", DONE),
        "data: [DONE]\n\n",
        "data: something else\n\n",
      ].join(""),
    ),
  );

  assert.deepEqual(events, [
    { type: "status", stage: "searching" },
    { type: "sources", sources: [SEARCH_SOURCE] },
    { type: "delta", text: "Hej" },
    { type: "done", result: DONE },
    { type: "end" },
  ]);
});

test("a stream is an answer only when it reaches done", async () => {
  const seen = [];
  const good = [sse("status", { stage: "writing" }), sse("delta", { text: "Brug " }), sse("done", DONE), "data: [DONE]\n\n"];

  assert.deepEqual(await readChatStream(bodyOf(good.join("")), (event) => seen.push(event.type)), { result: DONE });
  assert.deepEqual(seen, ["status", "delta"]);

  const failed = sse("delta", { text: "Brug " }) + sse("error", { code: "assistant_unavailable" }) + "data: [DONE]\n\n";
  assert.deepEqual(await readChatStream(bodyOf(failed), () => {}), { failed: true, code: "assistant_unavailable" });

  // Closed by [DONE] or by the connection, but without done: not an answer.
  assert.deepEqual(await readChatStream(bodyOf(sse("delta", { text: "Brug " }) + "data: [DONE]\n\n"), () => {}), { failed: true });
  assert.deepEqual(await readChatStream(bodyOf(sse("delta", { text: "Brug " })), () => {}), { failed: true });
  await assert.rejects(readChatStream(bodyOf(good.join(""), { failAt: 14 }), () => {}), /network error/);
});

test("the browser reads the Worker's own stream to the same answer as the JSON response", async () => {
  const script = (call) =>
    call.stream ? modelStream(["Brug en ", "netværks", "koordinator."]) : completion("Brug en netværkskoordinator.");
  const streamed = await createStreamHarness(script).handler({ request: chatRequest(DOMAIN_QUESTION), env: chatEnv() });
  const json = await createStreamHarness(script).handler({
    request: chatRequest(DOMAIN_QUESTION, { stream: false }),
    env: chatEnv(),
  });
  const seen = [];

  // Five bytes at a time: no event arrives whole.
  const outcome = await readChatStream(bodyOf(await streamed.text(), { size: 5 }), (event) => seen.push(event));

  assert.deepEqual(outcome.result, await json.json());
  assert.deepEqual(
    seen.map((event) => event.stage || event.type),
    ["searching", "sources", "writing", "delta", "delta", "delta"],
  );
});

test("a half-written answer is shown without stray markers", () => {
  // An open span is closed for display, so the words are already bold or code.
  assert.equal(visibleDraft("Brug en **netværks"), "Brug en **netværks**");
  assert.equal(visibleDraft("Sæt den i `configuration"), "Sæt den i `configuration`");
  // A marker with nothing after it yet is held back.
  assert.equal(visibleDraft("Brug en **"), "Brug en ");
  assert.equal(visibleDraft("Brug en *"), "Brug en ");
  assert.equal(visibleDraft("Sæt den i `"), "Sæt den i ");
  assert.equal(visibleDraft("Første afsnit.\n\n##"), "Første afsnit.\n");
  assert.equal(visibleDraft("Første afsnit.\n\n``"), "Første afsnit.\n");
  // Finished text and code are left alone.
  assert.equal(visibleDraft("**Færdig** og `kode`."), "**Færdig** og `kode`.");
  assert.equal(visibleDraft("```yaml\nmode: **restart"), "```yaml\nmode: **restart");
  assert.equal(visibleDraft("```yaml\nmode: restart\n```\nBrug `den"), "```yaml\nmode: restart\n```\nBrug `den`");
});

test("with reduced motion the line that is still being written is held back", () => {
  assert.equal(visibleDraft("Første linje.\nAnden lin", true), "Første linje.\n");
  assert.equal(visibleDraft("Ingen hel linje endnu", true), "");
  assert.equal(visibleDraft("Første linje.\nAnden linje.\n", true), "Første linje.\nAnden linje.\n");
});
