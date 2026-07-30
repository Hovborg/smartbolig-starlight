import assert from "node:assert/strict";
import test from "node:test";

import {
  contentRelativePathToUrl,
  extractFrontmatterLastmod,
  parseGitLastmodLog,
} from "./lib/content-lastmod.mjs";
import { addLastmod } from "./lib/sitemap-lastmod.mjs";

const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://smartbolig.net/da/</loc><xhtml:link rel="alternate" hreflang="da" href="https://smartbolig.net/da/"/></url><url><loc>https://smartbolig.net/da/ai/nyheder/2026-07-14/</loc></url><url><loc>https://smartbolig.net/da/ukendt/</loc></url></urlset>`;

test("addLastmod inserts lastmod right after loc for resolvable urls", () => {
  const dates = new Map([
    ["https://smartbolig.net/da/", "2026-07-01"],
    ["https://smartbolig.net/da/ai/nyheder/2026-07-14/", "2026-07-14"],
  ]);
  const out = addLastmod(xml, (loc) => dates.get(loc));

  assert.match(out, /<loc>https:\/\/smartbolig\.net\/da\/<\/loc><lastmod>2026-07-01<\/lastmod>/);
  assert.match(out, /<loc>https:\/\/smartbolig\.net\/da\/ai\/nyheder\/2026-07-14\/<\/loc><lastmod>2026-07-14<\/lastmod>/);
  // Unresolvable URLs keep their entry untouched, without a lastmod.
  assert.match(out, /<loc>https:\/\/smartbolig\.net\/da\/ukendt\/<\/loc><\/url>/);
  // Existing alternates survive.
  assert.match(out, /hreflang="da"/);
});

test("addLastmod rejects malformed dates from the resolver", () => {
  const out = addLastmod(xml, () => "ikke-en-dato");
  assert.doesNotMatch(out, /<lastmod>/);
});

test("addLastmod is idempotent when the sitemap is finalized more than once", () => {
  const resolve = (loc) => loc.endsWith("/da/") ? "2026-07-01" : undefined;
  const once = addLastmod(xml, resolve);
  const twice = addLastmod(once, resolve);

  assert.equal(twice, once);
  assert.equal((twice.match(/<lastmod>/g) ?? []).length, 1);
});

test("frontmatter lastUpdated wins over publication date", () => {
  const source = `---
title: Example
date: 2026-05-01
lastUpdated: "2026-07-30"
---`;
  assert.equal(extractFrontmatterLastmod(source), "2026-07-30");
  assert.equal(extractFrontmatterLastmod("---\ntitle: Example\nlastUpdated: false\n---"), undefined);
});

test("git history keeps the newest truthful date for each current content path", () => {
  const log = `__SMARTBOLIG_DATE__2026-07-30

src/content/docs/da/index.mdx
src/content/docs/en/index.mdx

__SMARTBOLIG_DATE__2026-06-14

src/content/docs/da/index.mdx
src/content/docs/da/automationer/index.mdx
`;
  const dates = parseGitLastmodLog(log);
  assert.equal(dates.get("src/content/docs/da/index.mdx"), "2026-07-30");
  assert.equal(dates.get("src/content/docs/en/index.mdx"), "2026-07-30");
  assert.equal(dates.get("src/content/docs/da/automationer/index.mdx"), "2026-06-14");
});

test("content paths map to the canonical localized sitemap URL", () => {
  assert.equal(contentRelativePathToUrl("da/index.mdx"), "https://smartbolig.net/da/");
  assert.equal(
    contentRelativePathToUrl("en/home-assistant/index.mdx"),
    "https://smartbolig.net/en/home-assistant/",
  );
  assert.equal(
    contentRelativePathToUrl("da/home-assistant/hacs.mdx"),
    "https://smartbolig.net/da/home-assistant/hacs/",
  );
});
