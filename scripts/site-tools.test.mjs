// Tests for the shared parts of the tools section: number and time formats,
// the texts and the pages. The electricity price tool has its own files:
// site-tools-price.test.mjs and site-tools-api.test.mjs.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { sidebar } from "../config/sidebar/index.mjs";
import toolsSidebar from "../config/sidebar/vaerktoejer.mjs";
import { guideArt, guideSection } from "../src/lib/guide-art.mjs";
import { CARD_COPY, TOOLS } from "../src/lib/tools/catalog.mjs";
import * as format from "../src/lib/tools/format.mjs";
import { priceCopy } from "../src/lib/tools/price-copy.mjs";

const root = new URL("../", import.meta.url);
const NBSP = "\u00a0";

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
  for (const text of ["", "abc", "1.000,5", "2,5,0", "1e3", "∞", null, undefined]) {
    assert.ok(Number.isNaN(format.parseDecimal(text)), `${text} should not be a number`);
  }
  assert.equal(format.fill("Start kl. {time} {day}. {unknown}", { time: "02:15", day: "i nat" }), "Start kl. 02:15 i nat. {unknown}");
});

// Every key path and every {placeholder}, so a text can not be missing or
// lose a value in one language.
function shape(value, path = "") {
  if (typeof value === "string") return [`${path} ${[...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()}`];
  return Object.entries(value).flatMap(([key, child]) => shape(child, `${path}.${key}`)).sort();
}

test("the texts have the same keys and placeholders in Danish and English", () => {
  for (const copy of [priceCopy, CARD_COPY, ...TOOLS.map(({ da, en }) => ({ da, en }))]) {
    assert.deepEqual(shape(copy.en), shape(copy.da));
  }
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

test("the tool pages open with the energy picture and the overview with the house", () => {
  assert.equal(guideArt("vaerktoejer").name, "guide-overview");
  for (const tool of TOOLS) assert.equal(guideArt(`vaerktoejer/${tool.slug}`).name, "guide-energy");
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
    assert.doesNotMatch(source, /api\.energidataservice\.dk/, `${file} calls Energinet`);
  }
});
