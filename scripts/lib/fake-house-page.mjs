// A page and a worker with just enough of the browser for the tests of the
// 3D house on the homepage (site-house-stage.test.mjs).

const RENDERER = 0x1f01;
const UNMASKED = 0x9246;

/** A WebGL context that reports `chip` as its graphics chip. */
function fakeGl(chip, log) {
  return {
    RENDERER,
    getParameter: (key) => ({ [RENDERER]: "WebKit WebGL", [UNMASKED]: chip })[key] ?? null,
    getExtension: (name) => ({
      WEBGL_debug_renderer_info: { UNMASKED_RENDERER_WEBGL: UNMASKED },
      WEBGL_lose_context: { loseContext: () => log.push("released") },
    })[name] ?? null,
  };
}

/** `chip` is the name of a graphics chip, or null for a canvas without WebGL. */
const contextOf = (chip, log) => (kind, options) => {
  log.push(`${kind}:${JSON.stringify(options)}`);
  return chip === null ? null : fakeGl(chip, log);
};

export class FakeWorker {
  static started = [];
  sent = [];
  listeners = {};
  terminated = false;
  constructor() { FakeWorker.started.push(this); }
  addEventListener(type, handler) { (this.listeners[type] ??= []).push(handler); }
  postMessage(message) { if (!this.terminated) this.sent.push(message); }
  terminate() { this.terminated = true; }
  emit(type, data) { for (const handler of this.listeners[type] ?? []) handler({ data }); }
  /** The calls after the mount message, as text. */
  calls() { return this.sent.slice(1).map((message) => `${message.name}(${JSON.stringify(message.args)})`); }
}

/**
 * `worker` and `page` say what a canvas in a worker and on the page can draw
 * with: the name of a graphics chip, null for no WebGL, or false (worker
 * only) for a browser that cannot hand a canvas to a worker at all.
 */
export function fakePage({ worker = "Apple M3", page = "Apple M3", stored = null } = {}) {
  const probes = [];
  const element = (extra = {}) => ({
    dataset: {}, hidden: true, style: {}, events: {},
    addEventListener(type, handler) { this.events[type] = handler; },
    removeEventListener() {},
    toggleAttribute() {},
    ...extra,
  });
  const canvas = element({
    isConnected: false, handed: 0, replaced: 0,
    transferControlToOffscreen() { this.handed += 1; return { offscreen: true }; },
    cloneNode: () => element(),
    replaceWith() { this.replaced += 1; },
  });
  const screen = element({ clientWidth: 800, clientHeight: 600 });
  const spotBox = element();
  const turn = element();
  const html = element();
  html.dataset.homeMotion = "on";
  const root = {
    querySelector: (selector) => ({
      "[data-house-screen]": screen, "[data-house-canvas]": canvas, "[data-house-spots]": spotBox, "[data-house-turn]": turn,
    })[selector] ?? null,
    querySelectorAll: () => [],
  };
  const Observer = class { observe() {} disconnect() {} };
  const win = {
    devicePixelRatio: 2,
    navigator: {},
    sessionStorage: { getItem: () => stored },
    matchMedia: () => ({ matches: false }),
    getComputedStyle: () => ({ getPropertyValue: () => "" }),
    setTimeout: () => 0, clearTimeout() {},
    addEventListener() {}, removeEventListener() {},
    ResizeObserver: Observer, IntersectionObserver: Observer, MutationObserver: Observer,
  };
  if (worker !== false) {
    win.Worker = FakeWorker;
    win.OffscreenCanvas = class { getContext = contextOf(worker, probes); };
    win.HTMLCanvasElement = class { transferControlToOffscreen() {} };
  }
  const doc = {
    documentElement: html,
    readyState: "complete",
    createElement: () => ({ getContext: contextOf(page, probes) }),
  };
  return { win, doc, root, canvas, screen, spotBox, turn, html, probes };
}
