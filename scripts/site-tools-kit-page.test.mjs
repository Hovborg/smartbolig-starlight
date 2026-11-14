// Tests for what the starter kit builder shows: a text for every part, step
// and note in both languages, guides that exist, the state the page is built
// with, and a component that takes its shop links from the register only.
// The rules themselves are tested in site-tools-kit.test.mjs.
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { starterKitCopy } from "../src/lib/tools/starter-kit-copy.mjs";
import { BLOCKS, DEFAULT_ANSWERS, GOALS, HAVES, HOMES, ITEMS, LIMITS, NOSCRIPT_ANSWERS, NOTES, STEPS } from "../src/lib/tools/starter-kit-items.mjs";
import { buildKit } from "../src/lib/tools/starter-kit.mjs";
import { kitCounts, kitKeys, START_COUNTS, startState } from "../src/lib/tools/starter-kit-view.mjs";

const root = new URL("../", import.meta.url);
const source = (file) => readFile(new URL(file, root), "utf8");
const languages = Object.entries(starterKitCopy);

test("every part, step, note and limit has its text in both languages", () => {
  for (const [lang, t] of languages) {
    assert.deepEqual(Object.keys(t.items).sort(), Object.keys(ITEMS).sort(), `${lang}: parts`);
    for (const [id, item] of Object.entries(ITEMS)) {
      const text = t.items[id];
      assert.ok(text.role && text.why && text.guide, `${lang}: ${id} lacks a text`);
      // A part with nothing to buy says so in a tag; a product or a gap never has one.
      assert.equal(Boolean(text.tag), !item.product && !item.gap, `${lang}: ${id} tag`);
      for (const note of item.notes ?? []) assert.ok(t.notes[note], `${lang}: ${id} shows an unknown note`);
    }
    assert.deepEqual(Object.keys(t.steps).sort(), Object.keys(STEPS).sort(), `${lang}: steps`);
    for (const [id, guides] of Object.entries(STEPS)) assert.equal(t.steps[id].guides.length, guides.length, `${lang}: ${id} needs a text per guide`);
    assert.deepEqual(Object.keys(t.notes).sort(), Object.keys(NOTES).sort(), `${lang}: notes`);
    for (const [id, guide] of Object.entries(NOTES)) assert.equal(Boolean(t.notes[id].link), Boolean(guide), `${lang}: note ${id} link`);
    assert.deepEqual(Object.keys(t.limits).sort(), Object.keys(LIMITS).sort(), `${lang}: limits`);
    for (const [id, guide] of Object.entries(LIMITS)) assert.equal(Boolean(t.limits[id].link), Boolean(guide), `${lang}: limit ${id} link`);
    for (const block of BLOCKS) assert.ok(t.blocks[block], `${lang}: block ${block}`);
    for (const key of [...GOALS.map((goal) => `goals.${goal}`), ...HOMES.map((home) => `home.${home}`), ...HAVES.map((have) => `have.${have}`)]) {
      const [group, name] = key.split(".");
      assert.ok(t[group][name], `${lang}: ${key}`);
    }
  }
});

test("the kit says who fits a part of the fixed installation, and never a price", () => {
  assert.match(starterKitCopy.da.fixed, /faste installation.*autoriseret elinstallatør/);
  assert.match(starterKitCopy.en.fixed, /fixed installation.*authorised electrician/);
  assert.match(starterKitCopy.da.home.hint, /autoriseret elinstallatør/);
  for (const [lang, t] of languages) {
    // "Billigst" may be said of power by the hour, never of a part.
    const texts = [JSON.stringify(t.items), JSON.stringify(t.limits), JSON.stringify(t.notes), t.note, t.gap];
    for (const text of texts) assert.equal(/\d\s*(kr\b|kr\.|DKK|øre\b)|billigst|cheapest|\bbedste\b|\bbest\b/i.test(text), false, `${lang}: a price or a "best" claim in the kit`);
    assert.equal(/\d\s*(kr\b|kr\.|DKK|øre\b)/i.test(JSON.stringify(t)), false, `${lang}: a price in the tool`);
  }
});

