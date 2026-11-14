// Where the keyboard is while an answer is on its way: Stop takes the place of
// Send, and focus never falls back to the top of the page.
import assert from "node:assert/strict";
import test from "node:test";

import { createComposer } from "../src/scripts/assistant/composer.ts";
import { createErrorRenderer } from "../src/scripts/assistant/error-view.ts";

// A page with just enough of the DOM for focus: one active element and a body.
function fakePage(t) {
  class Part extends EventTarget {
    hidden = false;
    disabled = false;
    attributes = {};
    children = [];
    setAttribute(name, value) { this.attributes[name] = value; }
    append(...parts) { this.children.push(...parts); }
    focus() { page.activeElement = this; }
  }
  const page = { activeElement: null, body: new Part(), createElement: () => new Part() };
  const before = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { value: page, configurable: true, writable: true });
  t.after(() => (before ? Object.defineProperty(globalThis, "document", before) : delete globalThis.document));
  return { page, Part };
}

test("Stop takes the place of Send, takes over the focus and ignores the press that sent the question", (t) => {
  const { page, Part } = fakePage(t);
  const [panel, input, sendButton, stopButton, form, elsewhere] = Array.from({ length: 6 }, () => new Part());
  form.contains = (element) => [input, sendButton, stopButton].includes(element);
  stopButton.hidden = true;
  let now = 1_000;
  let stops = 0;
  t.mock.method(performance, "now", () => now);
  const state = { isSending: false };
  const { setBusy, bindComposer } = createComposer({ panel, input, sendButton, stopButton, form, modeButtons: [], state }, () => {});
  bindComposer(() => {}, () => { stops += 1; });
  const press = () => stopButton.dispatchEvent(new Event("click"));

  page.activeElement = input;
  setBusy(true);
  assert.deepEqual([sendButton.hidden, stopButton.hidden, input.disabled], [true, false, true]);
  assert.equal(panel.attributes["aria-busy"], "true");
  assert.equal(page.activeElement, stopButton, "the keyboard stays in the composer");

  // The second half of a double click on Send, and a held Enter, are not a stop.
  now += 150;
  press();
  assert.equal(stops, 0);
  const held = Object.assign(new Event("keydown", { cancelable: true }), { key: "Enter", repeat: true });
  stopButton.dispatchEvent(held);
  assert.equal(held.defaultPrevented, true);

  now += 400;
  press();
  assert.equal(stops, 1);

  setBusy(false);
  assert.deepEqual([sendButton.hidden, stopButton.hidden, input.disabled], [false, true, false]);
  press();
  assert.equal(stops, 1, "Stop does nothing when no answer is on its way");

  // Focus that was somewhere else on the page is left alone.
  page.activeElement = elsewhere;
  setBusy(true);
  assert.equal(page.activeElement, elsewhere);

  // Focus that is nowhere goes to Stop: the retry button that was pressed is gone.
  setBusy(false);
  page.activeElement = page.body;
  setBusy(true);
  assert.equal(page.activeElement, stopButton);
});

test("a failed answer moves a keyboard that was on Stop to the retry button; a stopped answer does not", (t) => {
  const { page, Part } = fakePage(t);
  const [messagesElement, stopButton, elsewhere] = Array.from({ length: 3 }, () => new Part());
  const root = { dataset: { labelRetry: "Prøv igen" } };
  const renderError = createErrorRenderer({ root, messagesElement, stopButton }, () => {});
  const lastNotice = () => messagesElement.children.at(-1);
  const retryOf = (notice) => notice.children.at(-1);

  page.activeElement = stopButton;
  renderError("Jeg kunne ikke svare denne gang.");
  assert.equal(lastNotice().attributes.role, "alert");
  assert.equal(retryOf(lastNotice()).textContent, "Prøv igen");
  assert.equal(page.activeElement, retryOf(lastNotice()), "the next step has the focus");

  // The reader stopped the answer: no alert, and the conversation puts focus back in the field.
  page.activeElement = stopButton;
  renderError("Svaret blev stoppet.", { quiet: true });
  assert.equal(lastNotice().attributes.role, undefined);
  assert.equal(lastNotice().attributes["aria-live"], "off");
  assert.equal(page.activeElement, stopButton);

  // A reader who is somewhere else on the page is not pulled into the panel.
  page.activeElement = elsewhere;
  renderError("Jeg kunne ikke svare denne gang.");
  assert.equal(page.activeElement, elsewhere);
});
