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

test("the two real stream shapes, read 2026-11-14, give the answer once and without leading white space", async () => {
  const usage = { prompt_tokens: 0, completion_tokens: 1, total_tokens: 1, neurons: 0.02 };
  const gemma = (delta, finish = null) => ({
    id: "c1",
    object: "chat.completion.chunk",
    choices: [{ index: 0, delta, logprobs: null, finish_reason: finish, matched_stop: null }],
    usage,
    p: "x",
  });
  // Qwen repeats each piece of the answer in `response`, and starts with a blank line.
  const qwen = (delta, extra = {}) => ({
    id: "c2",
    object: "chat.completion.chunk",
    choices: [{ index: 0, delta, logprobs: null, finish_reason: null, token_ids: null }],
    tool_calls: [],
    usage,
    ...extra,
  });
  const tail = [{ id: "c", choices: [], usage }, { response: "", usage }];
  const shapes = {
    gemma: [
      gemma({ reasoning_content: null, role: "assistant", content: "" }),
      gemma({ reasoning_content: "Brugeren spørger om Zigbee." }),
      gemma({ content: "Brug en ", reasoning_content: null }),
      gemma({ content: "netværkskoordinator.", reasoning_content: null }),
      gemma({ reasoning_content: null }, "stop"),
      ...tail,
    ],
    qwen: [
      qwen({ role: "assistant", content: "" }, { response: "" }),
      qwen({ reasoning: "Jeg svarer kort.", reasoning_content: "Jeg svarer kort." }),
      qwen({ content: "\n\n" }, { response: "\n\n" }),
      qwen({ content: "Brug en " }, { response: "Brug en " }),
      qwen({ content: "netværkskoordinator." }, { response: "netværkskoordinator." }),
      { ...qwen({}), choices: [{ index: 0, delta: {}, finish_reason: "stop", stop_reason: null }] },
      ...tail,
    ],
  };

  for (const [name, payloads] of Object.entries(shapes)) {
    const events = await ask(createStreamHarness(() => sseStream(payloads)));

    assert.equal(deltaText(events), "Brug en netværkskoordinator.", name);
    assert.equal(done(events).answer, "Brug en netværkskoordinator.", name);
    assert.equal(done(events).diagnostics.route, "primary", name);
  }
});

test("a stream is whole when the model said so: a finish reason or [DONE] is enough", async () => {
  for (const options of [{ done: false }, { finish: null }]) {
    const harness = createStreamHarness(() => modelStream(["Et helt svar."], options));

    assert.equal(done(await ask(harness)).diagnostics.route, "primary", JSON.stringify(options));
  }
});

test("a stream that just closes is half an answer: it is withdrawn and rewritten by the fallback", async () => {
  const harness = createStreamHarness((call) =>
    call.primary
      ? modelStream(["Du skal først åbne Zigbee2MQTT. ", "Vælg derefter kanal 25."], { finish: null, done: false })
      : modelStream(["Et helt svar."]),
  );

  const events = await ask(harness);

  assert.deepEqual(stages(events), ["searching", "writing", "revising", "writing"]);
  assert.equal(done(events).answer, "Et helt svar.");
  assert.deepEqual(fallbackReasons(harness.logs), ["fallback_started:truncated_primary_response"]);
});

test("an error sent inside the stream is a failed model, not the end of an answer", async () => {
  const harness = createStreamHarness((call) =>
    call.primary
      ? sseStream([{ choices: [{ delta: { content: "Brug en " } }] }, { error: { message: "upstream" } }])
      : modelStream(["Et helt svar."]),
  );

  const events = await ask(harness);

  assert.deepEqual(stages(events), ["searching", "writing", "revising", "writing"]);
  assert.equal(done(events).answer, "Et helt svar.");
  assert.deepEqual(fallbackReasons(harness.logs), ["fallback_started:primary_error"]);
  assert.equal(harness.logs.find(({ event }) => event === "fallback_started").error, "ModelStreamError");
});

