// The comment widget (giscus): fetched on request, cleaned up when it does not come.
import assert from "node:assert/strict";
import test from "node:test";
import { loadComments } from "../src/lib/comments.mjs";

const GISCUS = "https://giscus.app";

/** Just enough of a page for loadComments. */
function page({ theme = "dark" } = {}) {
  const timers = new Map();
  const messageListeners = new Set();
  const observers = [];
  const appended = [];
  const posted = [];
  let frame = null;
  const win = {
    setTimeout: (run) => {
      const id = timers.size + 1;
      timers.set(id, run);
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
    addEventListener: (type, run) => type === "message" && messageListeners.add(run),
    removeEventListener: (type, run) => type === "message" && messageListeners.delete(run),
    MutationObserver: class {
      constructor(run) {
        this.run = run;
        this.connected = false;
        observers.push(this);
      }
      observe() {
        this.connected = true;
      }
      disconnect() {
        this.connected = false;
      }
    },
  };
  const doc = {
    documentElement: { dataset: { theme } },
    createElement: () => {
      const listeners = {};
      return { dataset: {}, listeners, removed: false, addEventListener: (type, run) => (listeners[type] = run), remove() { this.removed = true; } };
    },
    querySelector: (selector) => (selector === "iframe.giscus-frame" ? frame : null),
  };
  const wrapper = { dataset: { giscusLang: "en" }, append: (node) => appended.push(node) };
  const calls = { ready: 0, error: 0 };
  loadComments(wrapper, { onReady: () => (calls.ready += 1), onError: () => (calls.error += 1) }, win, doc);
  return {
    doc,
    calls,
    timers,
    observers,
    messageListeners,
    posted,
    script: appended[0],
    /** The widget's frame is on the page. */
    addFrame: () => (frame = { removed: false, contentWindow: { postMessage: (data, origin) => posted.push([data, origin]) }, remove() { this.removed = true; } }),
    frame: () => frame,
    message: (origin, data) => [...messageListeners].forEach((run) => run({ origin, data })),
    runTimers: () => [...timers.values()].forEach((run) => run()),
    changeTheme: (next) => {
      doc.documentElement.dataset.theme = next;
      observers.forEach((observer) => observer.connected && observer.run());
    },
  };
}

test("the widget is asked for with the site's theme and language", () => {
  const { script } = page({ theme: "light" });
  assert.equal(script.src, `${GISCUS}/client.js`);
  assert.equal(script.dataset.theme, "light");
  assert.equal(script.dataset.lang, "en");
  assert.equal(script.dataset.mapping, "pathname");
});

test("only a message from giscus itself counts as the widget being there", () => {
  const { calls, message, timers } = page();
  message("https://evil.example", { giscus: {} });
  message(GISCUS, "giscus");
  message(GISCUS, { other: true });
  assert.equal(calls.ready, 0);
  assert.equal(timers.size, 1, "still waiting");
  message(GISCUS, { giscus: { discussion: {} } });
  message(GISCUS, { giscus: { discussion: {} } });
  assert.equal(calls.ready, 1, "told once");
  assert.equal(timers.size, 0, "the wait is over");
});

test("a widget that cannot be fetched is taken off the page again", () => {
  const blocked = page();
  blocked.addFrame();
  blocked.script.listeners.error();
  assert.equal(blocked.calls.error, 1);
  assert.equal(blocked.script.removed, true);
  assert.equal(blocked.frame().removed, true);
  assert.equal(blocked.messageListeners.size, 0);
  assert.equal(blocked.observers[0].connected, false);
  assert.equal(blocked.timers.size, 0);

  const silent = page();
  silent.runTimers();
  assert.equal(silent.calls.error, 1, "no word from the widget in time");
  assert.equal(silent.script.removed, true);
  assert.equal(silent.messageListeners.size, 0);
});

test("a late error does not take a working widget away", () => {
  const { calls, script, message, messageListeners } = page();
  message(GISCUS, { giscus: {} });
  script.listeners.error();
  assert.equal(calls.error, 0);
  assert.equal(script.removed, false);
  assert.equal(messageListeners.size, 1);
});

test("the widget follows the site's theme once it is there", () => {
  const { addFrame, changeTheme, message, posted } = page({ theme: "dark" });
  addFrame();
  changeTheme("light");
  assert.equal(posted.length, 0, "nothing is sent before the widget has announced itself");
  message(GISCUS, { giscus: {} });
  assert.deepEqual(posted, [[{ giscus: { setConfig: { theme: "light" } } }, GISCUS]], "the change made while it loaded");
  changeTheme("light");
  assert.equal(posted.length, 1, "the same theme is not sent twice");
  changeTheme("dark");
  assert.equal(posted.at(-1)[0].giscus.setConfig.theme, "dark");
  assert.equal(posted.at(-1)[1], GISCUS, "only to giscus");
});
