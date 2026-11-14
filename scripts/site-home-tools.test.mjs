// The tools section on the homepage: the small chart of today's hours, the
// card that shows the electricity price, and what the section must not do.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { TOOLS } from "../src/lib/tools/catalog.mjs";
import { clockOffset, isPrices } from "../src/lib/tools/price-data.mjs";
import { SPARK, sparkBars, sparkTicks } from "../src/lib/tools/price-spark.mjs";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const HOUR = 3600;
// 2026-11-14 00:00 in Denmark (UTC+1).
const MIDNIGHT = Date.UTC(2026, 10, 13, 23) / 1000;
const day = (values, start = MIDNIGHT) => values.map((value, index) => ({ start: start + index * HOUR, value }));

test("the chart has one bar per hour, inside the box, with the hour of now marked", () => {
  const hours = day(Array.from({ length: 24 }, (_, index) => 50 + index * 5));
  const now = MIDNIGHT + 14 * HOUR + 600;
  const bars = sparkBars(hours, { now, window: { start: MIDNIGHT + 16 * HOUR, end: MIDNIGHT + 19 * HOUR } });
  assert.equal(bars.length, 24);
  assert.deepEqual(bars.map((bar) => bar.state).join(" "), [...Array(14).fill("past"), "now", "ahead", "best", "best", "best", ...Array(5).fill("ahead")].join(" "));
  for (const bar of bars) {
    assert.ok(bar.x >= 0 && bar.x + bar.width <= SPARK.width + 0.01, "inside the width");
    assert.ok(bar.y >= 0 && bar.y + bar.height <= SPARK.height + 0.01, "inside the height");
  }
  assert.equal(bars.at(-1).height, SPARK.height, "the dearest hour fills the height");
  assert.ok(bars[0].height < bars[1].height, "a higher price is a taller bar");
});

test("the hour of now wins over the cheapest run, and equal prices still draw", () => {
  const hours = day(Array(24).fill(0));
  const bars = sparkBars(hours, { now: MIDNIGHT + 60, window: { start: MIDNIGHT, end: MIDNIGHT + 3 * HOUR } });
  assert.deepEqual(bars.slice(0, 4).map((bar) => bar.state), ["now", "best", "best", "ahead"]);
  assert.ok(bars.every((bar) => bar.height === SPARK.minBar), "a price of zero is still a visible bar");
  assert.deepEqual(sparkBars([], { now: MIDNIGHT }), []);
});

test("negative prices hang below the zero line and stay inside the box", () => {
  const bars = sparkBars(day([100, -50, 0, 50]), { now: MIDNIGHT - 10 });
  const zero = (100 / 150) * SPARK.height;
  assert.ok(Math.abs(bars[0].y) < 0.01 && Math.abs(bars[0].height - zero) < 0.01, "the top bar ends at the zero line");
  assert.ok(Math.abs(bars[1].y - zero) < 0.01, "a negative price starts at the zero line");
  assert.ok(bars[1].y + bars[1].height <= SPARK.height + 0.01);
});

test("the hours under the chart are read from the day itself", () => {
  assert.deepEqual(sparkTicks(day(Array(24).fill(1))), [
    { label: "00", at: 0 }, { label: "06", at: 0.25 }, { label: "12", at: 0.5 }, { label: "18", at: 0.75 },
  ]);
  // 2026-10-25 has 25 hours in Denmark: 02:00 comes twice, so 06:00 is the eighth hour.
  const longDay = day(Array(25).fill(1), Date.UTC(2026, 9, 24, 22) / 1000);
  assert.deepEqual(sparkTicks(longDay).map((tick) => `${tick.label}@${tick.at}`), ["00@0", "06@0.28", "12@0.52", "18@0.76"]);
  // 2026-03-29 has 23 hours: 02:00 does not exist, so 06:00 is the sixth hour.
  const shortDay = day(Array(23).fill(1), Date.UTC(2026, 2, 28, 23) / 1000);
  assert.deepEqual(sparkTicks(shortDay).map((tick) => `${tick.label}@${tick.at}`), ["00@0", "06@0.22", "12@0.48", "18@0.74"]);
});

