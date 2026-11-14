import assert from "node:assert/strict";
import test from "node:test";
import { checkHead } from "./lib/seo-head-checks.mjs";

const ld = (graph) => `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph })}</script>`;
const crumbs = (count) => ({
  "@type": "BreadcrumbList",
  itemListElement: Array.from({ length: count }, (_, index) => ({ "@type": "ListItem", position: index + 1 })),
});
const page = ({ graph = [], head = "" } = {}) => `<head>${head}${ld(graph)}</head>`;

test("a clean page passes the head checks", () => {
  assert.deepEqual(checkHead(page({ graph: [{ "@type": "WebPage" }, crumbs(2)] })), []);
});

test("a page with HowTo JSON-LD fails", () => {
  const messages = checkHead(page({ graph: [{ "@type": "HowTo", name: "x" }] }));
  assert.match(messages.join("\n"), /HowTo/);
});

test("a breadcrumb list with fewer than two items fails", () => {
  assert.match(checkHead(page({ graph: [crumbs(1)] })).join("\n"), /BreadcrumbList has 1 item/);
  assert.match(checkHead(page({ graph: [crumbs(0)] })).join("\n"), /BreadcrumbList has 0 item/);
});

test("two generator metas fail and one passes", () => {
  const tag = (name) => `<meta name="generator" content="${name}"/>`;
  assert.match(checkHead(page({ head: tag("Astro") + tag("Starlight") })).join("\n"), /found 2/);
  assert.deepEqual(checkHead(page({ head: tag("Astro") })), []);
});

test("og:type article needs article structured data", () => {
  const article = '<meta property="og:type" content="article"/>';
  assert.match(checkHead(page({ head: article, graph: [{ "@type": "WebPage" }] })).join("\n"), /og:type/);
  assert.deepEqual(checkHead(page({ head: article, graph: [{ "@type": "TechArticle" }] })), []);
  assert.deepEqual(checkHead(page({ head: '<meta property="og:type" content="website"/>' })), []);
});

test("a JSON-LD block that is not valid JSON fails", () => {
  const html = '<script type="application/ld+json">{oops</script>';
  assert.match(checkHead(html).join("\n"), /not valid JSON/);
});
