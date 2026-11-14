// Tests for the battery life tool: the sums, the limits, the words, the texts and that the tool is listed.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import toolsSidebar from "../config/sidebar/vaerktoejer.mjs";
import { TOOLS } from "../src/lib/tools/catalog.mjs";
import { BATTERY_PRESETS, BATTERY_SOURCES, batteryCopy } from "../src/lib/tools/battery-copy.mjs";
import { BATTERY_LIMITS, awakeTooLong, batteryLife, isValid } from "../src/lib/tools/battery-life.mjs";
import { formatCurrent, formatLife, formatMeaning } from "../src/lib/tools/battery-view.mjs";
import { parseDecimal } from "../src/lib/tools/format.mjs";

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

const NBSP = " ";
const lifeOf = (days) => ({ days, months: days / 30.4, years: days / 365 });

test("battery: the life is in hours under a day and 'less than an hour' under an hour", () => {
  const hours = (h) => lifeOf(h / 24);
  assert.equal(formatLife(hours(0.5), "da"), "under en time");
  assert.equal(formatLife(hours(0.99), "en"), "less than an hour");
  assert.equal(formatLife(hours(1), "da"), `1${NBSP}time`);
  assert.equal(formatLife(hours(1), "en"), `1${NBSP}hour`);
  assert.equal(formatLife(hours(19), "da"), `19${NBSP}timer`);
  assert.equal(formatLife(hours(19.4), "en"), `19${NBSP}hours`);
  assert.equal(formatLife(hours(23.4), "da"), `23${NBSP}timer`);
  assert.equal(formatLife(lifeOf(1), "da"), `1,0${NBSP}dage`);
});

test("battery: the life changes unit at one day, two months, two years and 100 years", () => {
  assert.equal(formatLife(lifeOf(30.4 * 2 - 0.01), "da"), `61${NBSP}dage`);
  assert.equal(formatLife(lifeOf(30.4 * 2), "da"), `2,0${NBSP}måneder`);
  assert.equal(formatLife(lifeOf(365 * 2 - 15), "en"), `23.5${NBSP}months`);
  assert.equal(formatLife(lifeOf(365 * 2), "en"), `2.0${NBSP}years`);
  assert.equal(formatLife(lifeOf(365 * 100), "en"), `100${NBSP}years`);
  assert.equal(formatLife(lifeOf(365 * 100 + 1), "en"), "More than 100 years");
  assert.equal(formatLife(lifeOf(365 * 100 + 1), "da"), "Over 100 år");
});

test("battery: a small current keeps two significant digits, and the two shares add up to 100", () => {
  assert.equal(formatCurrent(0.00004, "da"), `0,040${NBSP}µA`);
  assert.equal(formatCurrent(0.00123, "en"), `1.2${NBSP}µA`);
  assert.equal(formatCurrent(0.0000123, "en"), `0.012${NBSP}µA`);
  assert.equal(formatCurrent(0.0005, "da"), `0,50${NBSP}µA`);
  // 49.5 % awake used to show "50 % ... 51 %".
  assert.equal(formatMeaning(0.495, "da"), `Vågen tid og søvn bruger lige meget strøm: 50${NBSP}% hver.`);
  assert.match(formatMeaning(0.504, "en"), /50% each/);
  assert.match(formatMeaning(0.506, "da"), new RegExp(`^Mest strøm går til at være vågen: 51${NBSP}% af energien, mens søvnen tager 49${NBSP}%`));
  // 48.5 % awake is 49 % and 51 % asleep, never 49 and 52.
  assert.match(formatMeaning(0.485, "en"), /sleep: 51% of it, while being awake takes 49%/);
  assert.match(formatMeaning(0.994, "en"), /99% of it, while sleep takes 1%/);
  assert.match(formatMeaning(0.996, "en"), /100% of it, while sleep takes 0%/);
  for (let share = 0; share <= 1; share += 0.0013) {
    const numbers = [...formatMeaning(share, "en").matchAll(/(\d+)%/g)].map((match) => Number(match[1]));
    // "50% each" names the share once.
    assert.equal(numbers.length === 1 ? numbers[0] * 2 : numbers[0] + numbers[1], 100, `share ${share}`);
  }
});

test("battery: awake time equal to the interval is allowed even when the numbers do not divide evenly", () => {
  const base = { capacityMah: 1000, sleepMicroamps: 10, awakeMilliamps: 50, usablePercent: 80 };
  assert.equal(awakeTooLong({ ...base, intervalMinutes: 4.1, awakeSeconds: 246 }), false);
  assert.ok(batteryLife({ ...base, intervalMinutes: 4.1, awakeSeconds: 246 }));
  assert.equal(awakeTooLong({ ...base, intervalMinutes: 4.1, awakeSeconds: 246.001 }), true);
  assert.equal(batteryLife({ ...base, intervalMinutes: 4.1, awakeSeconds: 246.001 }), null);
  // Awake for the whole interval is only awake current, never a negative sleep share.
  near(batteryLife({ ...base, intervalMinutes: 0.7, awakeSeconds: 42 }).averageMilliamps, 50);
});

test("battery: every field's label names its unit for a screen reader, in both languages", () => {
  const units = {
    da: { capacity: /mAh/, sleep: /µA/, awake: /mA\)/, seconds: /sekunder/, interval: /minutter/, usable: /procent/ },
    en: { capacity: /mAh/, sleep: /µA/, awake: /mA\)/, seconds: /seconds/, interval: /minutes/, usable: /percent/ },
  };
  for (const lang of ["da", "en"]) {
    for (const [key, unit] of Object.entries(units[lang])) assert.match(batteryCopy[lang][key].label, unit, `${lang} ${key}`);
  }
});

test("the battery page descriptions fit the 160 characters llms.txt allows, with room to spare", async () => {
  for (const lang of ["da", "en"]) {
    const page = await readFile(new URL(`src/content/docs/${lang}/vaerktoejer/batterilevetid.mdx`, root), "utf8");
    assert.ok(page.match(/^description: (.*)$/m)[1].length <= 155, lang);
  }
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

test("a number with a thousands sign is refused, and the field says how to type it", () => {
  // "2.500" is 2500 mAh to a Dane and 2.5 to others; the tool must not guess.
  assert.ok(Number.isNaN(parseDecimal("2.500")));
  assert.ok(Number.isNaN(parseDecimal("2,500")));
  assert.equal(parseDecimal("2500"), 2500);
  for (const lang of ["da", "en"]) {
    const copy = batteryCopy[lang];
    for (const key of ["capacity", "sleep", "awake", "seconds", "interval"]) {
      // The message itself has no thousands sign, and it shows an example.
      assert.doesNotMatch(copy[key].invalid, /\d[.,]\d{3}/, `${lang} ${key}`);
      assert.match(copy[key].invalid, lang === "da" ? /uden tusindtegn, for eksempel \d+\./ : /without a thousands separator, for example \d+\./);
    }
  }
});

test("a hidden error text is not named as a field's description", async () => {
  const component = await readFile(new URL("src/components/tools/BatteryLife.astro", root), "utf8");
  // A description is read out also when it is hidden, so the page names only the hint,
  // and the script adds the error while the field is wrong (the behaviour is in site-tools-ui.test.mjs).
  assert.ok(component.includes("aria-describedby={`${id}-${key}-hint`}"));
  assert.doesNotMatch(component, /aria-describedby=[^>]*-error/);
});