test("only a known area with a list of numbers counts as prices", () => {
  assert.equal(isPrices({ area: "DK1", points: [[1, 2.5]] }), true);
  for (const bad of [null, {}, { area: "DK3", points: [[1, 2]] }, { area: "DK1", points: [] }, { area: "DK1", points: [[1, "2"]] }, { area: "DK2", points: "x" }]) {
    assert.equal(isPrices(bad), false, JSON.stringify(bad));
  }
});

test("the section lists every tool, shows no number before the prices are fetched, and loads its code late", async () => {
  const component = await read("src/components/home/HomeTools.astro");
  assert.match(component, /TOOLS\.map/, "the rows come from the catalog, so a new tool shows up by itself");
  assert.ok(TOOLS.length >= 2);
  assert.match(component, /data-state="idle"/);
  assert.match(component, /data-part="value">–</, "no made-up price in the built page");
  assert.match(component, /await import\("\.\.\/\.\.\/lib\/home-price\.mjs"\)/, "the price code is fetched when the card is near the screen");
  assert.doesNotMatch(component, /\sstyle=|\son[a-z]+=/, "no inline style or handler: the strict CSP would block it");
  const css = await read("src/styles/home/tools.css");
  assert.match(css, /\.home-price\[data-state="ready"\] \.home-price__live \{ display: grid; \}/);
  assert.match(css, /\.home-price\[data-state="ready"\] \.home-price__idle \{ display: none; \}/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i, "colours come from the design tokens");
});

test("the homepage card stores nothing, writes no HTML and only asks the site's own endpoint", async () => {
  const code = await read("src/lib/home-price.mjs");
  assert.doesNotMatch(code, /localStorage|sessionStorage|indexedDB|document\.cookie/);
  assert.doesNotMatch(code, /innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
  assert.doesNotMatch(code, /https?:\/\//, "no address of its own: fetchPrices asks /api/elpris");
  const data = await read("src/lib/tools/price-data.mjs");
  assert.match(data, /export const ENDPOINT = "\/api\/elpris";/);
  assert.equal((data.match(/fetch\(/g) ?? []).length, 1);
  assert.match(await read("src/lib/tools/price-ui.mjs"), /fetchPrices\(area, request\.signal\)/, "the tool and the homepage fetch the same way");
});

test("the homepage copy has the tools block in both languages with links that exist", async () => {
  const { homeCopy } = await import("../src/lib/home-copy.ts");
  for (const locale of ["da", "en"]) {
    const { tools } = homeCopy[locale];
    assert.equal(tools.all.href, `/${locale}/vaerktoejer/`);
    assert.equal(tools.price.link.href, `/${locale}/vaerktoejer/elpris/`);
    for (const word of ["{min}", "{minAt}", "{max}", "{maxAt}"]) assert.ok(tools.price.sparkLabel.includes(word), `${locale}: ${word}`);
    assert.match(tools.price.note, /Energinet, CC BY 4\.0/, "the source is credited where the numbers are shown");
  }
});

test("a device clock far from the server's is put right, and a small difference is left alone", () => {
  const device = Date.UTC(2026, 10, 14, 8, 30);
  const header = (minutes) => new Date(device + minutes * 60_000).toUTCString();
  // An hour slow or fast: corrected by what the Date header says.
  assert.equal(clockOffset(header(60), device), 3600);
  assert.equal(clockOffset(header(-60), device), -3600);
  // A browser may hand back an answer up to ten minutes old: that says nothing about the clock.
  assert.equal(clockOffset(header(-10), device), 0);
  assert.equal(clockOffset(header(14), device), 0);
  for (const missing of [null, undefined, "", "not a date"]) assert.equal(clockOffset(missing, device), 0);
});

test("the tool and the homepage card both use the corrected clock", async () => {
  for (const file of ["src/lib/tools/price-ui.mjs", "src/lib/home-price.mjs"]) {
    assert.match(await read(file), /\+ \(state\.data\?\.clockOffset \?\? 0\)/, file);
  }
});
