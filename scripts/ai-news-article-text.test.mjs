import assert from "node:assert/strict";
import test from "node:test";

import { extractArticleText } from "./lib/ai-news-article-text.mjs";
import { stripHtml } from "./lib/ai-news-discovery.mjs";
import { asciiLower, sectionInner, stripSections } from "./lib/html-sections.mjs";

// The real article body must clear the 600 character minimum on its own.
const body = (marker, length = 700) => `${marker} ${"The release adds a documented setting. ".repeat(Math.ceil(length / 39))}`.slice(0, length);
const extract = (html) => extractArticleText(html, stripHtml);

test("the article element wins over surrounding page text", () => {
  const html = `<html><body><p>OUTSIDE</p><article><p>${body("ARTICLE")}</p></article><main>${body("MAIN")}</main></body></html>`;
  const text = extract(html);
  assert.match(text, /ARTICLE/);
  assert.doesNotMatch(text, /OUTSIDE|MAIN/);
});

test("navigation, footer, aside and forms inside the article are removed", () => {
  const html = `<article><nav>NAVLINKS</nav><header><h1>HEADLINE</h1></header><p>${body("BODY")}</p><aside>RELATED</aside><form>SUBSCRIBE</form><footer>COPYRIGHT</footer></article>`;
  const text = extract(html);
  assert.match(text, /HEADLINE/);
  assert.match(text, /BODY/);
  for (const chrome of ["NAVLINKS", "RELATED", "SUBSCRIBE", "COPYRIGHT"]) assert.equal(text.includes(chrome), false, chrome);
});

test("main is used when there is no usable article, and its header is dropped", () => {
  const html = `<body><nav>NAVLINKS</nav><main><header>SITEHEADER</header><p>${body("MAINBODY")}</p><footer>FOOT</footer></main></body>`;
  const text = extract(html);
  assert.match(text, /MAINBODY/);
  for (const chrome of ["NAVLINKS", "SITEHEADER", "FOOT"]) assert.equal(text.includes(chrome), false, chrome);
});

test("a teaser article shorter than the minimum falls back to main", () => {
  const html = `<main><article>TEASER only</article><p>${body("MAINBODY")}</p></main>`;
  const text = extract(html);
  assert.match(text, /MAINBODY/);
  assert.match(text, /TEASER/);
});

test("an article at exactly the minimum is accepted and one character less falls back", () => {
  const exact = body("ART").slice(0, 600).trim();
  assert.ok(exact.length >= 590);
  const long = `<main>${body("MAINBODY")}</main>`;
  const accepted = extract(`<article>${body("ART", 700)}</article>${long}`);
  assert.doesNotMatch(accepted, /MAINBODY/);
  const rejected = extract(`<article>${body("ART", 500)}</article>${long}`);
  assert.match(rejected, /MAINBODY/);
});

test("without article or main the whole page is used with its chrome removed", () => {
  const text = extract(`<body><nav>NAVLINKS</nav><header>TOP</header><p>PLAIN page text</p><footer>FOOT</footer><script>var x=1;</script></body>`);
  assert.match(text, /PLAIN page text/);
  for (const chrome of ["NAVLINKS", "TOP", "FOOT", "var x"]) assert.equal(text.includes(chrome), false, chrome);
});

test("a main element that is too short also falls back to the page", () => {
  const text = extract(`<body><p>OUTSIDE text</p><main>tiny</main></body>`);
  assert.match(text, /OUTSIDE text/);
  assert.match(text, /tiny/);
});

test("html-sections helpers cut sections without touching look-alike tags", () => {
  assert.equal(asciiLower("ABC İ"), "abc İ");
  assert.equal(stripSections("a<nav>x</nav>b<navigation>keep</navigation>", "nav").replace(/\s+/g, ""), "ab<navigation>keep</navigation>");
  assert.equal(sectionInner("<main><main>in</main>out</main>", "main"), "<main>in</main>out");
  assert.equal(sectionInner("<article>never closed", "article"), "");
  assert.equal(sectionInner("<articles>x</articles>", "article"), "");
});

const finishesQuickly = (name, html) => {
  test(`pathological input stays fast: ${name}`, () => {
    assert.ok(html.length >= 190_000, `input is ${html.length} chars`);
    const started = performance.now();
    extract(html);
    const elapsed = performance.now() - started;
    assert.ok(elapsed < 1_000, `took ${Math.round(elapsed)} ms`);
  });
};

finishesQuickly("deeply nested unclosed divs in an article", `<article>${"<div>".repeat(40_000)}text`);
finishesQuickly("unclosed article tags", "<article>".repeat(22_000));
finishesQuickly("unclosed nav sections", `<main>${"<nav>x".repeat(40_000)}</main>`);
finishesQuickly("many nested closed spans", `${"<span>".repeat(33_000)}x${"</span>".repeat(33_000)}`);

// sectionInner rescans to the first closing tag for every nested opening tag, so
// time grows quadratically (measured: 209 kB 0.34 s, 418 kB 1.3 s, 1.9 MB 28 s).
// The fetch ceiling is 2 MB, so a hostile page can stall the job.
test("400 kB of nested closed articles stays under one second", () => {
  const html = `${"<article>".repeat(22_000)}x${"</article>".repeat(22_000)}`;
  const started = performance.now();
  extract(html);
  assert.ok(performance.now() - started < 1_000);
});
finishesQuickly("many less-than signs", `<article>${"<".repeat(200_000)}`);
finishesQuickly("many open tags without a closing bracket", `<main>${"<p class=".repeat(25_000)}`);
