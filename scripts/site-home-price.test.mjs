// The homepage's electricity price card (src/lib/home-price.mjs), run against
// a small stand-in for the page: what it writes when the prices arrive, what it
// does when they do not, and what it asks the endpoint for.
import assert from "node:assert/strict";
import test from "node:test";
import { startHomePrice } from "../src/lib/home-price.mjs";
import { formatNumber } from "../src/lib/tools/format.mjs";
import { priceCopy } from "../src/lib/tools/price-copy.mjs";
import { REFRESH_SECONDS } from "../src/lib/tools/price-data.mjs";
import { toOre } from "../src/lib/tools/price-window.mjs";

const HOUR = 3600;
const MIDNIGHT = Date.UTC(2026, 10, 13, 23) / 1000; // 2026-11-14 00:00 in Denmark
const PARTS = ["value", "period", "area", "level", "run", "spark", "ticks", "legend-best"];

// As much of an element as the card uses.
function node(name = "div") {
  return {
    name,
    textContent: "",
    hidden: false,
    dataset: {},
    style: {},
    attributes: {},
    children: [],
    setAttribute(key, value) {
      this.attributes[key] = String(value);
    },
    append(...kids) {
      this.children.push(...kids);
    },
    replaceChildren(...kids) {
      this.children = kids;
    },
  };
}

/** Four quarters per hour from `start`, priced by the hour's number in the day. */
const quarters = (priceOfHour, { start = MIDNIGHT, hours = 24 } = {}) =>
  Array.from({ length: hours * 4 }, (_, index) => [start + index * 900, priceOfHour(Math.floor(index / 4))]);
const answer = (points, { area = "DK1", date = new Date() } = {}) =>
  new Response(JSON.stringify({ area, points }), { headers: { date: date.toUTCString() } });
const shown = (dkkPerMwh) => formatNumber(toOre(dkkPerMwh, { vat: true, addOn: 0 }), "da", 1);
const settle = async () => {
  for (let turn = 0; turn < 10; turn += 1) await new Promise((resolve) => setImmediate(resolve));
};

/** The card on a page: `reply(callNumber)` is what the endpoint answers. Always call stop(). */
async function page(reply, { at = MIDNIGHT + 9 * HOUR + 300 } = {}) {
  const parts = Object.fromEntries(PARTS.map((name) => [name, node()]));
  parts.value.textContent = "–";
  const root = node("article");
  root.dataset = { lang: "da", state: "loading", sparkLabel: "Lavest {min} {minAt}, højest {max} {maxAt}" };
  root.querySelector = (selector) => parts[/data-part="([^"]+)"/.exec(selector)[1]];
  const listeners = new Map();
  const asked = [];
  const device = { now: at };
  globalThis.document = {
    visibilityState: "visible",
    createElement: node,
    createElementNS: (_namespace, name) => node(name),
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type) => listeners.delete(type),
  };
  globalThis.fetch = async (url) => {
    asked.push(url);
    return reply(asked.length);
  };
  const stop = startHomePrice(root, { clock: () => device.now });
  await settle();
  const bars = (kind) => parts.spark.children.filter((bar) => bar.attributes.class.endsWith(`--${kind}`)).length;
  return { root, parts, asked, listeners, device, stop, bars };
}

// A cheap run this afternoon, in a day that otherwise gets dearer hour by hour.
const dipToday = (hour) => (hour >= 14 && hour < 17 ? 100 : 500 + hour);

test("when the prices arrive the card shows this quarter's price with VAT, today's hours and the cheapest run", async () => {
  const card = await page(() => answer(quarters(dipToday)));
  try {
    const { root, parts, asked, bars } = card;
    assert.equal(root.dataset.state, "ready");
    assert.deepEqual(asked, ["/api/elpris"], "the first call names no area: the endpoint guesses");
    assert.equal(parts.value.textContent, shown(509));
    assert.ok(toOre(509, { vat: true, addOn: 0 }) > toOre(509, { vat: false, addOn: 0 }), "the price shown has VAT in it");
    assert.equal(parts.area.textContent, priceCopy.da.area.DK1);
    assert.equal(parts.level.textContent, priceCopy.da.level[parts.level.dataset.level]);
    assert.match(parts.period.textContent, /09:00/);
    assert.match(parts.run.textContent, /14:00/);

    assert.equal(parts.spark.children.length, 24, "one bar per hour of today");
    assert.deepEqual([bars("past"), bars("now"), bars("best")], [9, 1, 3]);
    assert.equal(parts["legend-best"].hidden, false);
    assert.match(parts.spark.attributes["aria-label"], /^Lavest .+, højest .+$/);
    assert.doesNotMatch(parts.spark.attributes["aria-label"], /[{}]/);
    assert.deepEqual(parts.ticks.children.map((tick) => `${tick.children[0]}@${tick.style.insetInlineStart}`), ["00@0%", "06@25%", "12@50%", "18@75%"]);
  } finally {
    card.stop();
  }
});

