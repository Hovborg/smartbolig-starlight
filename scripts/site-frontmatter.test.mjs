// Frontmatter that YAML cannot read stops the whole build after minutes.
// This catches the usual cause in seconds: a plain value with ": " or " #" in it.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

const DOCS = new URL("../src/content/docs/", import.meta.url);

/** The frontmatter lines of a page: everything between the first two "---" lines. */
export function frontmatterLines(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== "---") return [];
  const end = lines.indexOf("---", 1);
  return end === -1 ? [] : lines.slice(1, end);
}

/** Why YAML would misread a one-line plain value, or null when it is fine. */
export function plainValueFault(line) {
  const match = /^[\w-]+: (.+)$/.exec(line);
  if (!match) return null;
  const value = match[1];
  // Quoted, a block ("|", ">") or a list or map on one line is read as written.
  if (/^["'|>[{]/.test(value)) return null;
  if (value.includes(": ") || value.endsWith(":")) return "a colon followed by a space";
  if (value.includes(" #")) return "a space followed by #";
  if (/^[&*!%@`]/.test(value)) return "a first character with a meaning in YAML";
  return null;
}

test("the rule finds a value YAML would misread, and leaves quoted ones alone", () => {
  assert.equal(plainValueFault("description: Small tools: the price right now"), "a colon followed by a space");
  assert.equal(plainValueFault("title: Tools #1"), "a space followed by #");
  assert.equal(plainValueFault("title: *star"), "a first character with a meaning in YAML");
  assert.equal(plainValueFault('description: "Small tools: the price right now"'), null);
  assert.equal(plainValueFault("description: Klokken 12:30 er prisen lavest."), null);
  assert.equal(plainValueFault("title: Zigbee2MQTT"), null);
  assert.equal(plainValueFault("  - text: a: b"), null, "only top-level one-line values are checked");
  assert.deepEqual(frontmatterLines("---\ntitle: A\n---\nBody: text"), ["title: A"]);
  assert.deepEqual(frontmatterLines("No frontmatter"), []);
});

test("no page has a top-level frontmatter value that YAML would misread", async () => {
  const files = (await readdir(DOCS, { recursive: true })).filter((name) => /\.mdx?$/.test(name));
  assert.ok(files.length > 100, "the pages were found");
  const faults = [];
  for (const name of files) {
    const text = await readFile(new URL(name.replaceAll("\\", "/"), DOCS), "utf8");
    for (const line of frontmatterLines(text)) {
      const fault = plainValueFault(line);
      if (fault) faults.push(`${name}: ${fault}: ${line}`);
    }
  }
  assert.deepEqual(faults, []);
});
