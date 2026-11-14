// The homepage's day. Owns one piece of state: which time of day and which
// chapter of the tour is showing. The page (colours, pills, chapters) and the
// 3D house (home-house-stage.mjs) both follow it.
import { createHouseStage } from "./home-house-stage.mjs";

const ORDER = ["evening", "night", "morning", "day"];
const AUTOPLAY_MS = 9000;

export function mountHomeHouse(win, doc, root) {
  const html = doc.documentElement;
  const intro = root.querySelector("[data-house-intro]");
  const chapters = [...root.querySelectorAll("[data-house-chapter]")];
  const pills = [...root.querySelectorAll("[data-house-mode]")];
  const pillBox = root.querySelector("[data-house-modes]");
  const rule = root.querySelector("[data-house-rule]");
  const ask = root.querySelector("[data-home-search]");
  // `chosen` is true once the visitor has picked a time of day by hand.
  const state = { mode: "evening", chapter: null, chosen: false };
  const stage = createHouseStage(win, doc, root, {
    onUnavailable() { if (pillBox) pillBox.hidden = true; },
  });
  const undo = [];
  const listen = (target, type, handler) => {
    target.addEventListener(type, handler);
    undo.push(() => target.removeEventListener(type, handler));
  };

  function render() {
    html.dataset.homeMode = state.mode;
    root.dataset.houseChapter = state.chapter ?? "intro";
    for (const pill of pills) {
      const active = pill.dataset.houseMode === state.mode;
      pill.setAttribute("aria-pressed", String(active));
      if (active && rule) rule.textContent = pill.dataset.rule;
    }
    for (const chapter of chapters) chapter.toggleAttribute("data-active", chapter.dataset.houseChapter === state.chapter);
    stage.show({ mode: state.mode, view: state.chapter ?? "overview", focus: state.chapter });
  }

  for (const pill of pills) {
    listen(pill, "click", () => {
      state.mode = pill.dataset.houseMode;
      state.chosen = true;
      stage.load();
      render();
    });
  }

  // A chapter (or the intro) takes over when it crosses a line across the
  // window: the middle on wide screens, lower on phones, where the house
  // covers the top of the window.
  if (win.IntersectionObserver) {
    const band = win.matchMedia?.("(min-width: 64rem)").matches ? "-50% 0px -49% 0px" : "-64% 0px -35% 0px";
    const watcher = new win.IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const id = entry.target.dataset.houseChapter ?? null;
        if (id === state.chapter) continue;
        state.chapter = id;
        if (id) state.mode = entry.target.dataset.mode;
        render();
      }
    }, { rootMargin: band });
    for (const element of [intro, ...chapters]) if (element) watcher.observe(element);
    undo.push(() => watcher.disconnect());
  }

  // On the intro the day passes by itself, until the visitor picks a time.
  const timer = win.setInterval(() => {
    if (state.chosen || state.chapter || doc.hidden) return;
    if (!stage.live() || html.dataset.homeMotion !== "on") return;
    state.mode = ORDER[(ORDER.indexOf(state.mode) + 1) % ORDER.length];
    render();
  }, AUTOPLAY_MS);
  undo.push(() => win.clearInterval(timer));

  // The search field opens the site search from the top bar.
  const opener = doc.querySelector("site-search button[data-open-modal]");
  if (ask && opener) {
    ask.hidden = false;
    // The search closes on any click outside its dialog, and this click is one:
    // it must not travel on to the window.
    listen(ask, "click", (event) => {
      event.stopPropagation();
      opener.click();
    });
  }

  if (pillBox) pillBox.hidden = false;
  root.dataset.house = "on";
  render();

  return () => {
    undo.forEach((fn) => fn());
    stage.dispose();
    if (ask) ask.hidden = true;
    if (pillBox) pillBox.hidden = true;
    for (const chapter of chapters) chapter.removeAttribute("data-active");
    delete root.dataset.house;
    delete root.dataset.houseChapter;
    delete html.dataset.homeMode;
  };
}
