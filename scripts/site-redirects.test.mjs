import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);

// Rules as [source, target, status]; comments and blank lines are skipped.
const rules = readFileSync(new URL("public/_redirects", root), "utf8")
  .split(/\r?\n/)
  .map((line) => line.replace(/\s+#.*$/, "").trim())
  .filter((line) => line && !line.startsWith("#"))
  .map((line) => line.split(/\s+/));

const isDynamic = ([source]) => source.includes("*") || /:[A-Za-z]/.test(source);
const find = (source) => rules.find(([s]) => s === source);

test("old top-level addresses redirect with 301 instead of answering 404", () => {
  const expected = {
    "/kontakt": "/da/kontakt/",
    "/kontakt/": "/da/kontakt/",
    "/sitemap.xml": "/sitemap-index.xml",
    "/index.html": "/da/",
    "/produkter/*": "/da/produkter/:splat",
    "/da/products/*": "/da/produkter/:splat",
    "/en/products/*": "/en/produkter/:splat",
  };
  for (const [source, target] of Object.entries(expected)) {
    assert.deepEqual(find(source)?.slice(1), [target, "301"], source);
  }
});

test("every exact redirect rule comes before the first splat or placeholder rule", () => {
  const firstDynamic = rules.findIndex(isDynamic);
  assert.ok(firstDynamic > 0);
  assert.equal(rules.slice(firstDynamic).filter((rule) => !isDynamic(rule)).length, 0);
});

test("the English products splat comes after every specific English product rule", () => {
  const splat = rules.findIndex(([source]) => source === "/en/products/*");
  const specific = rules.map(([source], index) => (source.startsWith("/en/products/") && index !== splat ? index : -1));
  assert.ok(Math.max(...specific) < splat);
});

test("every redirect target that is a page exists in the content", () => {
  for (const [source, target, status] of rules) {
    if (status !== "301" || !target.endsWith("/") || target.includes(":")) continue;
    const base = `src/content/docs${target.replace(/\/$/, "")}`;
    const found = existsSync(new URL(`${base}.mdx`, root)) || existsSync(new URL(`${base}/index.mdx`, root));
    assert.ok(found, `${source} redirects to ${target}, which has no page in src/content/docs`);
  }
});
