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

const find = (source) => rules.find(([s]) => s === source);

test("old top-level addresses redirect with 301 instead of answering 404", () => {
  const expected = {
    "/kontakt": "/da/kontakt/",
    "/kontakt/": "/da/kontakt/",
    "/sitemap.xml": "/sitemap-index.xml",
    "/index.html": "/da/",
    "/produkter": "/da/produkter/",
    "/produkter/": "/da/produkter/",
    "/da/products": "/da/produkter/",
    "/da/products/": "/da/produkter/",
    "/produkter/:slug": "/da/produkter/:slug/",
    "/da/products/:slug": "/da/produkter/:slug/",
    "/en/products/:slug": "/en/produkter/:slug/",
    "/produkter/:slug/*": "/da/produkter/:slug/:splat",
    "/da/products/:slug/*": "/da/produkter/:slug/:splat",
    "/en/products/:slug/*": "/en/produkter/:slug/:splat",
  };
  for (const [source, target] of Object.entries(expected)) {
    assert.deepEqual(find(source)?.slice(1), [target, "301"], source);
  }
});

// That exact rules come before dynamic ones is tested in site-quality.test.mjs.

// Every dynamic rule that matches an address, with its target filled in.
// Cloudflare does not let the rule written first win (on the live site a `*`
// rule beat the `:slug` rule above it, 2026-11-14), so an address must match
// one dynamic rule only.
const escaped = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pattern = (source) => new RegExp(`^${source.split("*").map(escaped).join("(?<splat>.*)").replace(/:([A-Za-z]\w*)/g, "(?<$1>[^/]+)")}$`);
const dynamicTargets = (address) =>
  rules
    .filter(([source]) => /[*:]/.test(source))
    .flatMap(([source, target]) => {
      const groups = pattern(source).exec(address)?.groups;
      return groups ? [Object.entries(groups).reduce((to, [name, value]) => to.replaceAll(`:${name}`, value), target)] : [];
    });

test("an old product or news address is one redirect, whichever dynamic rule Cloudflare tries first", () => {
  const cases = {
    "/produkter/shelly": "/da/produkter/shelly/",
    "/produkter/shelly/": "/da/produkter/shelly/",
    "/da/products/shelly": "/da/produkter/shelly/",
    "/da/products/shelly/": "/da/produkter/shelly/",
    "/en/products/a-new-slug": "/en/produkter/a-new-slug/",
    "/en/products/a-new-slug/": "/en/produkter/a-new-slug/",
    "/en/products/a-new-slug/deeper/": "/en/produkter/a-new-slug/deeper/",
    "/en/ai/news/2026-11-14": "/en/ai/nyheder/2026-11-14/",
    "/en/ai/news/2026-11-14/": "/en/ai/nyheder/2026-11-14/",
  };
  for (const [address, target] of Object.entries(cases)) {
    assert.deepEqual(dynamicTargets(address), [target], address);
  }
});

// The shapes a dynamic rule can match: `:name` becomes "x"; a splat becomes nothing, "a" and "a/b/".
const samples = (source) => {
  const filled = source.replace(/:([A-Za-z]\w*)/g, "x");
  return filled.includes("*") ? ["", "a", "a/b/"].map((rest) => filled.replace("*", rest)) : [filled];
};

test("no address made from a dynamic rule matches another dynamic rule", () => {
  const dynamic = rules.filter(([source]) => /[*:]/.test(source));
  assert.ok(dynamic.length > 0);
  for (const [source] of dynamic) {
    for (const address of samples(source)) {
      const matches = dynamic.filter(([other]) => pattern(other).test(address)).map(([other]) => other);
      assert.deepEqual(matches, [source], `${address} matches ${matches.join(" and ")}`);
    }
  }
});

test("the English products splat comes after every specific English product rule", () => {
  const splat = rules.findIndex(([source]) => source === "/en/products/:slug/*");
  const specific = rules.map(([source], index) => (source.startsWith("/en/products/") && index !== splat ? index : -1));
  assert.ok(splat > -1);
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
