import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { listIssueDates, loadRecentHistory } from "./lib/ai-news-history.mjs";

const hex = (character) => character.repeat(64);

async function withDir(files, run) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ai-news-history-"));
  try {
    for (const [name, content] of Object.entries(files)) await writeFile(path.join(dir, name), content, "utf8");
    return await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const issue = ({ title = "AI news", urls = [], story = hex("a"), set = hex("b") } = {}) => `---
title: ${JSON.stringify(title)}
lastUpdated: 2026-11-01
aiNews:
  storyFingerprint: "${story}"
  sourceSetFingerprint: ${set}
  sources:
${urls.map((url) => `    - "${url}"`).join("\n")}
---

Body text https://ignored.example/body
`;
const history = (files, extra = {}) => withDir(files, (newsDir) => loadRecentHistory({ newsDir, targetDate: "2026-11-13", ...extra }));

test("history rows carry title, fingerprints, date and one canonical URL each", async () => {
  const rows = await history({ "2026-11-10.mdx": issue({ title: "Ten", urls: ["https://openai.com/news/a?utm_source=rss", "https://blog.google/ai/b/"] }) });
  assert.deepEqual(rows, [
    { title: "Ten", canonicalUrl: "https://openai.com/news/a", storyFingerprint: hex("a"), sourceSetFingerprint: hex("b"), date: "2026-11-10" },
    { title: "Ten", canonicalUrl: "https://blog.google/ai/b", storyFingerprint: hex("a"), sourceSetFingerprint: hex("b"), date: "2026-11-10" },
  ]);
});

test("an issue without source URLs still yields one row", async () => {
  const rows = await history({ "2026-11-10.mdx": issue({ title: "Plain" }) });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].canonicalUrl, "");
  assert.equal(rows[0].title, "Plain");
});

test("an unquoted title and missing fingerprints are tolerated", async () => {
  const rows = await history({ "2026-11-10.mdx": "---\ntitle: Plain title\n---\nBody" });
  assert.deepEqual(rows, [{ title: "Plain title", canonicalUrl: "", storyFingerprint: undefined, sourceSetFingerprint: undefined, date: "2026-11-10" }]);
});

test("the target date, future dates, old dates and other files are ignored", async () => {
  const rows = await history({
    "2026-11-13.mdx": issue({ title: "target" }),
    "2026-11-14.mdx": issue({ title: "future" }),
    "2026-11-12.mdx": issue({ title: "recent" }),
    "2026-10-31.mdx": issue({ title: "edge in" }),
    "2026-10-30.mdx": issue({ title: "edge out" }),
    "index.mdx": issue({ title: "index" }),
    "2026-11-11.md": issue({ title: "wrong extension" }),
  });
  assert.deepEqual(rows.map((row) => row.title).sort(), ["edge in", "recent"]);
});

test("the day window is configurable", async () => {
  const rows = await history({ "2026-11-12.mdx": issue({ title: "one" }), "2026-11-09.mdx": issue({ title: "four" }) }, { days: 2 });
  assert.deepEqual(rows.map((row) => row.title), ["one"]);
});

test("a missing directory gives no history and no dates", async () => {
  const missing = path.join(os.tmpdir(), "ai-news-history-does-not-exist");
  assert.deepEqual(await loadRecentHistory({ newsDir: missing, targetDate: "2026-11-13" }), []);
  assert.deepEqual(await listIssueDates(missing), []);
});

test("issue dates are listed newest first and only for issue files", async () => {
  const files = { "2026-09-10.mdx": "x", "2026-11-01.mdx": "x", "2026-08-27.mdx": "x", "index.mdx": "x", "notes.txt": "x", "2026-11-02.md": "x" };
  assert.deepEqual(await withDir(files, listIssueDates), ["2026-11-01", "2026-09-10", "2026-08-27"]);
});

test("a directory that merely looks like an issue file does not appear in a plain listing of other names", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ai-news-history-"));
  try {
    await mkdir(path.join(dir, "sub"));
    assert.deepEqual(await listIssueDates(dir), []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
