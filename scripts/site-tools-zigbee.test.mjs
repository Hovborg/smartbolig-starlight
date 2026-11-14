// Tests for the Zigbee channel picker: the sums, the strip, the words, the texts and that the tool is listed.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import toolsSidebar from "../config/sidebar/vaerktoejer.mjs";
import { TOOLS } from "../src/lib/tools/catalog.mjs";
import * as zigbee from "../src/lib/tools/zigbee-channel.mjs";
import { zigbeeCopy } from "../src/lib/tools/zigbee-copy.mjs";
import { STRIP, wifiShapes, zigbeeShapes } from "../src/lib/tools/zigbee-strip.mjs";
import { zigbeeView } from "../src/lib/tools/zigbee-view.mjs";

const root = new URL("../", import.meta.url);

test("zigbee: channel 11 is at 2405 MHz, channel 26 at 2480 MHz, Wi-Fi 1 at 2412 and 13 at 2472", () => {
  assert.equal(zigbee.zigbeeCentre(11), 2405);
  assert.equal(zigbee.zigbeeCentre(15), 2425);
  assert.equal(zigbee.zigbeeCentre(26), 2480);
  assert.equal(zigbee.wifiCentre(1), 2412);
  assert.equal(zigbee.wifiCentre(11), 2462);
  assert.equal(zigbee.wifiCentre(13), 2472);
  assert.deepEqual(zigbee.wifiBand(6), { low: 2426, high: 2448 });
  assert.deepEqual(zigbee.zigbeeBand(20), { low: 2449, high: 2451 });
});

test("zigbee: overlap means more than touching at one point", () => {
  // Wi-Fi 6 is 2426 to 2448; Zigbee 15 is 2424 to 2426, which only touches.
  assert.deepEqual(zigbee.overlapping([6]), [16, 17, 18, 19]);
  assert.ok(!zigbee.overlapping([6]).includes(15));
  assert.ok(zigbee.overlapping([6]).includes(16));
  assert.ok(!zigbee.overlapping([6]).includes(20)); // 2449 to 2451 is clear of 2448
  assert.deepEqual(zigbee.overlapping([1, 6, 11]), [11, 12, 13, 14, 16, 17, 18, 19, 21, 22, 23, 24]);
  assert.deepEqual(zigbee.overlapping([]), []);
  assert.deepEqual(zigbee.coveredBy(16, [1, 6, 11]), [6]);
});

test("zigbee: the usual 1 / 6 / 11 leaves 15, 20 and 25 free, and 25 is the one furthest away", () => {
  const advice = zigbee.advise(zigbee.COMMON_WIFI_CHANNELS);
  for (const channel of [15, 20, 25, 26]) assert.ok(advice.free.includes(channel), `${channel} should be free`);
  assert.equal(advice.best, 25);
  assert.equal(advice.distance, 2);
  assert.equal(zigbee.score(15, [1, 6, 11]), 1);
  assert.equal(zigbee.score(20, [1, 6, 11]), 1);
  assert.equal(zigbee.score(26, [1, 6, 11]), 7);
});

test("zigbee: no Wi-Fi marked recommends 15; ties go 15, 20, 25, 11, then the lowest", () => {
  const none = zigbee.advise([]);
  assert.equal(none.best, 15);
  assert.equal(none.distance, null);
  assert.deepEqual(none.overlap, []);
  assert.deepEqual(zigbee.rank([]).slice(0, 5).map((row) => row.channel), [15, 20, 25, 11, 12]);
  // Every channel from 1 to 13 marked: every centre up to 2480 is inside or beyond one band.
  const all = zigbee.advise(zigbee.WIFI_CHANNELS);
  assert.ok(all.distance === null || all.distance >= 0);
  assert.ok(all.best !== 26);
});

test("zigbee: channel 26 is never first, even when it is the furthest away", () => {
  // Wi-Fi 1 to 4 leaves the top of the band empty, where 26 scores highest.
  const wifi = [1, 2, 3, 4];
  assert.ok(zigbee.score(26, wifi) >= zigbee.score(25, wifi));
  assert.notEqual(zigbee.advise(wifi).best, 26);
  assert.equal(zigbee.rank(wifi).at(-1).channel, 26);
});

test("zigbee: bad input is dropped and the order does not matter", () => {
  assert.deepEqual(zigbee.cleanWifi([6, 1, 6, 0, 14, 2.5, "3", null, 11]), [1, 6, 11]);
  assert.deepEqual(zigbee.advise([11, 1, 6]), zigbee.advise([1, 6, 11]));
  assert.deepEqual(zigbee.advise(undefined).wifi, []);
});

test("zigbee: the strip puts every channel inside the drawing, in order", () => {
  for (const shape of wifiShapes()) {
    assert.ok(shape.x >= 0 && shape.x + shape.width <= STRIP.width, `Wi-Fi ${shape.channel} is outside`);
    assert.ok(shape.y + shape.height < STRIP.zigbeeTop);
  }
  const marks = zigbeeShapes();
  assert.equal(marks.length, 16);
  for (const mark of marks) assert.ok(mark.cellX >= 0 && mark.cellX + 46 <= STRIP.width);
  // Wi-Fi channels in the same lane never overlap each other.
  const lanes = new Map();
  for (const shape of wifiShapes()) lanes.set(shape.y, [...(lanes.get(shape.y) ?? []), shape]);
  for (const row of lanes.values()) for (let i = 1; i < row.length; i += 1) assert.ok(row[i].x >= row[i - 1].x + row[i - 1].width);
});

test("zigbee: the words name the channel, the overlap and the reason", () => {
  const view = zigbeeView([1, 6, 11], "da");
  assert.equal(view.best, "25");
  assert.match(view.reason, /Kanal 25 .* 2 MHz/);
  assert.match(view.overlap, /^Overlapper Wi-Fi: 11, 12, 13, 14, 16/);
  assert.match(view.summary, /1, 6, 11/);
  assert.match(zigbeeView([1, 6, 11], "en").reason, /Channel 25 is furthest .* 2 MHz/);
  assert.match(zigbeeView([], "da").reason, /15/);
  assert.equal(zigbeeView([], "en").overlap, zigbeeCopy.en.result.noOverlap);
});

test("the Zigbee texts have the same keys in Danish and English", () => {
  const keys = (value, path = "") =>
    typeof value === "string" ? [path] : Object.entries(value).flatMap(([key, child]) => keys(child, `${path}.${key}`)).sort();
  assert.deepEqual(keys(zigbeeCopy.en), keys(zigbeeCopy.da));
});

test("the zigbee-kanal tool is in the catalog, the sidebar and both languages, and links only to pages that exist", async () => {
  const slug = "zigbee-kanal";
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