test("a stream in a shape the reader does not know is logged as that, not as a silent model", async () => {
  const strange = () => sseStream([{ token: "Brug " }, { token: "en koordinator." }]);
  const harness = createStreamHarness((call) => (call.primary ? strange() : modelStream(["Svar fra reserven."])));
  const both = createStreamHarness(strange);

  assert.equal(done(await ask(harness)).answer, "Svar fra reserven.");
  assert.deepEqual(fallbackReasons(harness.logs), ["fallback_started:unknown_primary_stream"]);

  assert.equal((await ask(both)).at(-2).event, "error");
  assert.deepEqual(fallbackReasons(both.logs), [
    "fallback_started:unknown_primary_stream",
    "fallback_failed:unknown_fallback_stream",
  ]);

  // The same when such a stream closes without [DONE], and when the text hides inside the delta.
  const shapes = [
    () => sseStream([{ token: "Brug " }, { token: "en koordinator." }], { done: false }),
    () => sseStream([{ choices: [{ delta: { text: "Brug en koordinator." } }] }, { choices: [{ delta: {}, finish_reason: "stop" }] }]),
  ];
  for (const shape of shapes) {
    const closed = createStreamHarness(shape);
    assert.equal((await ask(closed)).at(-2).event, "error");
    assert.deepEqual(fallbackReasons(closed.logs), [
      "fallback_started:unknown_primary_stream",
      "fallback_failed:unknown_fallback_stream",
    ]);
  }
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

test("a primary that breaks after text was shown is withdrawn and rewritten by the fallback", async () => {
  const harness = createStreamHarness((call) =>
    call.primary ? modelStream(["Brug en ", "netværks"], { failAfter: 1 }) : modelStream(["Et helt svar."]),
  );

  const events = await ask(harness);

  assert.equal(eventNames(events), "status sources status delta status status delta done message");
  assert.deepEqual(stages(events), ["searching", "writing", "revising", "writing"]);
  assert.equal(done(events).answer, "Et helt svar.");
  assert.equal(harness.calls.length, 2);
  assert.deepEqual(fallbackReasons(harness.logs), ["fallback_started:primary_error"]);
});

test("a fallback that breaks after text was shown ends in an error, never in a third model", async () => {
  const harness = createStreamHarness((call) =>
    call.primary ? modelStream(["Første "], { failAfter: 1 }) : modelStream(["Andet ", "udkast"], { failAfter: 1 }),
  );

  const events = await ask(harness);

  assert.equal(events.at(-2).event, "error");
  assert.equal(events.at(-2).data.code, "assistant_unavailable");
  assert.equal(done(events), undefined);
  assert.equal(harness.calls.length, 2);
  assert.ok(harness.logs.some(({ message }) => message === "SmartBolig chat generation failed"));
});

test("white space before the first word is not shown text: a failure after it needs no withdrawal", async () => {
  const harness = createStreamHarness((call) =>
    call.primary ? modelStream(["\n\n", " "], { failAfter: 2 }) : modelStream(["\n\nSvar fra ", "reserven."]),
  );

  const events = await ask(harness);

  assert.deepEqual(stages(events), ["searching", "writing"]);
  assert.equal(deltaText(events), "Svar fra reserven.");
  assert.equal(done(events).answer, "Svar fra reserven.");
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

test("a draft that was cut off is withdrawn in the older stream shape too", async () => {
  const harness = createStreamHarness((call) =>
    call.primary
      ? modelStream(["En halv sætning om noget vigtigt"], { shape: "legacy", finish: "length" })
      : modelStream(["Et helt svar."]),
  );

  const events = await ask(harness);

  assert.deepEqual(stages(events), ["searching", "writing", "revising", "writing"]);
  assert.equal(done(events).answer, "Et helt svar.");
  assert.deepEqual(fallbackReasons(harness.logs), ["fallback_started:truncated_primary_response"]);
});

test("a draft cut off inside a prompt internal shows none of it before it is withdrawn", async () => {
  const harness = createStreamHarness((call) =>
    call.primary ? modelStream(["Jeg kalder ", "search_smart"], { finish: "length" }) : modelStream(["Et helt svar."]),
  );

  const events = await ask(harness);
  const beforeRevising = events.slice(0, events.findIndex(({ data }) => data.stage === "revising"));

  assert.equal(deltaText(beforeRevising), "Jeg kalder ");
  assert.equal(done(events).answer, "Et helt svar.");
});

test("after a withdrawn draft the new one starts at its first word", async () => {
  const harness = createStreamHarness((call) =>
    call.primary
      ? modelStream(["Du skal først åbne Zigbee2MQTT. "], { finish: null, done: false })
      : modelStream(["\n\n", "Svar fra ", "reserven."]),
  );

  const events = await ask(harness);
  const afterRevising = events.slice(events.findIndex(({ data }) => data.stage === "revising"));

  assert.deepEqual(
    afterRevising.filter(({ event }) => event === "delta").map(({ data }) => data.text),
    ["Svar fra ", "reserven."],
  );
  assert.equal(done(events).answer, "Svar fra reserven.");
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

test("a prompt internal that arrives in several pieces is never shown in part", async () => {
  const drafts = [
    ["Jeg kalder ", "search", "_smart", "bolig", " for at finde guiden."],
    ["Se ", "<", "smartbolig_refer", "ence_data>", "hemmeligt", "</smartbolig_reference_data>"],
    ["Se ", "</OFFICIAL_", "REFERENCE_DATA", ">"],
  ];

  for (const draft of drafts) {
    const harness = createStreamHarness((call) => (call.primary ? modelStream(draft) : modelStream(["Et helt svar."])));
    const events = await ask(harness);
    const beforeRevising = events.slice(0, events.findIndex(({ data }) => data.stage === "revising"));

    assert.equal(deltaText(beforeRevising), draft[0], draft.join(""));
    assert.equal(done(events).answer, "Et helt svar.");
  }
});

test("text that only looks like the start of a prompt internal is shown once the next piece decides", async () => {
  const drafts = [
    ["Tryk på ", "<", "Enter", "> og skriv search", "_smart", ". Det er alt."],
    ["Brug filen search_smart"],
  ];

  for (const draft of drafts) {
    const events = await ask(createStreamHarness(() => modelStream(draft)));

    assert.equal(deltaText(events), draft.join(""));
    assert.equal(done(events).answer, draft.join(""));
    assert.deepEqual(stages(events), ["searching", "writing"]);
  }
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

  // Stalled after text was shown: the draft is withdrawn and the fallback answers.
  const halfway = createStreamHarness((call) =>
    call.primary ? modelStream(["Brug en "], { hangAfter: 1 }) : modelStream(["Svar fra reserven."]),
  );
  const halfwayReader = (await halfway.handler({ request: chatRequest(DOMAIN_QUESTION), env: chatEnv() })).body.getReader();
  await readUntil(halfwayReader, "event: delta");
  t.mock.timers.tick(PRIMARY_MODEL_TIMEOUT_MS);
  const rest = await readUntil(halfwayReader, "[DONE]");
  assert.match(rest, /"revising"[\s\S]*event: done/);
  assert.match(rest, /Svar fra reserven\./);
  assert.equal(halfway.calls[0].signal.aborted, true);
  assert.equal(halfway.calls.length, 2);
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
