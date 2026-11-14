// Wires the starter kit builder (StarterKit.astro) to its rules. The page is
// built with every part and step already in it; this only reads the answers,
// asks the rules for a kit and switches `hidden` on the marked elements.
// It builds no links and no markup, fetches nothing and stores nothing.

import { part, setText, show } from "./dom.mjs";
import { buildKit } from "./starter-kit.mjs";
import { kitCounts, kitKeys } from "./starter-kit-view.mjs";

export function startStarterKit(root) {
  const goals = [...root.querySelectorAll("[data-goal]")];
  const marked = [...root.querySelectorAll("[data-kit]")];
  const chosen = (name) => root.querySelector(`input[name="${root.id}-${name}"]:checked`)?.value;

  const answers = () => ({
    goals: goals.filter((chip) => chip.getAttribute("aria-pressed") === "true").map((chip) => chip.dataset.goal),
    home: chosen("home"),
    have: chosen("have"),
    diy: chosen("diy") === "yes",
  });

  // `byReader` is true when an answer was just changed: a part that comes
  // into view is then marked, so the stylesheet can let it arrive calmly.
  function render(byReader) {
    const kit = buildKit(answers());
    const keys = kitKeys(kit);
    for (const element of marked) {
      const visible = keys.has(element.dataset.kit);
      element.toggleAttribute("data-arrived", byReader && visible && element.hidden);
      show(element, visible);
    }
    for (const [name, count] of Object.entries(kitCounts(kit))) setText(part(root, name), String(count));
  }

  for (const chip of goals) {
    chip.addEventListener("click", () => {
      chip.setAttribute("aria-pressed", String(chip.getAttribute("aria-pressed") !== "true"));
      render(true);
    });
  }
  for (const input of root.querySelectorAll('input[type="radio"]')) input.addEventListener("change", () => render(true));

  // A browser may bring back earlier choices on reload; show the kit for what is chosen now.
  render(false);
}
