// Tests for the rules of the starter kit builder (src/lib/tools/starter-kit.mjs):
// every combination of answers is run. The texts, the guides and the page
// are checked in site-tools-kit-page.test.mjs.
import assert from "node:assert/strict";
import test from "node:test";
import { products } from "../src/data/products/index.mjs";
import { BLOCKS, DEFAULT_ANSWERS, GOALS, HAVES, HOMES, ITEMS, NOSCRIPT_ANSWERS, NOTES, STEPS } from "../src/lib/tools/starter-kit-items.mjs";
import { buildKit, readAnswers } from "../src/lib/tools/starter-kit.mjs";

// All 384 sets of answers: 32 sets of goals, two homes, three "haves", DIY or not.
const goalSets = Array.from({ length: 2 ** GOALS.length }, (_, bits) => GOALS.filter((_, index) => bits & (1 << index)));
const ALL = goalSets.flatMap((goals) => HOMES.flatMap((home) => HAVES.flatMap((have) => [false, true].map((diy) => ({ goals, home, have, diy })))));
const kits = ALL.map((answers) => ({ answers, kit: buildKit(answers) }));
const say = (answers) => JSON.stringify(answers);
const inOrder = (ids, order) => assert.deepEqual(ids, order.filter((id) => ids.includes(id)));

test("every combination of answers gives a kit of known parts, steps and notes", () => {
  assert.equal(kits.length, 384);
  for (const { answers, kit } of kits) {
    inOrder(kit.items, Object.keys(ITEMS));
    inOrder(kit.steps, Object.keys(STEPS));
    inOrder(kit.blocks, BLOCKS);
    inOrder(kit.notes, Object.keys(NOTES));
    assert.deepEqual(new Set(kit.blocks), new Set(kit.items.map((id) => ITEMS[id].block)), say(answers));
    assert.equal(kit.blocks[0], "brain", `${say(answers)} has no brain`);
    for (const goal of answers.goals) assert.ok(kit.blocks.includes(goal), `${say(answers)} has no ${goal} block`);
    assert.equal(kit.blocks.includes("diy"), answers.diy, say(answers));
    assert.ok(kit.steps.length >= 3 && kit.steps.length <= 5, `${say(answers)} has ${kit.steps.length} steps`);
    assert.equal(kit.steps.filter((id) => id.startsWith("auto-")).length, 1, `${say(answers)} needs one first automation`);
    assert.equal(kit.steps.at(-1), answers.goals.length ? `auto-${answers.goals[0]}` : "auto-first");
    assert.equal(kit.notes.includes("no-goal"), answers.goals.length === 0);
  }
});

test("the last step follows the first goal in the order shown, not the order given", () => {
  assert.equal(buildKit({ ...DEFAULT_ANSWERS, goals: ["climate", "light"] }).steps.at(-1), "auto-light");
  assert.equal(buildKit({ ...DEFAULT_ANSWERS, goals: ["security", "energy", "heating"] }).steps.at(-1), "auto-heating");
});

test("every part, step and note in the catalog is used by some kit", () => {
  const used = (name) => new Set(kits.flatMap(({ kit }) => kit[name]));
  assert.deepEqual([...used("items")].sort(), Object.keys(ITEMS).sort());
  assert.deepEqual([...used("steps")].sort(), Object.keys(STEPS).sort());
  assert.deepEqual([...used("notes")].sort(), Object.keys(NOTES).sort());
});

test("products come from the register, and a part is a product, a gap or nothing to buy", () => {
  for (const [id, item] of Object.entries(ITEMS)) {
    assert.ok(BLOCKS.includes(item.block), `${id} sits in an unknown block`);
    assert.ok(item.guide, `${id} has no guide`);
    assert.ok(!(item.product && item.gap), `${id} is both a product and a gap`);
    if (!item.product) {
      assert.equal(item.name, undefined, `${id} names a model without a product`);
      continue;
    }
    assert.ok(Object.hasOwn(products, item.product), `${id}: ${item.product} is not in the register`);
    assert.ok(products[item.product].name.includes(item.name), `${id}: "${item.name}" is not the register's name`);
    // The coordinator is the connection itself; every other product uses one.
    if (item.block !== "link") assert.ok(["zigbee", "wifi"].includes(item.radio), `${id} does not say how it connects`);
  }
});

test("a tenant never gets a part of the fixed installation", () => {
  // Anything wired in behind a switch or in the panel must be marked fixed.
  const wiredIn = /dimmer|relæ|relay|\d(pm|em)\b|shelly-uni/i;
  for (const [id, item] of Object.entries(ITEMS)) {
    if (item.product && wiredIn.test(`${item.product} ${products[item.product].name}`)) assert.equal(item.fixed, true, `${id} is wired in and must be marked fixed`);
  }
  for (const { answers, kit } of kits) {
    const fixed = kit.items.filter((id) => ITEMS[id].fixed);
    if (answers.home === "tenant") assert.deepEqual(fixed, [], `${say(answers)} gives a tenant ${fixed}`);
  }
  assert.ok(buildKit({ goals: ["light"], home: "owner" }).items.includes("light-dimmer"));
  for (const answers of [DEFAULT_ANSWERS, NOSCRIPT_ANSWERS]) assert.equal(readAnswers(answers).home, "tenant");
});

