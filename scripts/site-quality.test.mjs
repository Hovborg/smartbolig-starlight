import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Node-RED function examples remain directly pasteable", async () => {
  for (const locale of ["da", "en"]) {
    const source = await read(`src/content/docs/${locale}/home-assistant/node-red.mdx`);
    assert.match(source, /^return msg;$/m);
  }
});

test("content audit understands Node-RED snippets and fails on real issues", async () => {
  const source = await read("scripts/content-audit.py");
  assert.match(source, /function __node_red_example__\(\)/);
  assert.match(source, /return 1 if total else 0/);
});

test("daily news automation keeps append-only content and image boundaries", async () => {
  const source = await read("scripts/openclaw-ai-news-daily.sh");
  for (const path of [
    "src/content/docs/da/ai/nyheder",
    "src/content/docs/en/ai/nyheder",
    "public/images/ai-news",
  ]) {
    assert.ok(source.includes(path), `missing protected path: ${path}`);
  }
  assert.ok(source.includes("Append-only content dirs"));
});
