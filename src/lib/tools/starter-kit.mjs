// The rules of the starter kit builder: answers in, ids out. No DOM and no
// texts, so every combination of answers can be tested
// (scripts/site-tools-kit.test.mjs). What the ids stand for is in
// starter-kit-items.mjs; how the page shows them is in StarterKit.astro.

import { BLOCKS, GOALS, HAVES, HOMES, ITEMS, STEPS } from "./starter-kit-items.mjs";

/**
 * The answers in a known shape. Anything unknown becomes the careful choice:
 * no goals, a tenant, nothing owned, no soldering.
 */
export function readAnswers(answers = {}) {
  const chosen = Array.isArray(answers?.goals) ? answers.goals : [];
  return {
    goals: GOALS.filter((goal) => chosen.includes(goal)),
    home: HOMES.includes(answers?.home) ? answers.home : "tenant",
    have: HAVES.includes(answers?.have) ? answers.have : "nothing",
    diy: answers?.diy === true,
  };
}

// One sensor serves two goals: the second block points at the first instead
// of asking the reader to buy the same part twice.
const GOAL_PARTS = {
  light: () => ["light-bulb", "light-button", "light-motion", "light-dimmer"],
  heating: (goals) => ["heat-trv", goals.includes("climate") ? "heat-sensor-shared" : "heat-sensor"],
  energy: () => ["energy-plug", "energy-han"],
  security: (goals) => ["security-door", goals.includes("light") ? "security-motion-shared" : "security-motion"],
  climate: () => ["climate-sensor"],
};

function diyParts(goals) {
  const wants = (...names) => names.some((name) => goals.includes(name));
  return ["diy-board", wants("light") && "diy-light", wants("light", "security") && "diy-motion", wants("climate", "heating") && "diy-climate"].filter(Boolean);
}

/**
 * The kit for a set of answers:
 *   items   ids from ITEMS, in the order the page shows them
 *   blocks  the blocks those items sit in
 *   steps   three to five ids from STEPS, in the order they are done
 *   notes   ids from NOTES that apply to these answers
 */
export function buildKit(answers) {
  const { goals, home, have, diy } = readAnswers(answers);
  const tenant = home === "tenant";

  const wanted = [...goals.flatMap((goal) => GOAL_PARTS[goal](goals)), ...(diy ? diyParts(goals) : [])];
  // A tenant gets nothing that becomes part of the fixed installation.
  const parts = wanted.filter((id) => !(tenant && ITEMS[id].fixed));
  const uses = (radio) => parts.some((id) => ITEMS[id].radio === radio);
  const zigbee = uses("zigbee");
  const askLandlord = tenant && parts.some((id) => ITEMS[id].landlord);

  const picked = new Set([have === "ha" ? "brain-own" : "brain-ha", zigbee && "link-zigbee", uses("wifi") && "link-wifi", ...parts]);
  const items = Object.keys(ITEMS).filter((id) => picked.has(id));
  const inKit = new Set(items.map((id) => ITEMS[id].block));

  const steps = new Set([
    askLandlord && "landlord",
    have === "ha" ? "backup" : "install",
    zigbee && "zigbee",
    "device",
    goals.length > 0 ? `auto-${goals[0]}` : "auto-first",
  ]);
  const notes = [
    tenant && "tenant",
    have === "bridge" && "bridge",
    have === "ha" && zigbee && "have-zigbee",
    have === "bridge" && zigbee && "bridge-zigbee",
    askLandlord && "landlord",
    goals.length === 0 && "no-goal",
  ].filter(Boolean);

  return {
    items,
    blocks: BLOCKS.filter((block) => inKit.has(block)),
    steps: Object.keys(STEPS).filter((id) => steps.has(id)),
    notes,
  };
}
