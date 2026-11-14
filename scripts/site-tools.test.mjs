// Tests for the shared parts of the tools section: number and time formats
// and the rules every tool file keeps (nothing stored, no HTML from data).
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import * as format from "../src/lib/tools/format.mjs";

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
