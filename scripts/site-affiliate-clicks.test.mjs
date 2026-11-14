// A press on a shop link is reported to Google Analytics, and only by the
// code that runs after a yes to statistics. docs/indtjening.md.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { CLICK_EVENT, watchAffiliateClicks } from "../src/lib/affiliate-clicks.mjs";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

function page() {
  const sent = [];
  const listeners = {};
  const win = { gtag: (...args) => sent.push(args) };
  const doc = { addEventListener: (type, run) => (listeners[type] = run) };
  watchAffiliateClicks(win, doc);
  return { sent, listeners };
}

const shopLink = { dataset: { affiliateProduct: "sonoff-zigbee-dongle-e", affiliateStore: "proshop" } };
/** A press somewhere inside `link` (or outside every shop link when it is null). */
const press = (link, extra = {}) => ({ type: "click", target: { closest: (selector) => (selector === "a[data-affiliate-product]" ? link : null) }, ...extra });

test("a press on a shop link is reported with the product and the shop", () => {
  const { sent, listeners } = page();
  listeners.click(press(shopLink));
  assert.deepEqual(sent, [["event", CLICK_EVENT, { product: "sonoff-zigbee-dongle-e", store: "proshop" }]]);
});

test("a press elsewhere is not reported", () => {
  const { sent, listeners } = page();
  listeners.click(press(null));
  listeners.click({ type: "click", target: null });
  assert.deepEqual(sent, []);
});

test("the middle button counts, the right button does not", () => {
  const { sent, listeners } = page();
  listeners.auxclick(press(shopLink, { type: "auxclick", button: 2 }));
  assert.equal(sent.length, 0);
  listeners.auxclick(press(shopLink, { type: "auxclick", button: 1 }));
  assert.equal(sent.length, 1);
});

test("the two link components carry what the report reads", async () => {
  for (const file of ["src/components/AffiliateLink.astro", "src/components/ProductCard.astro"]) {
    const source = await read(file);
    assert.match(source, /data-affiliate-product=\{product\}/, file);
    assert.match(source, /data-affiliate-store=\{store\}/, file);
  }
});
