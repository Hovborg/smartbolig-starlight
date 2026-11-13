import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { renderIndex } from "./lib/ai-news-index-page.mjs";

const pagePath = (locale) => new URL(`../src/content/docs/${locale}/ai/nyheder/index.mdx`, import.meta.url);
// The repository stores LF; a Windows checkout with autocrlf holds CRLF.
const readPage = async (locale) => (await readFile(pagePath(locale), "utf8")).replace(/\r\n/g, "\n");
const dateOf = (page) => page.match(/^lastUpdated: (\d{4}-\d{2}-\d{2})$/m)[1];

for (const locale of ["da", "en"]) {
  test(`renderIndex reproduces the committed ${locale} index page`, async () => {
    const page = await readPage(locale);
    assert.equal(renderIndex({ locale, latestDate: dateOf(page) }), page);
  });
}

test("only lastUpdated changes with the date", () => {
  const a = renderIndex({ locale: "da", latestDate: "2026-01-01" }).split("\n");
  const b = renderIndex({ locale: "da", latestDate: "2026-12-31" }).split("\n");
  assert.deepEqual(a.map((line, index) => (line === b[index] ? null : index)).filter((index) => index !== null), [3]);
  assert.equal(a[3], "lastUpdated: 2026-01-01");
});

test("without a latest date today's date is used", () => {
  assert.ok(renderIndex({ locale: "en" }).includes(`lastUpdated: ${new Date().toISOString().slice(0, 10)}`));
});

test("each locale embeds its own feed component", () => {
  assert.match(renderIndex({ locale: "da", latestDate: "2026-01-01" }), /<AiNewsFeed locale="da" \/>/);
  assert.match(renderIndex({ locale: "en", latestDate: "2026-01-01" }), /<AiNewsFeed locale="en" \/>/);
});
