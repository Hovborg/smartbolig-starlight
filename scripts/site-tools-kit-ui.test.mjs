// Behaviour tests for the script that wires the starter kit builder to its rules
// (src/lib/tools/starter-kit-ui.mjs), run against the small fake DOM in
// scripts/lib/fake-tool-dom.mjs. The rules are tested in site-tools-kit.test.mjs.
import assert from "node:assert/strict";
import test from "node:test";
import { BLOCKS, DEFAULT_ANSWERS, GOALS, HAVES, HOMES, ITEMS, NOTES, STEPS } from "../src/lib/tools/starter-kit-items.mjs";
import { buildKit } from "../src/lib/tools/starter-kit.mjs";
import { kitCounts, kitKeys } from "../src/lib/tools/starter-kit-view.mjs";
import { startStarterKit } from "../src/lib/tools/starter-kit-ui.mjs";
import { fakeElement, fakeRoot } from "./lib/fake-tool-dom.mjs";

const ID = "startsaet";

// A page with every marked element hidden, the way the server builds it for
// answers the start kit does not show; the script decides what is visible.
function kitTool(start = DEFAULT_ANSWERS) {
  const flags = new Set();
  const chips = GOALS.map((goal) => {
    const chip = fakeElement({ dataset: { goal } });
    chip.setAttribute("aria-pressed", String(start.goals.includes(goal)));
    return chip;
  });
  const radio = (name, value, checked) => fakeElement({ name: `${ID}-${name}`, value, checked, type: "radio" });
  const radios = [
    ...HOMES.map((home) => radio("home", home, home === start.home)),
    ...HAVES.map((have) => radio("have", have, have === start.have)),
    radio("diy", "no", !start.diy),
    radio("diy", "yes", start.diy),
  ];
  const keys = [
    ...Object.keys(ITEMS).map((id) => `item:${id}`),
    ...BLOCKS.map((id) => `block:${id}`),
    ...Object.keys(STEPS).map((id) => `step:${id}`),
    ...Object.keys(NOTES).map((id) => `note:${id}`),
  ];
  const marked = keys.map((key) => {
    const element = fakeElement({ dataset: { kit: key }, hidden: true });
    element.toggleAttribute = (name, on) => (on ? flags.add(element) : flags.delete(element));
    return element;
  });
  const parts = { parts: fakeElement(), links: fakeElement(), steps: fakeElement() };
  const base = fakeRoot({ parts, lists: { "[data-goal]": chips, "[data-kit]": marked, 'input[type="radio"]': radios } });
  const root = {
    ...base,
    id: ID,
    querySelector(selector) {
      const name = /^input\[name="(.+)"\]:checked$/.exec(selector)?.[1];
      return name ? (radios.find((input) => input.name === name && input.checked) ?? null) : base.querySelector(selector);
    },
  };
  startStarterKit(root);

  const chip = (goal) => chips.find((item) => item.dataset.goal === goal);
  const visible = () => new Set(marked.filter((element) => !element.hidden).map((element) => element.dataset.kit));
  const choose = (name, value) => {
    for (const input of radios.filter((item) => item.name === `${ID}-${name}`)) input.checked = input.value === value;
    radios.find((input) => input.name === `${ID}-${name}` && input.value === value).fire("change");
  };
  const numbers = () => ({ parts: Number(parts.parts.textContent), links: Number(parts.links.textContent), steps: Number(parts.steps.textContent) });
  return { chip, visible, choose, numbers, flags, marked };
}

const answers = (extra) => ({ ...DEFAULT_ANSWERS, ...extra });
const sameKeys = (tool, expected) => assert.deepEqual([...tool.visible()].sort(), [...kitKeys(buildKit(expected))].sort());

test("kit ui: the start answers show the start kit and hide everything else", () => {
  const tool = kitTool();
  sameKeys(tool, DEFAULT_ANSWERS);
  assert.ok(tool.visible().has("item:light-bulb"));
  assert.ok(!tool.visible().has("item:heat-trv"));
  assert.deepEqual(tool.numbers(), kitCounts(buildKit(DEFAULT_ANSWERS)));
});

test("kit ui: a goal chip toggles its part in and out, and flags what arrives", () => {
  const tool = kitTool();
  tool.chip("heating").fire("click");
  assert.equal(tool.chip("heating").getAttribute("aria-pressed"), "true");
  assert.ok(tool.visible().has("item:heat-trv") && tool.visible().has("block:heating"));
  sameKeys(tool, answers({ goals: ["light", "heating"] }));
  const arrived = [...tool.flags].map((element) => element.dataset.kit);
  assert.ok(arrived.includes("item:heat-trv"), "a part that comes into view is flagged");
  assert.ok(!arrived.includes("item:light-bulb"), "a part that was already there is not");
  tool.chip("heating").fire("click");
  assert.equal(tool.chip("heating").getAttribute("aria-pressed"), "false");
  assert.ok(!tool.visible().has("item:heat-trv"));
  sameKeys(tool, DEFAULT_ANSWERS);
});

test("kit ui: the DIY answer is read the right way round", () => {
  const tool = kitTool();
  assert.ok(!tool.visible().has("block:diy"), "no DIY at the start");
  tool.choose("diy", "yes");
  assert.ok(tool.visible().has("block:diy") && tool.visible().has("item:diy-board"));
  sameKeys(tool, answers({ diy: true }));
  tool.choose("diy", "no");
  assert.ok(!tool.visible().has("block:diy"));
});

test("kit ui: the home and the have radios change the kit", () => {
  const tool = kitTool();
  assert.ok(!tool.visible().has("item:light-dimmer"), "a tenant gets no dimmer");
  tool.choose("home", "owner");
  assert.ok(tool.visible().has("item:light-dimmer"));
  sameKeys(tool, answers({ home: "owner" }));
  tool.choose("home", "tenant");
  assert.ok(!tool.visible().has("item:light-dimmer"));
  tool.choose("have", "ha");
  assert.ok(tool.visible().has("item:brain-own") && !tool.visible().has("item:brain-ha"));
  sameKeys(tool, answers({ have: "ha" }));
  tool.choose("have", "bridge");
  assert.ok(tool.visible().has("note:bridge"));
  sameKeys(tool, answers({ have: "bridge" }));
});

test("kit ui: the three numbers follow the kit", () => {
  const tool = kitTool();
  const before = tool.numbers();
  for (const goal of ["heating", "energy"]) tool.chip(goal).fire("click");
  const expected = kitCounts(buildKit(answers({ goals: ["light", "heating", "energy"] })));
  assert.deepEqual(tool.numbers(), expected);
  assert.ok(expected.parts > before.parts && expected.steps >= before.steps);
});
