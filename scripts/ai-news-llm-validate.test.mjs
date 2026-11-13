import assert from "node:assert/strict";
import test from "node:test";

import { ungroundedNumbers, storyText } from "./lib/news-llm/grounding.mjs";
import { extractJson } from "./lib/news-llm/json.mjs";
import { WORD_LIMITS } from "./lib/news-llm/limits.mjs";
import { validateLede, validateStory, validateVerdict } from "./lib/news-llm/validate.mjs";
import { validLede, validStory } from "./ai-news-llm-fixtures.mjs";

const words = (n) => Array.from({ length: n }, (_, i) => `w${String.fromCharCode(97 + (i % 26))}`).join(" ");
const withField = (path, value) => {
  const [field, locale] = path.split(".");
  const story = validStory();
  story[field][locale] = value;
  return story;
};

test("a well formed story has no problems", () => {
  assert.deepEqual(validateStory(validStory()), []);
});

test("a story that is not an object is rejected", () => {
  for (const value of [null, undefined, "text", [], 3]) assert.deepEqual(validateStory(value), ["story is not an object"]);
});

test("unexpected story fields are reported", () => {
  assert.deepEqual(validateStory({ ...validStory(), extra: 1 }), ["unexpected field: extra"]);
});

test("missing, blank and non-string fields are reported per locale", () => {
  const story = validStory();
  delete story.what;
  assert.deepEqual(validateStory(story), ["what.en: missing or empty", "what.da: missing or empty"]);
  assert.deepEqual(validateStory(withField("why.da", "   ")), ["why.da: missing or empty"]);
  assert.deepEqual(validateStory(withField("verify.en", 42)), ["verify.en: missing or empty"]);
  const oneLocale = validStory();
  delete oneLocale.uncertainty.da;
  assert.deepEqual(validateStory(oneLocale), ["uncertainty.da: missing or empty"]);
});

test("each field enforces its own upper word limit and allows the limit itself", () => {
  for (const field of ["what", "why", "verify", "uncertainty"]) {
    const limit = WORD_LIMITS[field];
    assert.deepEqual(validateStory(withField(`${field}.en`, words(limit))), [], `${field} at limit`);
    assert.deepEqual(validateStory(withField(`${field}.en`, words(limit + 1))), [`${field}.en: exceeds ${limit} words`]);
  }
});

test("fields under 8 words are rejected and 8 words are accepted", () => {
  assert.deepEqual(validateStory(withField("what.en", words(7))), ["what.en: under 8 words"]);
  assert.deepEqual(validateStory(withField("what.en", words(8))), []);
});

test("URLs, markdown and HTML tags are rejected in story fields", () => {
  const long = (extra) => `${words(9)} ${extra}`;
  assert.deepEqual(validateStory(withField("what.en", long("see https://example.com"))), ["what.en: contains a URL"]);
  assert.deepEqual(validateStory(withField("what.en", long("HTTP://EXAMPLE.COM"))), ["what.en: contains a URL"]);
  for (const markdown of ["**bold**", "[link](x)", "[1]", `\n# heading`]) {
    assert.deepEqual(validateStory(withField("what.en", long(markdown))), ["what.en: contains markdown syntax"], markdown);
  }
  assert.deepEqual(validateStory(withField("what.en", `# ${words(9)}`)), ["what.en: contains markdown syntax"]);
  assert.deepEqual(validateStory(withField("what.en", long("<b>bold</b>"))), ["what.en: contains an HTML tag"]);
  assert.deepEqual(validateStory(withField("what.en", long("a < b and c > d"))), []);
});

test("a well formed lede has no problems", () => {
  assert.deepEqual(validateLede(validLede()), []);
});

test("lede must be an object with both locales within limits", () => {
  assert.deepEqual(validateLede(null), ["lede is not an object"]);
  assert.deepEqual(validateLede([]), ["lede is not an object"]);
  assert.deepEqual(validateLede({ en: validLede().en }), ["lede.da: missing or empty"]);
  assert.deepEqual(validateLede({ ...validLede(), en: words(WORD_LIMITS.lede + 1) }), [`lede.en: exceeds ${WORD_LIMITS.lede} words`]);
  assert.deepEqual(validateLede({ ...validLede(), da: words(WORD_LIMITS.lede) }), []);
  assert.deepEqual(validateLede({ ...validLede(), da: "Too short" }), ["lede.da: under 8 words"]);
  assert.deepEqual(validateLede({ ...validLede(), en: `${words(9)} https://x.example` }), ["lede.en: contains a URL"]);
});

