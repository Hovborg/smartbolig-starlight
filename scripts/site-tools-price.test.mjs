// Tests for the calculations behind the electricity price tool: the cheapest
// run, the price level, the sentences and the chart geometry.
import assert from "node:assert/strict";
import test from "node:test";
import { dayKey, formatOre } from "../src/lib/tools/format.mjs";
import { chartGeometry, inRun, niceScale, slotWidth } from "../src/lib/tools/price-chart.mjs";
import { priceCopy } from "../src/lib/tools/price-copy.mjs";
import { priceView } from "../src/lib/tools/price-view.mjs";
import { cheapestWindow, currentPoint, hourly, level, toOre, windowAverage } from "../src/lib/tools/price-window.mjs";

const Q = 900;
const HOUR = 3600;
const T0 = Date.UTC(2026, 10, 13, 23) / 1000; // 00:00 Danish time, Saturday 14 November 2026
const quarters = (start, prices) => prices.map((price, index) => [start + index * Q, price]);
const flat = (start, hours, priceOf) => quarters(start, Array.from({ length: hours * 4 }, (_, index) => priceOf(Math.floor(index / 4))));
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`);

test("øre/kWh: VAT is put on the price and the add-on together", () => {
  near(toOre(1000), 125);
  near(toOre(1000, { vat: false }), 100);
  near(toOre(1000, { addOn: 90 }), 237.5);
  near(toOre(1000, { vat: false, addOn: 90 }), 190);
  near(toOre(-200), -25);
  near(toOre(0, { addOn: 0 }), 0);
});

test("hours: the mean of the quarters, also on the days the clocks change", () => {
  assert.deepEqual(hourly([]), []);
  assert.deepEqual(hourly(quarters(T0, [10, 20, 30, 40, 100, 200])), [
    { start: T0, value: 25, count: 4 },
    { start: T0 + HOUR, value: 150, count: 2 },
  ]);
  const threeDays = (y, m, d) => flat(Date.UTC(y, m, d - 1) / 1000, 72, () => 500);
  const hoursOn = (points, key) => hourly(points).filter((hour) => dayKey(hour.start) === key).length;
  assert.equal(hoursOn(threeDays(2026, 9, 25), "2026-10-25"), 25);
  assert.equal(hoursOn(threeDays(2026, 2, 29), "2026-03-29"), 23);
  assert.equal(hoursOn(threeDays(2026, 10, 14), "2026-11-14"), 24);
});

test("the current quarter and the mean of a run", () => {
  const points = quarters(T0, [10, 20, 30, 40]);
  assert.equal(currentPoint([], T0), null);
  assert.deepEqual(currentPoint(points, T0 + Q + 899), [T0 + Q, 20]);
  assert.equal(currentPoint(points, T0 + 4 * Q), null);
  assert.equal(currentPoint(points, T0 - 1), null);
  near(windowAverage(points, T0 + Q, 30), 25);
  assert.equal(windowAverage(points, T0 + 3 * Q, 30), null);
  assert.equal(windowAverage(points, T0 + 7, 30), null);
});

test("cheapest run: found in the middle, at the very end and from the current quarter", () => {
  assert.equal(cheapestWindow([], T0, 60), null);
  assert.deepEqual(cheapestWindow(quarters(T0, [10, 10, 10, 10, 1, 1, 5, 5]), T0, 30), { start: T0 + 4 * Q, end: T0 + 6 * Q, average: 1 });
  assert.deepEqual(cheapestWindow(quarters(T0, [5, 5, 5, 5, 5, 5, 1, 1]), T0, 30), { start: T0 + 6 * Q, end: T0 + 8 * Q, average: 1 });
  // Equal runs: the earliest wins.
  assert.equal(cheapestWindow(quarters(T0, [1, 1, 1, 1]), T0, 30).start, T0);
  // Runs that started before now do not count; the quarter now is in does.
  const later = T0 + 4 * Q + 100;
  assert.equal(cheapestWindow(quarters(T0, [0, 0, 0, 0, 3, 3, 2, 2]), later, 30).start, T0 + 6 * Q);
  assert.equal(cheapestWindow(quarters(T0, [0, 0, 0, 0, 1, 1, 2, 2]), later, 30).start, T0 + 4 * Q);
});

test("cheapest run: never longer than the data and never across a hole", () => {
  assert.equal(cheapestWindow(quarters(T0, [1, 1, 1]), T0, 60), null);
  assert.equal(cheapestWindow(quarters(T0, [1, 1, 1, 1]), T0 + 2 * Q, 60), null);
  const holed = [[T0, 5], [T0 + Q, 1], [T0 + 3 * Q, 1], [T0 + 4 * Q, 5]];
  assert.deepEqual(cheapestWindow(holed, T0, 30), { start: T0, end: T0 + 2 * Q, average: 3 });
  assert.equal(cheapestWindow(holed, T0, 45), null);
});

test("price level: thirds of the values shown, and equal prices are medium", () => {
  const values = [1, 2, 3, 4, 5, 6];
  assert.equal(level(1, values), "low");
  assert.equal(level(3.5, values), "mid");
  assert.equal(level(6, values), "high");
  assert.equal(level(5, [5, 5, 5, 5]), "mid");
  // Many hours at one price: the lowest price shown is low and the highest is high.
  assert.deepEqual([1, 5].map((value) => level(value, [1, 1, 1, 5])), ["low", "high"]);
  assert.deepEqual([1, 5].map((value) => level(value, [1, 5, 5, 5])), ["low", "high"]);
  assert.deepEqual([1, 3, 5].map((value) => level(value, [1, 3, 3, 3, 5])), ["low", "mid", "high"]);
  const zeroNight = [...Array(10).fill(0), ...Array.from({ length: 14 }, (_, index) => 40 + index)];
  assert.deepEqual([0, 45, 53].map((value) => level(value, zeroNight)), ["low", "mid", "high"]);
  assert.equal(level(1, [1, 2]), "mid");
  assert.equal(level(Number.NaN, values), "mid");
});

// A day that is dearest from 6 to 10 and cheapest from 13 to 16.
const dayPrices = (hour) => (hour >= 13 && hour < 16 ? 200 : hour < 6 ? 400 : hour < 10 ? 1200 : 1000);
const today = flat(T0, 24, dayPrices);
const at = (hour, minute = 0) => T0 + hour * HOUR + minute * 60;
const view = (options) => priceView({ points: today, area: "DK1", now: at(9, 5), lang: "da", copy: priceCopy.da, ...options });

test("view: the price now, today's figures and the wait for tomorrow's prices", () => {
  const result = view();
  near(result.now.value, 150);
  assert.equal(result.now.period, "kl. 09:00–09:15");
  assert.equal(result.now.level, "high");
  assert.equal(result.hours.length, 24);
  assert.deepEqual(result.days.map((day) => day.name), ["I dag, lørdag 14. november"]);
  assert.equal(result.pending, true);
  assert.deepEqual(result.stats.map((stat) => `${stat.label}: ${stat.value} ${stat.at}`.trim()), [
    `Laveste time i dag: ${formatOre(25, "da")} kl. 13–14`,
    `Højeste time i dag: ${formatOre(150, "da")} kl. 06–07`,
    `Gennemsnit i dag: ${formatOre((6 * 50 + 4 * 150 + 3 * 25 + 11 * 125) / 24, "da")}`,
  ]);
  assert.match(result.summary, /^Søjlediagram over elprisen time for time i DK1, lørdag 14\. november\./);
});

test("view: the sentence about the cheapest run, in both languages", () => {
  assert.equal(
    view().windowText,
    `Start kl. 13:00 i dag. Slut kl. 16:00. Gennemsnit ${formatOre(25, "da")}. Det er 81\u00a0% lavere end at starte nu.`,
  );
  assert.equal(
    view({ lang: "en", copy: priceCopy.en, vat: false, addOn: 10 }).windowText,
    `Start at 13:00 today. End at 16:00. Average ${formatOre(30, "en")}. That is 74% lower than starting now.`,
  );
  assert.equal(view({ now: at(13, 20) }).windowText, `Det er billigst at starte nu. Gennemsnit ${formatOre(toOre((11 * 200 + 1000) / 12), "da")} frem til kl. 16:15.`);
  assert.equal(view({ now: at(22), runHours: 4 }).windowText, "Der er ikke priser til 4 timer i træk endnu.");
  // Against a price of zero or below, a share would pass 100 %: the difference is given in øre.
  // Starting now (09:00 to 13:00) is two hours at 800 and two at -300: 31.25 øre with VAT.
  const negative = flat(T0, 24, (hour) => (hour >= 11 && hour < 15 ? -300 : 800));
  assert.equal(
    view({ points: negative, runHours: 4 }).windowText,
    `Start kl. 11:00 i dag. Slut kl. 15:00. Gennemsnit ${formatOre(-37.5, "da")}. Det er ${formatOre(31.25 + 37.5, "da")} lavere end at starte nu.`,
  );
  const fromZero = flat(T0, 24, (hour) => (hour >= 11 && hour < 15 ? -300 : 0));
  assert.equal(view({ points: fromZero, runHours: 4 }).windowText.includes("%"), false);
  assert.match(view({ points: fromZero, runHours: 4, lang: "en", copy: priceCopy.en }).windowText, /That is 18.8\u00a0øre\/kWh lower than starting now\.$/);
  assert.equal(view({ runHours: 1 }).window.end - view({ runHours: 1 }).window.start, HOUR);
});

test("view: two days of prices, and no prices at all", () => {
  const twoDays = view({ points: [...today, ...flat(T0 + 24 * HOUR, 24, () => 100)], now: at(20) });
  assert.equal(twoDays.pending, false);
  assert.deepEqual(twoDays.days.map((day) => day.word), ["I dag", "I morgen"]);
  assert.equal(twoDays.days[1].firstIndex, 24);
  assert.match(twoDays.windowText, /^Start kl\. 00:00 i nat\./);

  const empty = view({ points: [] });
  assert.equal(empty.now, null);
  assert.deepEqual([empty.stats, empty.hours, empty.days, empty.window, empty.summary], [[], [], [], null, ""]);
  assert.equal(empty.windowText, "Der er ikke priser til 3 timer i træk endnu.");
  // Prices that stopped before now: nothing is "now", and nothing is invented.
  assert.equal(view({ now: at(30) }).now, null);
});

test("chart: round scale steps, also below zero", () => {
  assert.deepEqual(niceScale(0, 137).ticks, [0, 50, 100, 150]);
  assert.deepEqual(niceScale(0, 0).ticks, [0, 0.25, 0.5, 0.75, 1]);
  const negative = niceScale(-20, 100);
  assert.ok(negative.min <= -20 && negative.max >= 100 && negative.ticks.includes(0));
  // One day is squeezed to fit; two days keep their width and scroll.
  assert.equal(slotWidth(184, 24), 7);
  assert.equal(slotWidth(100, 24), 7);
  assert.equal(slotWidth(300, 48), 12);
  assert.equal(slotWidth(960, 48), 20);
  assert.equal(slotWidth(960, 0), 7);
});

test("chart: one bar per hour, with now, the past and the cheapest run marked", () => {
  const hours = view().hours;
  const run = { start: at(13), end: at(16) };
  const chart = chartGeometry(hours, { slot: 20, now: at(9, 5), window: run });
  assert.equal(chart.width, 480);
  assert.deepEqual([chart.bars[8].state, chart.bars[9].state, chart.bars[10].state], ["past", "now", "next"]);
  assert.deepEqual(chart.bars.filter((bar) => bar.best).map((bar) => bar.index), [13, 14, 15]);
  assert.deepEqual(chart.band, { x: 260, width: 60 });
  assert.ok(chart.bars.every((bar) => bar.y >= chart.plotTop && bar.y + bar.height <= chart.zeroY + 1e-9));
  // A run that starts on a quarter marks the hours it covers at least half of.
  assert.equal(inRun(at(13), { start: at(13, 30), end: at(15, 30) }), true);
  assert.equal(inRun(at(15), { start: at(13, 30), end: at(15, 15) }), false);
  assert.equal(chartGeometry([], {}).bars.length, 0);
  // A negative price hangs below the zero line.
  const below = chartGeometry([{ start: T0, value: -10 }, { start: T0 + HOUR, value: 40 }], {});
  assert.ok(below.bars[0].y >= below.zeroY - 1e-9 && below.bars[1].y < below.zeroY);
});
