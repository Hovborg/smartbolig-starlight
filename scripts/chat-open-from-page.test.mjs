// "Ask AI" on the homepage: the button beside the search field opens the
// assistant with the cursor in its field, and focus comes back when it closes.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { mountHomeHouse } from "../src/lib/home-house.mjs";
import { homeCopy } from "../src/lib/home-copy.ts";
import { bindPanel } from "../src/scripts/assistant/panel.ts";
import { fakePage } from "./lib/fake-house-page.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

/** The homepage with its two hero buttons, with or without an assistant on the page. */
function homepage({ assistant = true } = {}) {
  const page = fakePage();
  const button = () => ({
    hidden: true,
    handlers: {},
    addEventListener(type, handler) { this.handlers[type] = handler; },
    removeEventListener(type) { delete this.handlers[type]; },
  });
  const search = button();
  const askAi = button();
  const opened = [];
  const rest = page.root.querySelector;
  page.root.dataset = {};
  page.root.querySelector = (selector) =>
    ({ "[data-home-search]": search, "[data-home-ask-ai]": askAi })[selector] ?? rest(selector);
  page.doc.querySelector = (selector) => (selector === "[data-smartbolig-ai]" && assistant ? {} : null);
  page.doc.dispatchEvent = (event) => opened.push(event);
  Object.assign(page.win, { CustomEvent, setInterval: () => 1, clearInterval() {} });
  return { ...page, search, askAi, opened };
}

test("the homepage's Ask AI button asks the assistant to open and says who asked", () => {
  const { win, doc, root, askAi, opened } = homepage();

  const unmount = mountHomeHouse(win, doc, root);
  assert.equal(askAi.hidden, false);

  askAi.handlers.click();
  assert.equal(opened.length, 1);
  assert.equal(opened[0].type, "smartbolig-ai:open");
  assert.equal(opened[0].detail.opener, askAi);

  unmount();
  assert.equal(askAi.hidden, true);
  assert.equal(askAi.handlers.click, undefined);
});

test("the button stays hidden on a page without the assistant", () => {
  const { win, doc, root, askAi } = homepage({ assistant: false });

  mountHomeHouse(win, doc, root);

  assert.equal(askAi.hidden, true);
  assert.equal(askAi.handlers.click, undefined);
});

/** The assistant's panel on a page with just enough of the browser for bindPanel. */
function panelPage(t) {
  const focused = [];
  class FakeElement extends EventTarget {
    hidden = false;
    isConnected = true;
    attributes = {};
    classList = { add() {}, remove() {} };
    constructor(name) {
      super();
      this.name = name;
    }
    setAttribute(name, value) { this.attributes[name] = value; }
    querySelector() { return null; }
    focus() { focused.push(this.name); }
  }
  const globals = { document: new EventTarget(), HTMLElement: FakeElement, requestAnimationFrame: (run) => run() };
  for (const [name, value] of Object.entries(globals)) {
    const before = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
    t.after(() => (before ? Object.defineProperty(globalThis, name, before) : delete globalThis[name]));
  }
  const part = (name) => new FakeElement(name);
  const ctx = {
    root: part("root"), panel: part("panel"), launcher: part("launcher"), closeButton: part("close"),
    input: part("input"), messagesElement: part("messages"), state: { isSending: false },
  };
  ctx.panel.hidden = true;
  bindPanel(ctx, { startLoadingTimer() {}, stopLoadingTimer() {} });
  const open = (opener) => globals.document.dispatchEvent(new CustomEvent("smartbolig-ai:open", { detail: { opener } }));
  const press = (key) => globals.document.dispatchEvent(Object.assign(new Event("keydown"), { key }));
  return { ...ctx, FakeElement, focused, open, press };
}

test("the assistant opens with the cursor in its field and gives focus back to the opener", (t) => {
  const { panel, launcher, closeButton, FakeElement, focused, open, press } = panelPage(t);
  const heroButton = new FakeElement("hero button");

  open(heroButton);
  assert.equal(panel.hidden, false);
  assert.equal(launcher.attributes["aria-expanded"], "true");
  assert.deepEqual(focused, ["input"]);

  // Asked again while it is open: the cursor goes back to the field.
  open(heroButton);
  assert.deepEqual(focused, ["input", "input"]);

  press("Escape");
  assert.equal(panel.hidden, true);
  assert.equal(launcher.attributes["aria-expanded"], "false");
  assert.equal(focused.at(-1), "hero button");

  // The opener is remembered for one closing only.
  launcher.dispatchEvent(new Event("click"));
  closeButton.dispatchEvent(new Event("click"));
  assert.equal(focused.at(-1), "launcher");
});

test("focus goes to the launcher when the opener is gone or is not an element", (t) => {
  const { panel, FakeElement, focused, open, press } = panelPage(t);
  const gone = new FakeElement("removed button");

  open(gone);
  gone.isConnected = false;
  press("Escape");
  assert.equal(focused.at(-1), "launcher");

  open("not an element");
  assert.equal(panel.hidden, false);
  press("Escape");
  assert.equal(focused.at(-1), "launcher");
});

test("the hero keeps its search button and adds Ask AI in both languages", async () => {
  const hero = await read("src/components/home/HomeHero.astro");

  // Both stay hidden until the script has something to open.
  assert.match(hero, /<button class="home-ask__bar" type="button" data-home-search hidden>/);
  assert.match(hero, /<button class="home-ask__ai" type="button" aria-haspopup="dialog" data-home-ask-ai hidden>/);
  assert.match(hero, /\{copy\.search\.askAi\}/);
  assert.equal(homeCopy.da.hero.search.askAi, "Spørg AI");
  assert.equal(homeCopy.en.hero.search.askAi, "Ask AI");
});
