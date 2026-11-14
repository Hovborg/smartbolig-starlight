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

test("zigbee: the usual 1 / 6 / 11 leaves 15, 20, 25 and 26 free, and 25 is the furthest of the recommended ones", () => {
  const advice = zigbee.advise(zigbee.COMMON_WIFI_CHANNELS);
  for (const channel of [15, 20, 25, 26]) assert.ok(advice.free.includes(channel), `${channel} should be free`);
  assert.equal(advice.kind, "preferred");
  assert.equal(advice.best, 25);
  assert.equal(advice.distance, 2);
  assert.equal(zigbee.score(15, [1, 6, 11]), 1);
  assert.equal(zigbee.score(20, [1, 6, 11]), 1);
  assert.equal(zigbee.score(26, [1, 6, 11]), 7);
});

test("zigbee: no Wi-Fi marked recommends 15", () => {
  const none = zigbee.advise([]);
  assert.deepEqual([none.kind, none.best, none.distance, none.overlap], ["none", 15, null, []]);
  assert.deepEqual(none.free, zigbee.ZIGBEE_CHANNELS);
});

test("zigbee case a: a free 15, 20, 25 or 11 wins, the furthest first and 15, 20, 25, 11 on a tie", () => {
  // Wi-Fi 1 and 11: 17 is not recommended although it is free, because 15, 20 and 25 are free.
  const both = zigbee.advise([1, 11]);
  assert.deepEqual([both.kind, both.best, both.distance], ["preferred", 15, 2]);
  const ends = zigbee.advise([1, 13]);
  assert.deepEqual([ends.kind, ends.best, ends.distance], ["preferred", 20, 11]);
  // Only Wi-Fi 13: 11 is furthest away (56 MHz).
  const top = zigbee.advise([13]);
  assert.deepEqual([top.kind, top.best, top.distance], ["preferred", 11, 56]);
  // Wi-Fi 1 / 6 / 11.
  assert.deepEqual([zigbee.advise([1, 6, 11]).best, zigbee.advise([1, 6, 11]).distance], [25, 2]);
  // Ties: 15 and 25 are both 2 MHz away with Wi-Fi 1 and 11 (15 wins); 20 and 11 tie with Wi-Fi 3 and 12 (20 wins).
  assert.equal(zigbee.score(25, [1, 11]), zigbee.score(15, [1, 11]));
  assert.equal(zigbee.score(11, [3, 12]), zigbee.score(20, [3, 12]));
  assert.equal(zigbee.advise([3, 12]).best, 20);
});

test("zigbee case b: when 15, 20, 25 and 11 are all covered, a free channel from 11 to 25 is picked, the furthest, then the lowest", () => {
  const advice = zigbee.advise([1, 2, 7, 12]);
  assert.deepEqual(advice.free, [16, 21, 26]);
  // 16 and 21 are both 1 MHz away: the lowest number wins, and 26 is never an option.
  assert.deepEqual([advice.kind, advice.best, advice.distance], ["other", 16, 1]);
  for (const channel of zigbee.PREFERRED) assert.ok(advice.overlap.includes(channel));
});

test("zigbee case c: when every channel from 11 to 25 overlaps, 15 wins and 26 stays out even when free", () => {
  const withFree26 = zigbee.advise([1, 4, 8, 12]);
  assert.deepEqual(withFree26.free, [26]);
  assert.deepEqual([withFree26.kind, withFree26.best, withFree26.distance], ["covered", 15, 0]);
  const all = zigbee.advise(zigbee.WIFI_CHANNELS);
  assert.deepEqual([all.kind, all.best, all.distance, all.free], ["covered", 15, 0, []]);
});

test("zigbee: over all 8192 sets of Wi-Fi channels the recommendation follows the rule and is never 26", () => {
  for (let mask = 0; mask < 1 << 13; mask += 1) {
    const wifi = zigbee.WIFI_CHANNELS.filter((channel) => mask & (1 << (channel - 1)));
    const advice = zigbee.advise(wifi);
    const label = `Wi-Fi ${wifi.join(",") || "none"}`;
    const free = (channel) => !advice.overlap.includes(channel);
    assert.notEqual(advice.best, 26, label);
    if (zigbee.PREFERRED.some(free)) assert.ok(zigbee.PREFERRED.includes(advice.best), `${label}: ${advice.best} is not recommended`);
    if (zigbee.ZIGBEE_CHANNELS.some((channel) => channel !== 26 && free(channel))) assert.ok(free(advice.best), `${label}: ${advice.best} overlaps`);
    if (wifi.length > 0 && zigbee.PREFERRED.some(free)) {
      const best = Math.max(...zigbee.PREFERRED.filter(free).map((channel) => zigbee.score(channel, wifi)));
      assert.equal(advice.distance, best, label);
    }
  }
});