test("the level is compared with the day the card draws, and the key of the cheapest run goes when no bar has it", async () => {
  // Today costs 500 with one cheaper hour (now); tomorrow is far cheaper than both.
  const points = [...quarters((hour) => (hour === 9 ? 400 : 500)), ...quarters(() => 100, { start: MIDNIGHT + 24 * HOUR })];
  const card = await page(() => answer(points));
  try {
    assert.equal(card.root.dataset.state, "ready");
    assert.equal(card.parts.level.dataset.level, "low", "the cheapest hour of today is low, whatever tomorrow costs");
    assert.equal(card.parts.spark.children.length, 24, "only today is drawn");
    assert.equal(card.bars("best"), 0, "the cheapest run lies tomorrow");
    assert.equal(card.parts["legend-best"].hidden, true);
  } finally {
    card.stop();
  }
});

test("without a price for this quarter, or without an answer, the card goes back to its text", async () => {
  const yesterday = quarters((hour) => 500 + hour, { start: MIDNIGHT - 24 * HOUR });
  const replies = [
    () => answer(yesterday),
    () => new Response('{"error":"upstream"}', { status: 502 }),
    () => new Response(JSON.stringify({ area: "SE3", points: [[MIDNIGHT, 1]] })),
    () => new Response("<html>"),
    () => Promise.reject(new TypeError("Failed to fetch")),
  ];
  for (const reply of replies) {
    const card = await page(reply);
    try {
      assert.equal(card.root.dataset.state, "idle");
      assert.equal(card.parts.value.textContent, "–", "no number is written");
      assert.equal(card.parts.spark.children.length, 0);
    } finally {
      card.stop();
    }
  }
});

test("a new quarter is drawn without a call, old prices are fetched again for the same area, and a hidden page asks nothing", async () => {
  // Every quarter has its own price here.
  const byQuarter = Array.from({ length: 96 }, (_, index) => [MIDNIGHT + index * 900, 500 + index]);
  const card = await page(() => answer(byQuarter, { area: "DK2" }));
  try {
    const { parts, asked, listeners, device } = card;
    const refresh = listeners.get("visibilitychange");
    assert.equal(parts.value.textContent, shown(536));

    device.now += REFRESH_SECONDS;
    refresh();
    await settle();
    assert.equal(parts.value.textContent, shown(537), "the next quarter's price");
    assert.equal(asked.length, 1, "prices under ten minutes old are not fetched again");
    assert.equal(parts.area.textContent, priceCopy.da.area.DK2);

    globalThis.document.visibilityState = "hidden";
    device.now += REFRESH_SECONDS + 1;
    refresh();
    await settle();
    assert.equal(asked.length, 1);

    globalThis.document.visibilityState = "visible";
    refresh();
    await settle();
    assert.deepEqual(asked, ["/api/elpris", "/api/elpris?area=DK2"], "the second call names the area the first answer gave");

    card.stop();
    assert.equal(listeners.size, 0, "stop() takes the listener away");
  } finally {
    card.stop();
  }
});

test("prices that cannot be fetched again leave the last ones on the card", async () => {
  const card = await page((number) => (number === 1 ? answer(quarters((hour) => 500 + hour)) : new Response("", { status: 502 })));
  try {
    card.device.now += REFRESH_SECONDS + 1;
    card.listeners.get("visibilitychange")();
    await settle();
    assert.equal(card.asked.length, 2);
    assert.equal(card.root.dataset.state, "ready");
    assert.equal(card.parts.value.textContent, shown(509));
  } finally {
    card.stop();
  }
});

// Last in the file: the page remembers the largest difference between the two
// clocks it has seen, so a test after this one would inherit the hour.
test("a device whose clock is an hour slow still shows the price of the real quarter", async () => {
  const hourAhead = new Date(Date.now() + HOUR * 1000);
  const card = await page(() => answer(quarters((hour) => 500 + hour), { date: hourAhead }));
  try {
    assert.equal(card.root.dataset.state, "ready");
    assert.equal(card.parts.value.textContent, shown(510), "the device says 09:05, the server says 10:05");
    assert.match(card.parts.period.textContent, /10:00/);
    assert.equal(card.bars("past"), 10);
  } finally {
    card.stop();
  }
});
