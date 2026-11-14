// Behaviour tests for the scripts that wire the Zigbee and battery tools to their
// calculations, run against a small fake DOM (scripts/lib/fake-tool-dom.mjs).
import assert from "node:assert/strict";
import test from "node:test";
import { BATTERY_DEFAULTS, batteryCopy } from "../src/lib/tools/battery-copy.mjs";
import { startBatteryTool } from "../src/lib/tools/battery-ui.mjs";
import { WIFI_CHANNELS, ZIGBEE_CHANNELS } from "../src/lib/tools/zigbee-channel.mjs";
import { startZigbeeTool } from "../src/lib/tools/zigbee-ui.mjs";
import { fakeElement, fakeRoot } from "./lib/fake-tool-dom.mjs";

const FIELDS = Object.keys(BATTERY_DEFAULTS);

function batteryTool(lang = "da") {
  const parts = {};
  for (const key of FIELDS) {
    parts[key] = fakeElement({ value: String(BATTERY_DEFAULTS[key]) });
    parts[key].setAttribute("aria-describedby", `${key}-hint`);
    parts[`${key}-error`] = fakeElement({ id: `${key}-error`, hidden: true });
  }
  for (const name of ["life", "average", "days", "months", "years", "meaning"]) parts[name] = fakeElement();
  const preset = fakeElement({ dataset: { sleep: "10", awake: "180" } });
  const root = fakeRoot({ lang, parts, lists: { ".sb-tool-chip": [preset] } });
  startBatteryTool(root);
  const type = (key, text) => {
    parts[key].value = text;
    parts[key].fire("input");
  };
  return { parts, preset, type };
}

test("battery ui: the start values give an answer and no error", () => {
  const { parts } = batteryTool();
  assert.match(parts.life.textContent, /^\d+,\d\småneder$|^\d+(,\d)?\sår$/);
  for (const key of FIELDS) assert.equal(parts[`${key}-error`].hidden, true, key);
});

test("battery ui: awake longer than the interval shows its message and no result", () => {
  const { parts, type } = batteryTool();
  type("awakeSeconds", "901");
  assert.equal(parts["awakeSeconds-error"].hidden, false);
  assert.equal(parts["awakeSeconds-error"].textContent, batteryCopy.da.seconds.tooLong);
  assert.equal(parts.awakeSeconds.getAttribute("aria-invalid"), "true");
  assert.equal(parts.life.textContent, "–");
  assert.equal(parts.meaning.textContent, batteryCopy.da.meaning.tooLong);
  type("awakeSeconds", "900");
  assert.equal(parts["awakeSeconds-error"].hidden, true);
  assert.notEqual(parts.life.textContent, "–");
});

test("battery ui: the awake-too-long message shows also while another field is wrong", () => {
  const { parts, type } = batteryTool("en");
  type("capacityMah", "abc");
  type("awakeSeconds", "1000");
  assert.equal(parts["capacityMah-error"].hidden, false);
  assert.equal(parts["awakeSeconds-error"].hidden, false);
  assert.equal(parts["awakeSeconds-error"].textContent, batteryCopy.en.seconds.tooLong);
});

test("battery ui: awake time equal to the interval is allowed, also when the numbers do not divide evenly", () => {
  const { parts, type } = batteryTool();
  type("intervalMinutes", "4,1");
  type("awakeSeconds", "246");
  assert.equal(parts["awakeSeconds-error"].hidden, true);
  assert.notEqual(parts.life.textContent, "–");
  type("awakeSeconds", "246,1");
  assert.equal(parts["awakeSeconds-error"].hidden, false);
});

test("battery ui: a field that is wrong is named by its error text, and not when it is fine again", () => {
  const { parts, type } = batteryTool();
  type("capacityMah", "2.500");
  assert.equal(parts.capacityMah.getAttribute("aria-invalid"), "true");
  assert.equal(parts.capacityMah.getAttribute("aria-describedby"), "capacityMah-error capacityMah-hint");
  assert.equal(parts["capacityMah-error"].hidden, false);
  assert.equal(parts.meaning.textContent, batteryCopy.da.meaning.invalid);
  type("capacityMah", "2500");
  assert.equal(parts.capacityMah.getAttribute("aria-invalid"), "false");
  assert.equal(parts.capacityMah.getAttribute("aria-describedby"), "capacityMah-hint");
  assert.equal(parts["capacityMah-error"].hidden, true);
});

test("battery ui: the preset fills both currents and is pressed until a current is typed", () => {
  const { parts, preset, type } = batteryTool();
  preset.fire("click");
  assert.deepEqual([parts.sleepMicroamps.value, parts.awakeMilliamps.value], ["10", "180"]);
  assert.equal(preset.getAttribute("aria-pressed"), "true");
  type("capacityMah", "1000");
  assert.equal(preset.getAttribute("aria-pressed"), "true");
  type("awakeMilliamps", "100");
  assert.equal(preset.getAttribute("aria-pressed"), "false");
});

