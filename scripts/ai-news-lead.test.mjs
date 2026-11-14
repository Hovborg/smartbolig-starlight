import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeHeadline, firstHeadline, mainStory } from "./lib/news-lead.mjs";

test("the main story is named in the title, else it is the first story", () => {
  assert.equal(mainStory("AI-nyheder, 14. november 2026: OpenAI Codex 0.169.0", "Something else"), "OpenAI Codex 0.169.0");
  assert.equal(mainStory("AI-nyheder, 10. september 2026", "OpenAI Codex releases: 0.154.0"), "OpenAI Codex releases: 0.154.0");
  assert.equal(mainStory("AI news, 10 September 2026"), "AI news, 10 September 2026", "with nothing else the title stands");
  assert.equal(mainStory("  "), "");
});

test("the first headline is read from the body without its number or markup", () => {
  const body = "---\ntitle: \"x\"\n---\n\nIntro.\n\n### 1. Claude&nbsp;Code releases: v2.1.239 &amp; more<wbr>\n\nText.\n\n### 2. Second story\n";
  assert.equal(firstHeadline(body), "Claude&nbsp;Code releases: v2.1.239 & more");
  assert.equal(firstHeadline("No stories here."), "");
  assert.equal(firstHeadline(undefined), "");
});

test("escaped characters in a heading are decoded, unknown entities are kept", () => {
  assert.equal(decodeHeadline("A &lt;b&gt; &#38; &#x26; &quot;c&quot; &unknown;"), "A <b> & & \"c\" &unknown;");
});
