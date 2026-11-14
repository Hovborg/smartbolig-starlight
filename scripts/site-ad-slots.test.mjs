// The fixed ad places: off without an ad unit number, hidden until a yes to
// ads, and only under a guide or a news article. docs/indtjening.md.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { AD_SLOTS } from "../src/data/ad-slots.mjs";
import { showAdSlots } from "../src/lib/ad-slots.mjs";
import { isArticlePage } from "../src/lib/article-page.mjs";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("an ad unit number is digits, or empty for a place that is off", () => {
  for (const [place, unit] of Object.entries(AD_SLOTS)) assert.match(unit, /^\d*$/, place);
});

test("every waiting place is shown once and asks AdSense for one ad", () => {
  const places = [{ hidden: true }, { hidden: true }];
  const win = {};
  const doc = { querySelectorAll: (selector) => (selector === "[data-ad-slot-place]" ? places : []) };
  showAdSlots(win, doc);
  assert.deepEqual(places, [{ hidden: false }, { hidden: false }]);
  assert.equal(win.adsbygoogle.length, 2);
  showAdSlots(win, doc);
  assert.equal(win.adsbygoogle.length, 2, "a place that is already shown is not asked for again");
});

test("a page without a place asks AdSense for nothing", () => {
  const win = {};
  showAdSlots(win, { querySelectorAll: () => [] });
  assert.equal(win.adsbygoogle, undefined);
});

test("the place is rendered hidden, without inline style, and only with an ad unit", async () => {
  const source = await read("src/components/AdSlot.astro");
  assert.match(source, /\{unit && \(/);
  assert.match(source, /<aside class="ad-slot" hidden data-ad-slot-place=/);
  assert.match(source, /<ins\s+class="adsbygoogle"/);
  assert.doesNotMatch(source, /style=/, "an inline style would need 'unsafe-inline' in the CSP");
  assert.doesNotMatch(source, /<script/, "the consent code shows the place; the component runs nothing");
});

test("comments and the ad place are only under a guide or a news article", async () => {
  for (const path of ["/da/home-assistant/zigbee2mqtt/", "/en/esp32/kom-godt-i-gang/", "/da/ai/nyheder/2026-11-14/", "/en/produkter/shelly/"]) {
    assert.equal(isArticlePage(path), true, path);
  }
  for (const path of ["/da/", "/en", "/da/home-assistant/", "/en/ai/nyheder/", "/da/juridisk/cookiepolitik/", "/da/kontakt/", "/en/om-os/", "/404", "/da/produkter"]) {
    assert.equal(isArticlePage(path), false, path);
  }
  const content = await read("src/components/MarkdownContent.astro");
  assert.match(content, /\{isArticlePage\(pathname\) && <AdSlot place="guideEnd" \/>\}\s*<Giscus \/>/);
  assert.match(await read("src/components/Giscus.astro"), /const showComments = isArticlePage\(pathname\);/);
});

test("only the consent code shows the places", async () => {
  const boot = await read("src/lib/consent/boot.mjs");
  assert.match(boot, /decision\.ad_storage && tags\.loadAds\(\)\) showAdSlots\(win, doc\)/);
});