test("battery ui: no current at all says so instead of a number", () => {
  const { parts, type } = batteryTool();
  type("sleepMicroamps", "0");
  type("awakeMilliamps", "0");
  assert.equal(parts.life.textContent, "–");
  assert.equal(parts.meaning.textContent, batteryCopy.da.meaning.zero);
  assert.equal(parts.sleepMicroamps.getAttribute("aria-invalid"), "false");
});

test("battery ui: under a day the life is in hours, and a tiny sleep current is not shown as zero", () => {
  const { parts, type } = batteryTool();
  type("capacityMah", "1000");
  type("awakeMilliamps", "200");
  type("awakeSeconds", "60");
  type("intervalMinutes", "1");
  assert.match(parts.life.textContent, /^\d+\stimer$/);
  type("sleepMicroamps", "0,04");
  type("awakeMilliamps", "0");
  type("awakeSeconds", "0");
  assert.equal(parts.average.textContent, "0,040 µA");
});

function zigbeeTool(lang = "da") {
  const wifiChips = WIFI_CHANNELS.map((n) => fakeElement({ dataset: { wifiChip: String(n) } }));
  const wifiBars = WIFI_CHANNELS.map((n) => fakeElement({ dataset: { wifi: String(n) } }));
  const marks = ZIGBEE_CHANNELS.map((n) => fakeElement({ dataset: { zigbee: String(n) } }));
  const parts = Object.fromEntries(["best", "reason", "overlap", "free", "summary", "common", "clear"].map((name) => [name, fakeElement()]));
  const root = fakeRoot({ lang, parts, lists: { "[data-wifi-chip]": wifiChips, "[data-wifi]": wifiBars, "[data-zigbee]": marks } });
  startZigbeeTool(root);
  return { parts, chip: (n) => wifiChips[n - 1], bar: (n) => wifiBars[n - 1], mark: (n) => marks[n - 11] };
}

test("zigbee ui: nothing marked recommends 15 and marks it on the strip", () => {
  const { parts, mark } = zigbeeTool();
  assert.equal(parts.best.textContent, "15");
  assert.equal(mark(15).classList.contains("is-best"), true);
  assert.equal(mark(16).classList.contains("is-best"), false);
  assert.equal(parts.overlap.textContent, "Ingen Zigbee-kanal overlapper.");
});

test("zigbee ui: a Wi-Fi channel button toggles the channel, its bar, the overlap and the answer", () => {
  const { parts, chip, bar, mark } = zigbeeTool("en");
  chip(6).fire("click");
  assert.equal(chip(6).getAttribute("aria-pressed"), "true");
  assert.equal(bar(6).classList.contains("is-picked"), true);
  assert.equal(mark(17).classList.contains("is-overlap"), true);
  assert.equal(mark(20).classList.contains("is-overlap"), false);
  assert.match(parts.overlap.textContent, /^Overlaps Wi-Fi: 16, 17, 18, 19\.$/);
  assert.match(parts.summary.textContent, /Marked Wi-Fi channels: 6\./);
  chip(6).fire("click");
  assert.equal(chip(6).getAttribute("aria-pressed"), "false");
  assert.equal(bar(6).classList.contains("is-picked"), false);
  assert.equal(parts.best.textContent, "15");
});

test("zigbee ui: the 1 / 6 / 11 shortcut marks exactly those, and clear removes them", () => {
  const { parts, chip, mark } = zigbeeTool();
  chip(3).fire("click");
  parts.common.fire("click");
  const pressed = WIFI_CHANNELS.filter((n) => chip(n).getAttribute("aria-pressed") === "true");
  assert.deepEqual(pressed, [1, 6, 11]);
  assert.equal(parts.best.textContent, "25");
  assert.equal(mark(25).classList.contains("is-best"), true);
  parts.clear.fire("click");
  assert.deepEqual(WIFI_CHANNELS.filter((n) => chip(n).getAttribute("aria-pressed") === "true"), []);
  assert.equal(parts.best.textContent, "15");
  assert.equal(mark(25).classList.contains("is-best"), false);
});

test("zigbee ui: Wi-Fi 1 and 11 recommends one of 15, 20, 25 and the reason says so", () => {
  const { parts, chip } = zigbeeTool();
  chip(1).fire("click");
  chip(11).fire("click");
  assert.ok(["15", "20", "25"].includes(parts.best.textContent));
  assert.match(parts.reason.textContent, /anbefalede kanaler \(11, 15, 20 og 25\)/);
});