test("zigbee: channel 26 is never recommended, even when it is the furthest away", () => {
  // Wi-Fi 1 to 4 leaves the top of the band empty, where 26 scores highest.
  const wifi = [1, 2, 3, 4];
  assert.ok(zigbee.score(26, wifi) >= zigbee.score(25, wifi));
  assert.notEqual(zigbee.advise(wifi).best, 26);
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
  assert.equal(
    view.reason,
    "Kanal 25 er den af de anbefalede kanaler (11, 15, 20 og 25) uden overlap, der ligger længst fra det markerede Wi-Fi: 2 MHz fra kanten af det nærmeste markerede bånd.",
  );
  assert.equal(view.overlap, "Overlapper Wi-Fi: 11, 12, 13, 14, 16, 17, 18, 19, 21, 22, 23, 24.");
  assert.equal(view.free, "Uden overlap: 15, 20, 25, 26.");
  assert.equal(view.summary, "Frekvensstrimmel. Markerede Wi-Fi-kanaler: 1, 6, 11. Anbefalet Zigbee-kanal: 25.");
  assert.equal(
    zigbeeView([1, 6, 11], "en").reason,
    "Channel 25 is the one of the recommended channels (11, 15, 20 and 25) without overlap that lies furthest from the marked Wi-Fi: 2 MHz from the edge of the nearest marked band.",
  );
  assert.equal(zigbeeView([], "da").reason, zigbeeCopy.da.result.none);
  assert.equal(zigbeeView([], "en").overlap, zigbeeCopy.en.result.noOverlap);
});

test("zigbee: the reason for case b says the channel is free but not among the recommended ones", () => {
  for (const lang of ["da", "en"]) {
    const reason = zigbeeView([1, 2, 7, 12], lang).reason;
    assert.match(reason, /\b16\b/);
    assert.match(reason, lang === "da" ? /fri for de markerede Wi-Fi-kanaler/ : /free of the marked Wi-Fi channels/);
    assert.match(reason, lang === "da" ? /ikke blandt de kanaler, Zigbee2MQTT og ZHA anbefaler, fordi de alle er dækket/ : /not among the channels Zigbee2MQTT and ZHA recommend, because those are all covered/);
  }
});

test("zigbee: the reason for case c says 11 to 25, and mentions channel 26 only when it is free", () => {
  const da = zigbeeCopy.da.result;
  const en = zigbeeCopy.en.result;
  const free26 = zigbeeView([1, 4, 8, 12], "da").reason;
  assert.equal(free26, `Alle Zigbee-kanaler fra 11 til 25 ligger under et markeret Wi-Fi-bånd. Kanal 15 er valgt efter rækkefølgen 15, 20, 25, 11. ${da.free26}`);
  assert.match(free26, /Kanal 26 er fri, men vi anbefaler den ikke/);
  assert.match(zigbeeView([1, 4, 8, 12], "en").reason, /^Every Zigbee channel from 11 to 25 is under a marked Wi-Fi band\. Channel 15 .* Channel 26 is free, but we do not recommend it/);
  const no26 = zigbeeView(zigbee.WIFI_CHANNELS, "da").reason;
  assert.equal(no26, "Alle Zigbee-kanaler fra 11 til 25 ligger under et markeret Wi-Fi-bånd. Kanal 15 er valgt efter rækkefølgen 15, 20, 25, 11.");
  assert.doesNotMatch(zigbeeView(zigbee.WIFI_CHANNELS, "en").reason, /26/);
  assert.ok(da.free26.includes("26") && en.free26.includes("26"));
});

test("zigbee: no text claims an absolute 'furthest from Wi-Fi' or says 'ingen overlap' (it is 'intet overlap')", () => {
  for (const lang of ["da", "en"]) {
    assert.doesNotMatch(zigbeeCopy[lang].result.apart, /^Kanal \{n\} ligger længst|^Channel \{n\} is furthest/);
  }
  assert.doesNotMatch(JSON.stringify(zigbeeCopy.da), /[Ii]ngen overlap\b|rører mere end|bredeste/);
  assert.doesNotMatch(JSON.stringify(zigbeeCopy.en), /widest common mask/);
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
