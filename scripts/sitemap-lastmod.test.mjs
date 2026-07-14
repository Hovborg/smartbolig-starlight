import assert from "node:assert/strict";
import test from "node:test";

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
