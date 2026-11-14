// Tests for the shared parts of the tools section: number and time formats,
// the "what does it cost" sum, the texts and the pages. The electricity price
// tool has its own files: site-tools-price.test.mjs and site-tools-api.test.mjs.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { sidebar } from "../config/sidebar/index.mjs";
import toolsSidebar from "../config/sidebar/vaerktoejer.mjs";
import { guideArt, guideSection } from "../src/lib/guide-art.mjs";
import { CARD_COPY, TOOLS } from "../src/lib/tools/catalog.mjs";
import { setInvalid } from "../src/lib/tools/dom.mjs";
import * as format from "../src/lib/tools/format.mjs";
import { POWER_DEFAULTS, POWER_PRESETS, powerCopy } from "../src/lib/tools/power-copy.mjs";
import { costPerHour, powerCost, savingPerHourLess } from "../src/lib/tools/power-cost.mjs";
import { priceCopy } from "../src/lib/tools/price-copy.mjs";

const root = new URL("../", import.meta.url);
const NBSP = "\u00a0";
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`);

test("numbers, money and shares follow the language", () => {
  assert.equal(format.formatNumber(1234.5, "da"), "1.234,5");
  assert.equal(format.formatNumber(1234.5, "en"), "1,234.5");
  assert.equal(format.formatOre(123.44, "da"), `123,4${NBSP}øre/kWh`);
  assert.equal(format.formatOre(123.44, "en"), `123.4${NBSP}øre/kWh`);
  assert.equal(format.formatKroner(1234, "da"), `1.234${NBSP}kr.`);
  assert.equal(format.formatKroner(1234, "en"), `DKK${NBSP}1,234`);
  assert.equal(format.formatKroner(0.06, "da", 2), `0,06${NBSP}kr.`);
  // An amount is shown at a precision that says something.
  assert.deepEqual(
    [456.25, 38, 1.25, 0.6, 0.0025, 0].map((kroner) => format.formatMoney(kroner, "da")),
    [`456${NBSP}kr.`, `38,00${NBSP}kr.`, `1,25${NBSP}kr.`, `60${NBSP}øre`, `0,25${NBSP}øre`, `0${NBSP}kr.`],
  );
  assert.equal(format.formatMoney(0.025, "en"), `2.5${NBSP}øre`);
  // Just under a krone is a krone, not "100 øre"; just under zero is zero, not "-0,0".
  assert.deepEqual([0.994, 0.995, 0.999].map((kroner) => format.formatMoney(kroner, "da")), [`99${NBSP}øre`, `1,00${NBSP}kr.`, `1,00${NBSP}kr.`]);
  assert.equal(format.formatOre(-0.04, "da"), `0,0${NBSP}øre/kWh`);
  assert.equal(format.formatOre(-0.05, "da"), `-0,1${NBSP}øre/kWh`);
  assert.equal(format.formatPercent(0.31, "da"), `31${NBSP}%`);
  assert.equal(format.formatPercent(0.31, "en"), "31%");
});

test("times are Danish time whatever the season, and the same in both languages", () => {
  const winter = Date.UTC(2026, 10, 14, 1, 15) / 1000; // UTC+1
  const summer = Date.UTC(2026, 6, 14, 1, 15) / 1000; // UTC+2
  assert.equal(format.formatTime(winter), "02:15");
  assert.equal(format.formatTime(summer), "03:15");
  assert.equal(format.hourOfDay(winter), 2);
  assert.equal(format.dayKey(Date.UTC(2026, 10, 13, 23) / 1000), "2026-11-14");
  assert.equal(format.dayKey(Date.UTC(2026, 10, 13, 22, 59) / 1000), "2026-11-13");
  assert.equal(format.formatDay(winter, "da"), "lørdag 14. november");
  assert.equal(format.formatDay(winter, "en"), "Saturday 14 November");
});

test("a typed number may use a comma or a dot, and anything else is refused", () => {
  assert.equal(format.parseDecimal("2,50"), 2.5);
  assert.equal(format.parseDecimal(" 2.50 "), 2.5);
  assert.equal(format.parseDecimal("95"), 95);
  assert.equal(format.parseDecimal("1 500"), 1500);
  // Three digits after the sign are a decimal when the number cannot be a thousand.
  assert.equal(format.parseDecimal("0,500"), 0.5);
  assert.equal(format.parseDecimal("1234,567"), 1234.567);
  for (const text of ["", "abc", "1.000,5", "2,5,0", "1e3", "∞", null, undefined]) {
    assert.ok(Number.isNaN(format.parseDecimal(text)), `${text} should not be a number`);
  }
  // "1.500" is 1500 to a Dane and 1.5 to others: refused, never guessed.
  for (const text of ["1.000", "1,500", "1.500", "100.000", "100,000", "12,345", "2.000", "-1.500"]) {
    assert.ok(Number.isNaN(format.parseDecimal(text)), `${text} could be a thousand times wrong`);
  }
  assert.equal(format.fill("Start kl. {time} {day}. {unknown}", { time: "02:15", day: "i nat" }), "Start kl. 02:15 i nat. {unknown}");
});

test("power cost: watts, hours and price give kWh and kroner per day, month and year", () => {
  const { kwh, cost } = powerCost({ watts: 100, hoursPerDay: 5, pricePerKwh: 2.5 });
  near(kwh.day, 0.5);
  near(kwh.month, 15.2);
  near(kwh.year, 182.5);
  near(cost.day, 1.25);
  near(cost.month, 38);
  near(cost.year, 456.25);
  near(powerCost({ watts: 10, hoursPerDay: 24, pricePerKwh: 2 }).cost.year, 175.2);
});

test("power cost: bad input counts as nothing and a day has 24 hours", () => {
  for (const input of [
    { watts: Number.NaN, hoursPerDay: 5, pricePerKwh: 2.5 },
    { watts: -100, hoursPerDay: 5, pricePerKwh: 2.5 },
    { watts: 100, hoursPerDay: 0, pricePerKwh: 2.5 },
    { watts: 100, hoursPerDay: 5, pricePerKwh: undefined },
  ]) {
    assert.equal(powerCost(input).cost.year, 0);
  }
  near(powerCost({ watts: 1000, hoursPerDay: 30, pricePerKwh: 1 }).kwh.day, 24);
  near(costPerHour({ watts: 100, pricePerKwh: 2.5 }), 0.25);
  near(savingPerHourLess({ watts: 100, hoursPerDay: 5, pricePerKwh: 2.5 }), 91.25);
  assert.equal(savingPerHourLess({ watts: 100, hoursPerDay: 0.5, pricePerKwh: 2.5 }), 0);
});

// Every key path and every {placeholder}, so a text can not be missing or
// lose a value in one language.
function shape(value, path = "") {
  if (typeof value === "string") return [`${path} ${[...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()}`];
  return Object.entries(value).flatMap(([key, child]) => shape(child, `${path}.${key}`)).sort();
}

test("the texts have the same keys and placeholders in Danish and English", () => {
  for (const copy of [priceCopy, powerCopy, CARD_COPY, ...TOOLS.map(({ da, en }) => ({ da, en }))]) {
    assert.deepEqual(shape(copy.en), shape(copy.da));
  }
  for (const preset of POWER_PRESETS) {
    assert.ok(powerCopy.da.presets[preset.id] && powerCopy.en.presets[preset.id], `preset ${preset.id} has no text`);
    assert.ok(preset.watts > 0 && (preset.hours === undefined || preset.hours <= 24));
  }
  assert.equal(POWER_DEFAULTS.pricePerKwh, 2.5);
});

const pagesOf = async (lang) =>
  (await readdir(new URL(`src/content/docs/${lang}/vaerktoejer/`, root))).filter((name) => name.endsWith(".mdx")).sort();
const linkOf = (file) => (file === "index.mdx" ? "/vaerktoejer/" : `/vaerktoejer/${file.slice(0, -4)}/`);

test("every tool page exists in both languages, in the sidebar and in the catalog", async () => {
  const pages = await pagesOf("da");
  assert.deepEqual(await pagesOf("en"), pages);
  const links = toolsSidebar.items.map((item) => item.link);
  assert.deepEqual([...links].sort(), pages.map(linkOf).sort());
  for (const item of toolsSidebar.items) assert.ok(item.translations?.en, `${item.link} has no English label`);
  assert.deepEqual(TOOLS.map((tool) => `${tool.slug}.mdx`).sort(), pages.filter((name) => name !== "index.mdx"));
  const sections = sidebar.map((section) => section.label);
  assert.equal(sections.indexOf("Værktøjer"), sections.indexOf("Automationer") + 1);
  assert.match(await readFile(new URL("src/lib/primary-nav.ts", root), "utf8"), /path: "vaerktoejer\/", da: "Værktøjer", en: "Tools"/);
});

test("a tool page opens with the tool and the overview with the house", () => {
  assert.equal(guideArt("vaerktoejer").name, "guide-overview");
  for (const tool of TOOLS) assert.equal(guideArt(`vaerktoejer/${tool.slug}`), null);
  assert.deepEqual(guideSection("vaerktoejer/elpris", "en"), { label: "Tools", href: "/en/vaerktoejer/" });
});

test("the tools store nothing, write no HTML from data and never call Energinet from the browser", async () => {
  const files = [
    ...(await readdir(new URL("src/lib/tools/", root))).map((name) => `src/lib/tools/${name}`),
    ...(await readdir(new URL("src/components/tools/", root))).map((name) => `src/components/tools/${name}`),
  ];
  for (const file of files) {
    const source = await readFile(new URL(file, root), "utf8");
    assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|document\.cookie/, `${file} stores something`);
    assert.doesNotMatch(source, /innerHTML|outerHTML|insertAdjacentHTML|set:html|document\.write/, `${file} writes HTML`);
    assert.doesNotMatch(source, /\son[a-z]+=["{]/, `${file} has an inline event handler`);
    assert.doesNotMatch(source, /\sstyle=["{]/, `${file} has an inline style attribute`);
    assert.doesNotMatch(source, /api\.energidataservice\.dk/, `${file} calls Energinet`);
  }
});

test("an error text is named as the field's description only while the field is wrong", () => {
  const attributes = new Map([["aria-describedby", "watts-hint"]]);
  const input = { getAttribute: (name) => attributes.get(name) ?? null, setAttribute: (name, value) => attributes.set(name, value) };
  const error = { id: "watts-error", hidden: true };
  setInvalid(input, error, true);
  assert.deepEqual([attributes.get("aria-invalid"), attributes.get("aria-describedby"), error.hidden], ["true", "watts-error watts-hint", false]);
  setInvalid(input, error, true);
  assert.equal(attributes.get("aria-describedby"), "watts-error watts-hint", "not named twice");
  setInvalid(input, error, false);
  assert.deepEqual([attributes.get("aria-invalid"), attributes.get("aria-describedby"), error.hidden], ["false", "watts-hint", true]);
});

test("the fields do not name a hidden error text, and the frame has one class attribute", async () => {
  for (const file of ["PowerCost.astro", "PowerPrice.astro"]) {
    const markup = await readFile(new URL(`src/components/tools/${file}`, root), "utf8");
    assert.doesNotMatch(markup, /aria-describedby=\{`[^`]*-error/, file);
  }
  const frame = await readFile(new URL("src/components/tools/ToolFrame.astro", root), "utf8");
  assert.match(frame, /class: scope, \.\.\.attributes \} = Astro\.props/);
  assert.equal((frame.match(/<section[^>]*\sclass(:list)?=/g) ?? []).length, 1);
});

test("the tool pages keep claims to what their sources say, and the overview names all four tools", async () => {
  const read = (lang, name) => readFile(new URL(`src/content/docs/${lang}/vaerktoejer/${name}.mdx`, root), "utf8");
  for (const lang of ["da", "en"]) {
    const [zigbee, battery, index] = await Promise.all([read(lang, "zigbee-kanal"), read(lang, "batterilevetid"), read(lang, "index")]);
    for (const page of [zigbee, battery]) assert.doesNotMatch(page, /widest common mask|bredeste almindelige maske|radio alone|radioen alene|Et naboens/);
    assert.match(zigbee, /AN5185/);
    assert.match(zigbee, /40 MHz/);
    // ZHA gives two reasons for 15, 20 and 25, in the "Smart" sentence and where 26 is explained.
    assert.match(zigbee, lang === "da" ? /"Smart"[^.]*både fordi[^.]*og fordi ikke alle Zigbee-enheder/ : /"Smart"[^.]*both because[^.]*and because not all Zigbee devices/);
    assert.match(zigbee, lang === "da" ? /ZHA anbefaler kun 15, 20 og 25, både fordi[^.]*og fordi ikke alle/ : /ZHA only recommends 15, 20 and 25, both because[^.]*and because not all/);
    assert.match(battery, /Active \(RF working\)/);
    const description = index.match(/^description: (.*)$/m)[1];
    for (const word of lang === "da" ? ["elpris", "tændt", "Zigbee", "batteri"] : ["electricity price", "keep on", "Zigbee", "battery"]) {
      assert.ok(description.toLowerCase().includes(word.toLowerCase()), `${lang} overview description misses ${word}`);
    }
  }
  const [da, en] = await Promise.all(["da", "en"].map((lang) => readFile(new URL(`src/lib/home-copy/${lang}.ts`, root), "utf8")));
  assert.match(da.match(/intro: "Små beregnere[^"]*"/)[0], /Zigbee/);
  assert.match(en.match(/intro: "Small calculators[^"]*"/)[0], /Zigbee/);
});
