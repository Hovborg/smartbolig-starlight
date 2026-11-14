// The models behind a streamed answer: both stream shapes, the fallback model,
// and what happens to text that was shown when a model fails or fails a check.
import assert from "node:assert/strict";
import test from "node:test";

import {
  CHAT_FALLBACK_MODEL,
  CHAT_MODEL,
  MAX_ANSWER_CHARS,
  PRIMARY_MODEL_TIMEOUT_MS,
} from "../functions/api/chat.js";
import {
  DOMAIN_QUESTION,
  chatEnv,
  chatRequest,
  completion,
  createStreamHarness,
  deltaText,
  eventNames,
  modelStream,
  readEvents,
  sseStream,
} from "./lib/chat-stream-fakes.mjs";

const ask = async (harness, question = DOMAIN_QUESTION) =>
  readEvents(await harness.handler({ request: chatRequest(question), env: chatEnv() }));
const stages = (events) => events.filter(({ event }) => event === "status").map(({ data }) => data.stage);
const done = (events) => events.find(({ event }) => event === "done")?.data;
const fallbackReasons = (logs) =>
  logs.filter(({ message }) => message === "SmartBolig chat model fallback").map(({ event, reason }) => `${event}:${reason}`);

test("both chunk shapes of a model stream give the same answer", async () => {
  for (const shape of ["openai", "legacy"]) {
    const harness = createStreamHarness(() => modelStream(["Brug en ", "netværkskoordinator."], { shape }));
    const events = await ask(harness);

    assert.equal(deltaText(events), "Brug en netværkskoordinator.", shape);
    assert.equal(done(events).answer, "Brug en netværkskoordinator.", shape);
    assert.equal(done(events).diagnostics.route, "primary", shape);
  }
});

test("reasoning, unknown fields and broken lines in a model stream never reach the reader", async () => {
  const harness = createStreamHarness(() =>
    sseStream([
      { choices: [{ delta: { role: "assistant", content: "" } }] },
      { choices: [{ delta: { reasoning_content: "Brugeren spørger om Zigbee." } }] },
      { choices: [{ delta: { reasoning: "Jeg bør nævne PoE." } }] },
      '{"choices":[{"delta":{"content":"afbrudt lin',
      { usage: { prompt_tokens: 900 } },
      { choices: [{ delta: { content: [{ type: "text", text: "Vælg " }] } }] },
      { choices: [{ delta: { content: "SLZB-06M." } }] },
      { choices: [{ delta: {}, finish_reason: "stop" }] },
    ]),
  );

  const events = await ask(harness);

  assert.equal(deltaText(events), "Vælg SLZB-06M.");
  assert.equal(done(events).answer, "Vælg SLZB-06M.");
});

test("a stream that ends without [DONE] or a finish reason is still a whole answer", async () => {
  const harness = createStreamHarness(() => modelStream(["Et helt svar."], { finish: null, done: false }));

  assert.equal(done(await ask(harness)).answer, "Et helt svar.");
});

test("the fallback model answers when the primary fails before any text was shown", async () => {
  const failures = [
    () => {
      throw new Error("primary down");
    },
    () => modelStream(["aldrig set"], { failAfter: 0 }),
  ];

  for (const primary of failures) {
    const harness = createStreamHarness((call) => (call.primary ? primary() : modelStream(["Svar fra ", "reserven."])));
    const events = await ask(harness);

    assert.equal(eventNames(events), "status sources status delta delta done message");
    assert.deepEqual(stages(events), ["searching", "writing"]);
    assert.equal(deltaText(events), "Svar fra reserven.");
    assert.equal(done(events).diagnostics.route, "fallback");
    assert.deepEqual(
      harness.calls.map(({ model, stream }) => ({ model, stream })),
      [
        { model: CHAT_MODEL, stream: true },
        { model: CHAT_FALLBACK_MODEL, stream: true },
      ],
    );
    assert.deepEqual(fallbackReasons(harness.logs), ["fallback_started:primary_error"]);
  }
});

test("a primary that breaks after text was shown ends in an error, never in a second model", async () => {
  const harness = createStreamHarness(() => modelStream(["Brug en ", "netværks"], { failAfter: 1 }));

  const events = await ask(harness);

  assert.equal(eventNames(events), "status sources status delta error message");
  assert.equal(events.at(-2).data.code, "assistant_unavailable");
  assert.equal(done(events), undefined);
  assert.equal(harness.calls.length, 1);
  assert.ok(harness.logs.some(({ message }) => message === "SmartBolig chat generation failed"));
});

test("a finished draft that was cut off is withdrawn and rewritten by the fallback", async () => {
  const harness = createStreamHarness((call) =>
    call.primary ? modelStream(["En halv ", "sætning om"], { finish: "length" }) : modelStream(["Et helt svar."]),
  );

  const events = await ask(harness);

  assert.equal(eventNames(events), "status sources status delta delta status status delta done message");
  assert.deepEqual(stages(events), ["searching", "writing", "revising", "writing"]);
  // Only what came after "revising" is the answer.
  assert.equal(done(events).answer, "Et helt svar.");
  assert.equal(done(events).diagnostics.route, "fallback");
  assert.deepEqual(fallbackReasons(harness.logs), ["fallback_started:truncated_primary_response"]);
});