test("a reader with Home Assistant is not told to buy a controller or to install one", () => {
  for (const { answers, kit } of kits) {
    const brain = kit.items.filter((id) => ITEMS[id].block === "brain");
    if (answers.have === "ha") {
      assert.deepEqual(brain, ["brain-own"], say(answers));
      assert.ok(!ITEMS["brain-own"].product && !ITEMS["brain-own"].gap);
      assert.ok(kit.steps.includes("backup") && !kit.steps.includes("install"), say(answers));
    } else {
      assert.deepEqual(brain, ["brain-ha"], say(answers));
      assert.ok(kit.steps.includes("install") && !kit.steps.includes("backup"), say(answers));
    }
    assert.equal(kit.notes.includes("bridge"), answers.have === "bridge");
  }
});

test("the connection follows the parts: a coordinator only with Zigbee parts", () => {
  for (const { answers, kit } of kits) {
    const radios = new Set(kit.items.map((id) => ITEMS[id].radio));
    assert.equal(kit.items.includes("link-zigbee"), radios.has("zigbee"), say(answers));
    assert.equal(kit.items.includes("link-wifi"), radios.has("wifi"), say(answers));
    assert.equal(kit.steps.includes("zigbee"), radios.has("zigbee"), say(answers));
    assert.equal(kit.notes.includes("have-zigbee"), answers.have === "ha" && radios.has("zigbee"), say(answers));
    assert.equal(kit.notes.includes("bridge-zigbee"), answers.have === "bridge" && radios.has("zigbee"), say(answers));
  }
  assert.deepEqual(buildKit({ goals: ["energy"], home: "tenant", have: "nothing" }).items, ["brain-ha", "link-wifi", "energy-plug", "energy-han"]);
});

test("no kit asks for the same product twice", () => {
  for (const { answers, kit } of kits) {
    const bought = kit.items.map((id) => ITEMS[id].product).filter(Boolean);
    assert.equal(new Set(bought).size, bought.length, `${say(answers)} lists a product twice: ${bought}`);
  }
  const both = buildKit({ goals: ["light", "security", "heating", "climate"], home: "owner" }).items;
  assert.ok(both.includes("security-motion-shared") && both.includes("heat-sensor-shared"));
});

test("only a tenant with a radiator thermostat is sent to the landlord", () => {
  for (const { answers, kit } of kits) {
    const ask = answers.home === "tenant" && kit.items.some((id) => ITEMS[id].landlord);
    assert.equal(kit.steps.includes("landlord"), ask, say(answers));
    assert.equal(kit.notes.includes("landlord"), ask, say(answers));
    assert.equal(kit.notes.includes("tenant"), answers.home === "tenant", say(answers));
    if (ask) assert.equal(kit.steps[0], "landlord");
  }
});

test("answers that make no sense become the careful choice", () => {
  const careful = { goals: [], home: "tenant", have: "nothing", diy: false };
  for (const answers of [undefined, null, {}, { goals: "light", home: "castle", have: 7, diy: "yes" }]) assert.deepEqual(readAnswers(answers), careful);
  assert.deepEqual(readAnswers({ goals: ["climate", "nonsense", "light", "light"] }).goals, ["light", "climate"]);
  assert.deepEqual(buildKit(undefined), { items: ["brain-ha"], blocks: ["brain"], steps: ["install", "device", "auto-first"], notes: ["tenant", "no-goal"] });
});

test("the DIY parts follow the goals: strip with light, motion with light or security, sensor with climate or heating", () => {
  for (const { answers, kit } of kits.filter(({ answers }) => answers.diy)) {
    const has = (id) => kit.items.includes(id);
    const wants = (...names) => names.some((name) => answers.goals.includes(name));
    assert.ok(has("diy-board"), say(answers));
    assert.equal(has("diy-light"), wants("light"), `${say(answers)}: the LED strip`);
    assert.equal(has("diy-motion"), wants("light", "security"), `${say(answers)}: the motion sensor`);
    assert.equal(has("diy-climate"), wants("climate", "heating"), `${say(answers)}: the climate sensor`);
  }
  for (const { answers, kit } of kits.filter(({ answers }) => !answers.diy)) assert.ok(kit.items.every((id) => !id.startsWith("diy-")), say(answers));
  // Without a DIY goal the DIY block is the board alone.
  assert.deepEqual(buildKit({ goals: ["energy"], diy: true }).items.filter((id) => id.startsWith("diy-")), ["diy-board"]);
  assert.deepEqual(buildKit({ goals: ["heating"], diy: true }).items.filter((id) => id.startsWith("diy-")), ["diy-board", "diy-climate"]);
});

test("a part that points at a shared part is used only when its source is in the kit", () => {
  const SOURCE = { "heat-sensor-shared": "climate-sensor", "security-motion-shared": "light-motion" };
  const own = { "heat-sensor-shared": "heat-sensor", "security-motion-shared": "security-motion" };
  assert.deepEqual(Object.keys(SOURCE).sort(), Object.keys(ITEMS).filter((id) => id.endsWith("-shared")).sort());
  for (const { answers, kit } of kits) {
    for (const [shared, source] of Object.entries(SOURCE)) {
      if (kit.items.includes(shared)) assert.ok(kit.items.includes(source) && !kit.items.includes(own[shared]), `${say(answers)}: ${shared} without ${source}`);
      if (kit.items.includes(own[shared])) assert.ok(!kit.items.includes(source), `${say(answers)}: ${own[shared]} bought twice`);
    }
  }
  assert.ok(buildKit({ goals: ["heating", "climate"] }).items.includes("heat-sensor-shared"));
  assert.ok(buildKit({ goals: ["heating"] }).items.includes("heat-sensor"));
  assert.ok(buildKit({ goals: ["security", "light"] }).items.includes("security-motion-shared"));
  assert.ok(buildKit({ goals: ["security"] }).items.includes("security-motion"));
});
