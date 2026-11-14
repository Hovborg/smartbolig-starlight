// What a kit means for the page: which marked elements show, and the three
// numbers in the summary. No DOM, so the component can use it on the server
// and the script in the browser, and both agree.
//
// Every element that depends on the answers carries data-kit="<kind>:<id>",
// where kind is item, block, step or note.

import { DEFAULT_ANSWERS, ITEMS, NOSCRIPT_ANSWERS } from "./starter-kit-items.mjs";
import { buildKit } from "./starter-kit.mjs";

/** The data-kit values a kit shows. */
export function kitKeys(kit) {
  return new Set([
    ...kit.items.map((id) => `item:${id}`),
    ...kit.blocks.map((id) => `block:${id}`),
    ...kit.steps.map((id) => `step:${id}`),
    ...kit.notes.map((id) => `note:${id}`),
  ]);
}

/** Parts to get, how many of them have a shop link, and the first steps. */
export function kitCounts(kit) {
  const parts = kit.items.map((id) => ITEMS[id]);
  return {
    parts: parts.filter((part) => part.product || part.gap).length,
    links: parts.filter((part) => part.product).length,
    steps: kit.steps.length,
  };
}

const atStart = kitKeys(buildKit(DEFAULT_ANSWERS));
const withoutScript = kitKeys(buildKit(NOSCRIPT_ANSWERS));

/** The numbers the page is built with, before any answer is changed. */
export const START_COUNTS = kitCounts(buildKit(DEFAULT_ANSWERS));

/**
 * The attributes a marked element is built with: hidden unless the start
 * kit shows it, and whether it shows when JavaScript is off (kit-states.css).
 */
export function startState(key) {
  return { "data-kit": key, hidden: !atStart.has(key), "data-noscript": withoutScript.has(key) ? "show" : "hide" };
}
