// The assistant searches the site before every answer and decides from the result
// whether the model gets it. The model is never offered a tool.
import assert from "node:assert/strict";
import test from "node:test";

import { MAX_SEARCH_QUERY_CHARS, createChatHandler, createWorkersAgent } from "../functions/api/chat.js";
import { USEFUL_SCORE } from "../functions/lib/site-search/search.js";
import { chatEnv, chatRequest, completion, deltaText, eventNames, modelStream, readEvents } from "./lib/chat-stream-fakes.mjs";

const NO_KEYWORD = "Hvordan får jeg lyset til at tænde ved bevægelse?";
const KEYWORD = "Hvordan fejlsøger jeg en Zigbee-sensor?";
const hit = (score) => ({
  url: "https://smartbolig.net/da/automationer/bevaegelseslys/",
  title: "Bevægelseslys",
  heading: "Sådan gør du",
  text: "Brug en bevægelsessensor.",
  score,
});
const SOURCE = { title: "Bevægelseslys", url: "https://smartbolig.net/da/automationer/bevaegelseslys/" };

/** A handler around a scripted model and a scripted site search. */
function harness(found) {
  const modelInputs = [];
  const searches = [];
  const handler = createChatHandler({
    agentRunner: createWorkersAgent({
      aiRunImpl: async (_binding, _model, input) => {
        modelInputs.push(input);
        return input.stream ? modelStream(["Et ", "svar."]) : completion("Et svar.");
      },
    }),
    createRequestId: () => "req-search-first",
    logger: { error() {}, warn() {} },
    siteSearch: () => async (query) => {
      searches.push(query);
      if (found instanceof Error) throw found;
      return found;
    },
  });
  const ask = async (content, options = {}) => {
    const response = await handler({ request: chatRequest(content, { stream: false, ...options }), env: chatEnv() });
    return response.json();
  };
  return { ask, handler, modelInputs, searches };
}

const systemOf = (input) => input.messages[0].content;
const lastOf = (input) => input.messages.at(-1).content;
const NOT_FOUND_PROMPT = /no relevant SmartBolig page was found/i;
const UNAVAILABLE_PROMPT = /search is currently unavailable/i;

function assertNoTools(modelInputs) {
  assert.ok(modelInputs.length > 0);
  for (const input of modelInputs) assert.equal(Object.hasOwn(input, "tools"), false);
}

test("a question without a smart home word and a strong result is answered from the result, with sources", async () => {
  const { ask, modelInputs, searches } = harness([hit(USEFUL_SCORE)]);

  const body = await ask(NO_KEYWORD);

  assert.deepEqual(searches, [NO_KEYWORD]);
  assert.equal(modelInputs.length, 1);
  assertNoTools(modelInputs);
  assert.match(lastOf(modelInputs[0]), /smartbolig_reference_data/);
  assert.match(lastOf(modelInputs[0]), /Brug en bevægelsessensor/);
  assert.match(systemOf(modelInputs[0]), /reference data has already been supplied/i);
  assert.deepEqual(body.sources, [SOURCE]);
  assert.equal(body.sourceMode, "mixed");
});

for (const [name, found] of [
  ["a result just below the line", [hit(11.99)]],
  ["no result at all", []],
  ["a result without a score", [{ ...hit(0), score: undefined }]],
]) {
  test(`a question without a smart home word and ${name} is answered from general knowledge`, async () => {
    const { ask, modelInputs, searches } = harness(found);

    const body = await ask(NO_KEYWORD);

    assert.equal(searches.length, 1);
    assert.equal(modelInputs.length, 1);
    assertNoTools(modelInputs);
    assert.doesNotMatch(lastOf(modelInputs[0]), /smartbolig_reference_data/);
    assert.doesNotMatch(lastOf(modelInputs[0]), /bevægelsessensor/);
    assert.match(systemOf(modelInputs[0]), NOT_FOUND_PROMPT);
    assert.doesNotMatch(systemOf(modelInputs[0]), /reference data has already been supplied/i);
    assert.deepEqual(body.sources, []);
    assert.equal(body.sourceMode, "general");
  });
}