test("a pass without issues and a rejection with a quoted claim are valid verdicts", () => {
  assert.deepEqual(validateVerdict({ pass: true, issues: [] }), { pass: true, issues: [] });
  const verdict = validateVerdict({ pass: false, issues: [{ field: "why.en", claim: "  it is faster ", type: "stronger", source: " says slower " }] });
  assert.deepEqual(verdict, { pass: false, issues: [{ field: "why.en", claim: "it is faster", type: "stronger", source: "says slower" }] });
});

test("malformed verdict shapes throw", () => {
  for (const value of [null, "pass", [], { issues: [] }, { pass: "true", issues: [] }, { pass: true }, { pass: true, issues: "none" }]) {
    assert.throws(() => validateVerdict(value), /invalid verdict/);
  }
});

test("an issue must quote a claim", () => {
  for (const issue of [null, "text", {}, { claim: "" }, { claim: "   " }, { claim: 5 }]) {
    assert.throws(() => validateVerdict({ pass: false, issues: [issue] }), /does not quote a claim/);
  }
});

test("a pass with outstanding issues throws", () => {
  assert.throws(() => validateVerdict({ pass: true, issues: [{ claim: "x" }] }), /cannot pass with outstanding issues/);
});

test("a rejection without issues throws", () => {
  assert.throws(() => validateVerdict({ pass: false, issues: [] }), /did not explain its issues/);
});

test("issue fields get defaults: unknown type, missing field and source, bounded field name", () => {
  const { issues } = validateVerdict({ pass: false, issues: [{ claim: "c", type: "made-up" }, { claim: "d", field: "f".repeat(100), type: "site claim" }] });
  assert.deepEqual(issues[0], { field: "story", claim: "c", type: "unsupported", source: "not in source" });
  assert.equal(issues[1].field.length, 40);
  assert.equal(issues[1].type, "site claim");
});

test("extractJson strips think blocks and code fences", () => {
  assert.deepEqual(extractJson('<think>reasoning {"a": 0}</think>{"a":1}'), { a: 1 });
  assert.deepEqual(extractJson('<THINK>x\ny</THINK>\n```json\n{"a":2}\n```'), { a: 2 });
  assert.deepEqual(extractJson('Here you go: {"a":3} done'), { a: 3 });
  assert.deepEqual(extractJson('```\n{"nested":{"b":[1,2]}}\n```'), { nested: { b: [1, 2] } });
});

test("extractJson throws when there is no object or the JSON is broken", () => {
  assert.throws(() => extractJson("no json here"), /no JSON object/);
  assert.throws(() => extractJson("<think>{}</think>"), /no JSON object/);
  assert.throws(() => extractJson("{not json}"), SyntaxError);
});

test("numbers that are absent from the evidence are reported", () => {
  assert.deepEqual(ungroundedNumbers("The plan costs 20 dollars and 3 seats", "The plan costs 20 dollars"), ["3"]);
  assert.deepEqual(ungroundedNumbers("No digits at all", "Anything 1 2 3"), []);
  assert.deepEqual(ungroundedNumbers("Costs 20", ""), ["20"]);
});

test("Danish and English number formatting is tolerated", () => {
  assert.deepEqual(ungroundedNumbers("Prisen er 1,5 millioner", "The price is 1.5 million"), []);
  assert.deepEqual(ungroundedNumbers("10.000 brugere", "10,000 users"), []);
  assert.deepEqual(ungroundedNumbers("10,000 users", "10.000 brugere"), []);
  assert.deepEqual(ungroundedNumbers("2,5 millioner", "2.7 million"), ["2.5"]);
});

test("version numbers and dates are compared by their digit groups", () => {
  assert.deepEqual(ungroundedNumbers("Update to v2.1.3 today", "Release 2.1.3 is out"), []);
  assert.deepEqual(ungroundedNumbers("Update to v2.1.4", "Release 2.1.3 is out"), ["2.1.4"]);
  assert.deepEqual(ungroundedNumbers("Published 2026-11-13", "published: 2026-11-13"), []);
  assert.deepEqual(ungroundedNumbers("Published 2026-11-14", "published: 2026-11-13"), ["2026.11.14"]);
});

test("storyText flattens every locale of every field", () => {
  assert.equal(storyText({ what: { en: "a", da: "b" }, why: { en: "c" } }), "a\nb\nc");
  assert.equal(storyText(null), "");
});