test("the answer checks still decide: a draft that names prompt internals is stopped and replaced", async () => {
  const harness = createStreamHarness((call) =>
    call.primary
      ? modelStream(["Jeg bruger ", "search_smartbolig", " til at finde", " guiden."])
      : modelStream(["Brug guiden om koordinatorer."]),
  );

  const events = await ask(harness);
  const beforeRevising = events.slice(0, events.findIndex(({ data }) => data.stage === "revising"));

  // The piece that completes the tool name is not passed on, nor anything after it.
  assert.equal(deltaText(beforeRevising), "Jeg bruger ");
  assert.equal(done(events).answer, "Brug guiden om koordinatorer.");
  assert.doesNotMatch(JSON.stringify(done(events)), /search_smartbolig/);
});

test("the YAML checks still decide what a streamed answer may be", async () => {
  const question = "Skriv en Home Assistant automation i YAML med mode: restart, klar til automations.yaml.";
  const valid = [
    "```yaml",
    "- alias: Lys ved bevægelse",
    "  mode: restart",
    "  triggers:",
    "    - trigger: state",
    "      entity_id: binary_sensor.gang",
    '      to: "on"',
    "  actions:",
    "    - action: light.turn_on",
    "      target:",
    "        entity_id: light.gang",
    "```",
  ].join("\n");
  const harness = createStreamHarness((call) =>
    call.primary ? modelStream(["Her er en idé uden YAML."]) : modelStream([valid]),
  );

  const events = await ask(harness, question);

  assert.deepEqual(stages(events), ["searching", "writing", "revising", "writing"]);
  assert.equal(done(events).answer, valid);
  assert.deepEqual(fallbackReasons(harness.logs), ["fallback_started:invalid_primary_response"]);
});

test("a fallback draft that fails the checks ends in an error, not in a half answer", async () => {
  const harness = createStreamHarness((call) =>
    modelStream([call.primary ? "Første udkast med" : "Andet udkast og"], { finish: "length" }),
  );

  const events = await ask(harness);

  assert.deepEqual(stages(events), ["searching", "writing", "revising", "writing"]);
  assert.equal(events.at(-2).event, "error");
  assert.equal(done(events), undefined);
  assert.deepEqual(fallbackReasons(harness.logs), [
    "fallback_started:truncated_primary_response",
    "fallback_failed:truncated_fallback_response",
  ]);
});

test("a model that answers a stream request without a stream is shown once, after the checks", async () => {
  const harness = createStreamHarness((call) =>
    call.primary ? completion("Afbrudt midt i en", "length") : completion("Et færdigt svar."),
  );

  const events = await ask(harness);

  // Nothing of the rejected answer was shown, so nothing has to be withdrawn.
  assert.deepEqual(stages(events), ["searching", "writing"]);
  assert.equal(eventNames(events), "status sources status delta done message");
  assert.equal(deltaText(events), "Et færdigt svar.");
});

test("the model timeout still covers a streamed answer", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const readUntil = async (reader, marker) => {
    const decoder = new TextDecoder();
    let seen = "";
    while (!seen.includes(marker)) seen += decoder.decode((await reader.read()).value);
    return seen;
  };

  // Stalled before any text: the fallback answers, as it does without a stream.
  const silent = createStreamHarness((call) =>
    call.primary ? modelStream([], { hangAfter: 0 }) : modelStream(["Svar fra reserven."]),
  );
  const silentReader = (await silent.handler({ request: chatRequest(DOMAIN_QUESTION), env: chatEnv() })).body.getReader();
  await readUntil(silentReader, '"writing"');
  t.mock.timers.tick(PRIMARY_MODEL_TIMEOUT_MS);
  assert.match(await readUntil(silentReader, "[DONE]"), /event: done/);
  assert.equal(silent.calls[0].signal.aborted, true);
  assert.deepEqual(fallbackReasons(silent.logs), ["fallback_started:primary_error"]);

  // Stalled after text was shown: an error, and no second model.
  const halfway = createStreamHarness(() => modelStream(["Brug en "], { hangAfter: 1 }));
  const halfwayReader = (await halfway.handler({ request: chatRequest(DOMAIN_QUESTION), env: chatEnv() })).body.getReader();
  await readUntil(halfwayReader, "event: delta");
  t.mock.timers.tick(PRIMARY_MODEL_TIMEOUT_MS);
  const rest = await readUntil(halfwayReader, "[DONE]");
  assert.match(rest, /event: error/);
  assert.doesNotMatch(rest, /event: done/);
  assert.equal(halfway.calls.length, 1);
});

test("an oversized streamed answer is cut at the size limit and replaced", async () => {
  const piece = "x".repeat(1_000);
  const harness = createStreamHarness((call) =>
    call.primary ? modelStream(Array.from({ length: 20 }, () => piece)) : modelStream(["Et kort svar."]),
  );

  const events = await ask(harness);
  const beforeRevising = events.slice(0, events.findIndex(({ data }) => data.stage === "revising"));

  assert.ok(deltaText(beforeRevising).length <= MAX_ANSWER_CHARS);
  assert.equal(done(events).answer, "Et kort svar.");
});