test("a question with a smart home word is answered from its result however weak the result is", async () => {
  const { ask, modelInputs } = harness([hit(1.5)]);

  const body = await ask(KEYWORD);

  assert.equal(modelInputs.length, 1);
  assertNoTools(modelInputs);
  assert.match(lastOf(modelInputs[0]), /Brug en bevægelsessensor/);
  assert.match(systemOf(modelInputs[0]), /reference data has already been supplied/i);
  assert.deepEqual(body.sources, [SOURCE]);
});

test("a follow-up is searched with the question before it, the latest question first", async () => {
  const { handler, searches } = harness([]);
  const post = (messages) =>
    handler({ request: chatRequest("", { stream: false, body: JSON.stringify({ locale: "da", messages }) }), env: chatEnv() });
  const earlier = "A".repeat(300);
  const latest = "B".repeat(300);

  await post([
    { role: "user", content: "Allerførste spørgsmål" },
    { role: "assistant", content: "Et svar" },
    { role: "user", content: earlier },
    { role: "assistant", content: "Endnu et svar" },
    { role: "user", content: latest },
  ]);
  await post([{ role: "user", content: "Hvad koster en pære?" }]);

  assert.deepEqual(searches, [`${latest}\n${earlier}`.slice(0, MAX_SEARCH_QUERY_CHARS), "Hvad koster en pære?"]);
  assert.equal(searches[0].length, MAX_SEARCH_QUERY_CHARS);
  assert.ok(searches[0].startsWith(`${latest}\n`));
});

test("a search that fails for a question without a smart home word gives one run with the unavailable prompt", async () => {
  const { ask, modelInputs } = harness(new Error("index offline"));

  const body = await ask(NO_KEYWORD);

  assert.equal(modelInputs.length, 1);
  assertNoTools(modelInputs);
  assert.match(systemOf(modelInputs[0]), UNAVAILABLE_PROMPT);
  assert.doesNotMatch(systemOf(modelInputs[0]), NOT_FOUND_PROMPT);
  assert.doesNotMatch(lastOf(modelInputs[0]), /smartbolig_reference_data/);
  assert.deepEqual(body.sources, []);
  assert.equal(body.sourceMode, "general");
});

test("a search that fails for a question with a smart home word still reports it to the one run", async () => {
  const { ask, modelInputs } = harness(new Error("index offline"));

  const body = await ask(KEYWORD);

  assert.equal(modelInputs.length, 1);
  assert.match(lastOf(modelInputs[0]), /"unavailable":true/);
  assert.deepEqual(body.sources, []);
});

test("a streamed question without a smart home word reports searching, then writing, then the text", async () => {
  const { handler, modelInputs } = harness([hit(30)]);

  const events = await readEvents(await handler({ request: chatRequest(NO_KEYWORD), env: chatEnv() }));

  assert.deepEqual(
    events.filter(({ event }) => event === "status").map(({ data }) => data.stage),
    ["searching", "writing"],
  );
  assert.equal(eventNames(events), "status sources status delta delta done message");
  assert.deepEqual(events[1].data, { sources: [SOURCE] });
  assert.equal(deltaText(events), "Et svar.");
  assert.equal(modelInputs.length, 1);
  assert.equal(modelInputs[0].stream, true);
  assertNoTools(modelInputs);
});

test("a streamed question the site has nothing about still streams, with no sources", async () => {
  const { handler, modelInputs } = harness([hit(2)]);

  const events = await readEvents(await handler({ request: chatRequest("Hej"), env: chatEnv() }));

  assert.deepEqual(
    events.filter(({ event }) => event === "status").map(({ data }) => data.stage),
    ["searching", "writing"],
  );
  assert.deepEqual(events[1].data, { sources: [] });
  assert.equal(deltaText(events), "Et svar.");
  assert.equal(modelInputs.length, 1);
  assert.equal(modelInputs[0].stream, true);
  assertNoTools(modelInputs);
});
