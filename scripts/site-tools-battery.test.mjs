// Tests for the battery life tool: the sums, the limits, the words, the texts and that the tool is listed.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import toolsSidebar from "../config/sidebar/vaerktoejer.mjs";
import { TOOLS } from "../src/lib/tools/catalog.mjs";
import { BATTERY_PRESETS, BATTERY_SOURCES, batteryCopy } from "../src/lib/tools/battery-copy.mjs";
import { BATTERY_LIMITS, batteryLife, isValid } from "../src/lib/tools/battery-life.mjs";
import { formatCurrent, formatLife, formatMeaning } from "../src/lib/tools/battery-view.mjs";

const root = new URL("../", import.meta.url);
const near = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} is not ${expected}`);

test("battery: the average current weighs awake and asleep by their time", () => {
  // 3 s at 80 mA and 897 s at 20 uA, every 15 minutes.
  const result = batteryLife({ capacityMah: 2000, sleepMicroamps: 20, awakeMilliamps: 80, awakeSeconds: 3, intervalMinutes: 15, usablePercent: 80 });
  near(result.averageMilliamps, (80 * 3 + 0.02 * 897) / 900);
  near(result.hours, (2000 * 0.8) / result.averageMilliamps);
  near(result.days, result.hours / 24);
  near(result.months, result.days / 30.4);
  near(result.years, result.days / 365);
  assert.ok(result.awakeShare > 0.9 && result.awakeShare < 1);
});

test("battery: a device that is only asleep, or only awake, gives the plain division", () => {
  const base = { capacityMah: 1000, sleepMicroamps: 100, awakeMilliamps: 50, intervalMinutes: 1, usablePercent: 100 };
  near(batteryLife({ ...base, awakeSeconds: 0 }).hours, 1000 / 0.1);
  assert.equal(batteryLife({ ...base, awakeSeconds: 0 }).awakeShare, 0);
  near(batteryLife({ ...base, awakeSeconds: 60 }).hours, 1000 / 50); // awake the whole interval
  near(batteryLife({ ...base, awakeSeconds: 60 }).awakeShare, 1);
  near(batteryLife({ ...base, awakeSeconds: 0, usablePercent: 50 }).hours, 500 / 0.1);
});

test("battery: nothing absurd gives a number", () => {
  const ok = { capacityMah: 2000, sleepMicroamps: 20, awakeMilliamps: 80, awakeSeconds: 3, intervalMinutes: 15, usablePercent: 80 };
  assert.ok(isValid(ok));
  const bad = [
    { awakeSeconds: 901 }, // awake longer than the interval
    { capacityMah: 0 },
    { capacityMah: -5 },
    { capacityMah: Number.NaN },
    { sleepMicroamps: -1 },
    { awakeMilliamps: 10_001 },
    { intervalMinutes: 0 },
    { usablePercent: 0 },
    { usablePercent: 101 },
    { intervalMinutes: undefined },
  ];
  for (const change of bad) assert.equal(batteryLife({ ...ok, ...change }), null, JSON.stringify(change));
  assert.equal(batteryLife({ ...ok, sleepMicroamps: 0, awakeMilliamps: 0 }), null, "no current at all");
  assert.equal(batteryLife(null), null);
  assert.ok(batteryLife({ ...ok, awakeSeconds: 900 }), "awake the whole interval is allowed");
  for (const key of Object.keys(BATTERY_LIMITS)) assert.ok(BATTERY_LIMITS[key].min < BATTERY_LIMITS[key].max);
});

test("battery: the words use a fitting unit and say which side uses most", () => {
  assert.equal(formatCurrent(0.0412, "da"), "41,2 µA");
  assert.equal(formatCurrent(0.25, "en"), "250 µA");
  assert.equal(formatCurrent(1.5, "da"), "1,5 mA");
  const life = (days) => ({ days, months: days / 30.4, years: days / 365 });
  assert.equal(formatLife(life(20), "da"), "20 dage");
  assert.equal(formatLife(life(300), "da"), "9,9 måneder");
  assert.equal(formatLife(life(1095), "da"), "3,0 år");
  assert.equal(formatLife(life(1095), "en"), "3.0 years");
  assert.equal(formatLife(life(40_000), "en"), "More than 100 years");
  assert.match(formatMeaning(0.93, "da"), /^Mest strøm går til at være vågen: 93 %/);
  assert.match(formatMeaning(0.2, "en"), /^Most of the energy goes to sleep: 80%/);
  assert.match(formatMeaning(0.5, "da"), /lige meget/);
});

test("the battery texts have the same keys in Danish and English, and every preset has a text and a source", () => {
  const keys = (value, path = "") =>
    typeof value === "string" ? [path] : Object.entries(value).flatMap(([key, child]) => keys(child, `${path}.${key}`)).sort();
  assert.deepEqual(keys(batteryCopy.en), keys(batteryCopy.da));
  for (const preset of BATTERY_PRESETS) {
    assert.ok(batteryCopy.da.presets[preset.id] && batteryCopy.en.presets[preset.id]);
    assert.match(BATTERY_SOURCES[preset.id], /^https:\/\//);
  }
});

test("the batterilevetid tool is in the catalog, the sidebar and both languages, and links only to pages that exist", async () => {
  const slug = "batterilevetid";
  assert.ok(TOOLS.some((tool) => tool.slug === slug));
  assert.ok(toolsSidebar.items.some((item) => item.link === `/vaerktoejer/${slug}/`));
  for (const lang of ["da", "en"]) {
    const page = await readFile(new URL(`src/content/docs/${lang}/vaerktoejer/${slug}.mdx`, root), "utf8");
    assert.match(page, /^lastUpdated: 2026-11-14$/m);
    assert.match(page, /^title: .+$/m);
    for (const [, link] of page.matchAll(/\]\((\/(?:da|en)\/[^)#]+)\)/g)) {
      const file = new URL(`src/content/docs${link.replace(/\/$/, "")}.mdx`, root);
      await readFile(file, "utf8").catch(() => assert.fail(`${slug} (${lang}) links to ${link}, which does not exist`));
    }
  }
});