test("every guide the kit links to exists in both languages", async () => {
  const guides = new Set([
    ...Object.values(ITEMS).map((item) => item.guide),
    ...Object.values(STEPS).flat(),
    ...Object.values(NOTES).filter(Boolean),
    ...Object.values(LIMITS).filter(Boolean),
    "juridisk/affiliate-disclosure",
  ]);
  for (const guide of guides) {
    for (const lang of ["da", "en"]) {
      const found = await Promise.any([`${guide}.mdx`, `${guide}/index.mdx`].map((file) => access(new URL(`src/content/docs/${lang}/${file}`, root)))).then(() => true, () => false);
      assert.ok(found, `${lang}/${guide} does not exist`);
    }
  }
});

test("the page is built with the start kit shown and the tenant kit for no JavaScript", () => {
  const start = buildKit(DEFAULT_ANSWERS);
  assert.deepEqual(START_COUNTS, kitCounts(start));
  assert.deepEqual(START_COUNTS, { parts: 5, links: 4, steps: 4 });
  assert.deepEqual(startState("item:light-bulb"), { "data-kit": "item:light-bulb", hidden: false, "data-noscript": "show" });
  assert.deepEqual(startState("item:heat-trv"), { "data-kit": "item:heat-trv", hidden: true, "data-noscript": "show" });
  assert.deepEqual(startState("item:light-dimmer"), { "data-kit": "item:light-dimmer", hidden: true, "data-noscript": "hide" });
  const withoutScript = buildKit(NOSCRIPT_ANSWERS);
  assert.deepEqual(withoutScript.blocks, ["brain", "link", ...GOALS]);
  assert.ok(withoutScript.items.every((id) => !ITEMS[id].fixed));
  assert.ok(kitKeys(withoutScript).has("step:landlord") && kitKeys(withoutScript).has("note:tenant"));
  assert.deepEqual(kitCounts(buildKit({ goals: [], have: "ha" })), { parts: 0, links: 0, steps: 3 });
});

test("the component builds every part and step, and shop links only through the register", async () => {
  const parts = await source("src/components/tools/StarterKitParts.astro");
  const item = await source("src/components/tools/StarterKitItem.astro");
  const steps = await source("src/components/tools/StarterKitSteps.astro");
  const frame = await source("src/components/tools/StarterKit.astro");
  // Parts and steps are read from the catalog, so a new one can not be left out.
  assert.match(parts, /Object\.keys\(ITEMS\)\.filter\(\(item\) => ITEMS\[item\]\.block === block\)/);
  assert.match(parts, /\["brain", "link"\]\.map/);
  assert.match(parts, /\[\.\.\.GOALS, "diy"\]\.map/);
  assert.match(steps, /Object\.entries\(STEPS\)\.map/);
  assert.match(item, /<AffiliateLink product=\{item\.product\} \/>/);
  assert.match(item, /\{item\.fixed && <p class="sb-kit-item__fixed">\{t\.fixed\}<\/p>\}/);
  assert.match(parts, /sb-kit-disclosure.*juridisk\/affiliate-disclosure/);
  // Every note is placed once: inside its part, or by name in the list.
  const inParts = new Set(Object.values(ITEMS).flatMap((part) => part.notes ?? []));
  for (const note of Object.keys(NOTES)) assert.ok(inParts.has(note) || parts.includes(`"${note}"`) || parts.includes(`note:${note}`), `note ${note} is not on the page`);
  // No shop address and no register lookup outside AffiliateLink.
  for (const file of [parts, item, steps, frame, await source("src/lib/tools/starter-kit-ui.mjs")]) {
    assert.doesNotMatch(file, /https?:\/\/|productLink|buildAffiliateUrl|proshop/i);
  }
});

test("the script only switches what is already on the page", async () => {
  const ui = await source("src/lib/tools/starter-kit-ui.mjs");
  assert.doesNotMatch(ui, /createElement|\bel\(|\.href|\.append|cloneNode|fetch\(|navigator\./);
  assert.match(ui, /show\(element, visible\)/);
  for (const lang of ["da", "en"]) {
    const page = await source(`src/content/docs/${lang}/vaerktoejer/startsaet.mdx`);
    assert.match(page, new RegExp(`<StarterKit lang="${lang}" />`));
    assert.match(page, /lastUpdated: 2026-11-14/);
  }
});
