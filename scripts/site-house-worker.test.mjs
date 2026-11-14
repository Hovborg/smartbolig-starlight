// The 3D house is drawn in a worker (src/lib/house3d/worker.mjs). These tests
// cover the page's side of that conversation and the rules that keep the
// house able to run without a document.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { blankCanvas } from "../src/lib/house3d/canvas.mjs";
import { systemFallback } from "../src/lib/house3d/palette.mjs";
import { CONTROLS } from "../src/lib/house3d/protocol.mjs";
import { mountHouse } from "../src/lib/house3d/remote.mjs";
import { importGraph } from "./lib/import-graph.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const DIR = "src/lib/house3d/";

class FakeWorker {
  sent = [];
  listeners = {};
  terminated = false;
  addEventListener(type, handler) { (this.listeners[type] ??= []).push(handler); }
  postMessage(message, transfer) { this.sent.push({ message, transfer }); }
  terminate() { this.terminated = true; }
  emit(type, data) { for (const handler of this.listeners[type] ?? []) handler({ data }); }
}

function fakeCanvas() {
  const surface = { offscreen: true };
  return { surface, isConnected: false, handed: 0, transferControlToOffscreen() { this.handed += 1; return surface; } };
}

test("the page hands the canvas to the worker together with the colours", () => {
  const worker = new FakeWorker();
  const canvas = fakeCanvas();
  const house = mountHouse(canvas, { mode: "night", quality: "high", onFrame() {}, onGone() {} }, () => worker);

  assert.ok(house);
  assert.equal(canvas.handed, 1);
  const [{ message, transfer }] = worker.sent;
  assert.equal(message.type, "mount");
  assert.equal(message.canvas, canvas.surface);
  assert.deepEqual(transfer, [canvas.surface], "the canvas is moved to the worker, not copied");
  assert.deepEqual(message.options, { mode: "night", quality: "high", colors: systemFallback });
  assert.doesNotThrow(() => structuredClone(message.options), "functions cannot cross to a worker");
});

test("every control becomes one message, in the order it was called", () => {
  const worker = new FakeWorker();
  const house = mountHouse(fakeCanvas(), {}, () => worker);
  house.resize(800, 600, 2);
  house.setMode("day");
  house.rotate(35);
  house.setVisible(false);

  assert.deepEqual(worker.sent.slice(1).map(({ message }) => message), [
    { type: "call", name: "resize", args: [800, 600, 2] },
    { type: "call", name: "setMode", args: ["day"] },
    { type: "call", name: "rotate", args: [35] },
    { type: "call", name: "setVisible", args: [false] },
  ]);
  for (const name of CONTROLS) assert.equal(typeof house[name], "function", name);
});

test("frames place the hotspots, and a worker that cannot draw is reported once per event", () => {
  const worker = new FakeWorker();
  const frames = [];
  let gone = 0;
  const warn = console.warn;
  console.warn = () => {};
  try {
    mountHouse(fakeCanvas(), { onFrame: (spots) => frames.push(spots), onGone: () => { gone += 1; } }, () => worker);
    worker.emit("message", { type: "spots", spots: { light: { x: 1, y: 2, shown: true } } });
    assert.deepEqual(frames, [{ light: { x: 1, y: 2, shown: true } }]);
    assert.equal(gone, 0);
    worker.emit("message", { type: "failed", reason: "WebGL is drawn in software" });
    assert.equal(gone, 1);
    worker.emit("message", { type: "lost" });
    assert.equal(gone, 2);
    worker.emit("error", undefined);
    assert.equal(gone, 3, "a worker script that fails to load counts as gone");
    worker.emit("message", { type: "something-else" });
    assert.equal(gone, 3, "unknown messages are ignored");
  } finally {
    console.warn = warn;
  }
});

test("a browser that cannot start the worker keeps its canvas for drawing on the page", () => {
  const canvas = fakeCanvas();
  const house = mountHouse(canvas, {}, () => { throw new Error("workers are blocked"); });
  assert.equal(house, null);
  assert.equal(canvas.handed, 0, "the canvas must stay usable");
});

test("a canvas that cannot be handed over stops the worker again", () => {
  const worker = new FakeWorker();
  const canvas = { isConnected: false, transferControlToOffscreen() { throw new Error("already has a context"); } };
  assert.equal(mountHouse(canvas, {}, () => worker), null);
  assert.equal(worker.terminated, true);
  assert.equal(worker.sent.length, 0);
});

test("a worker that refuses the mount message is stopped", () => {
  const worker = new FakeWorker();
  worker.postMessage = () => { throw new Error("could not be cloned"); };
  assert.equal(mountHouse(fakeCanvas(), {}, () => worker), null);
  assert.equal(worker.terminated, true);
});

test("disposing the house stops the worker", () => {
  const worker = new FakeWorker();
  const house = mountHouse(fakeCanvas(), {}, () => worker);
  house.dispose();
  assert.equal(worker.terminated, true);
});

test("the worker only runs the controls the engine has", async () => {
  const [engine, worker] = await Promise.all([read(`${DIR}engine.mjs`), read(`${DIR}worker.mjs`)]);
  for (const name of CONTROLS) {
    assert.match(engine, new RegExp(`^\\s+${name}(\\(|,$)`, "m"), `engine.mjs has no control named ${name}`);
  }
  assert.match(worker, /CONTROLS\.includes\(data\.name\)/, "a message must not be able to call anything else");
  assert.match(worker, /webglcontextlost/);
});

test("a worker that cannot draw tells the page, and ignores calls to a house it does not have", async () => {
  const posted = [];
  const listeners = {};
  const before = globalThis.self;
  const { error } = console;
  globalThis.self = {
    addEventListener: (type, handler) => { listeners[type] = handler; },
    postMessage: (message) => posted.push(message),
  };
  console.error = () => {};
  try {
    await import("../src/lib/house3d/worker.mjs");
    const send = (data) => listeners.message({ data });
    send({ type: "call", name: "setMode", args: ["day"] });
    assert.deepEqual(posted, [], "nothing is mounted yet");
    // A canvas without WebGL: the same answer as a browser that has none.
    send({ type: "mount", canvas: { addEventListener() {} }, options: { colors: systemFallback } });
    assert.equal(posted.length, 1);
    assert.equal(posted[0].type, "failed");
    assert.equal(typeof posted[0].reason, "string");
    send({ type: "call", name: "resize", args: [800, 600, 1] });
    send({ type: "call", name: "dispose", args: [] });
    send({ type: "unknown" });
    assert.equal(posted.length, 1);
  } finally {
    console.error = error;
    if (before === undefined) delete globalThis.self; else globalThis.self = before;
  }
});

test("nothing the worker loads needs a document or a window", async () => {
  const files = await importGraph(`${DIR}worker.mjs`);
  assert.ok(files.has(`${DIR}engine.mjs`) && files.has(`${DIR}parts/shell.mjs`) && files.has(`${DIR}textures.mjs`));
  // Page-only code in a file the worker also loads; the worker never calls it.
  const pageOnly = new Map([
    [`${DIR}canvas.mjs`, "blankCanvas asks which of the two it is in"],
    [`${DIR}palette.mjs`, "readSystemColors is called by the page"],
    [`${DIR}probe.mjs`, "drawingPlace is called by the page, with the window as an argument"],
  ]);
  const page = /\b(document|window)\.\w|(?<![.\w])(getComputedStyle|matchMedia|requestIdleCallback)\(|(?<![.\w])(localStorage|sessionStorage)\b/;
  for (const [path, source] of files) {
    if (pageOnly.has(path)) continue;
    // assert.ok keeps a failure short; doesNotMatch would print the whole file.
    assert.ok(!page.test(source), `${path} would fail in a worker`);
    assert.ok(!/readSystemColors|drawingPlace/.test(source), `${path} calls code that only runs on the page`);
  }
  assert.match("const size = getComputedStyle(element);", page);
  assert.match("if (matchMedia('(pointer: coarse)').matches) {}", page);
  assert.match("localStorage.getItem('x')", page);
  assert.doesNotMatch("win.matchMedia('x'); win.sessionStorage?.getItem(KEY); doc.createElement('canvas')", page);
});

test("the page's side of the house never loads the 3D library", async () => {
  const files = await importGraph(`${DIR}remote.mjs`, `${DIR}probe.mjs`);
  assert.deepEqual([...files.keys()].sort(), [`${DIR}palette.mjs`, `${DIR}probe.mjs`, `${DIR}protocol.mjs`, `${DIR}remote.mjs`]);
  for (const [path, source] of files) assert.doesNotMatch(source, /from ["']three/, path);
  assert.match(files.get(`${DIR}remote.mjs`), /new Worker\(new URL\("\.\/worker\.mjs", import\.meta\.url\), \{ type: "module" \}\)/);
  // The stage asks where the house can be drawn before it fetches any of it.
  const stage = await read("src/lib/home-house-stage.mjs");
  assert.match(stage, /^import \{ drawingPlace \} from "\.\/house3d\/probe\.mjs";$/m);
  assert.ok(stage.indexOf("drawingPlace(win, doc)") < stage.indexOf('import("./house3d/remote.mjs")'));
  assert.doesNotMatch(stage, /^import .*house3d\/(index|remote|engine)\.mjs/m, "the house itself is fetched on demand");
});

test("a live house needs a graphics chip, a still picture does not", async () => {
  const stage = await read(`${DIR}stage.mjs`);
  assert.match(stage, /failIfMajorPerformanceCaveat: !still/);
  assert.match(stage, /import \{ chipName, SOFTWARE \} from "\.\/probe\.mjs";/);
  assert.match(stage, /if \(!still && SOFTWARE\.test\(chipName\(renderer\.getContext\(\)\)\)\) \{\n    renderer\.dispose\(\);\n    renderer\.forceContextLoss\(\);/);
});

test("a texture canvas is made without a document when there is none", () => {
  class Offscreen { constructor(width, height) { Object.assign(this, { width, height }); } }
  const before = { document: globalThis.document, OffscreenCanvas: globalThis.OffscreenCanvas };
  try {
    delete globalThis.document;
    globalThis.OffscreenCanvas = Offscreen;
    const inWorker = blankCanvas(64, 32);
    assert.ok(inWorker instanceof Offscreen);
    assert.deepEqual([inWorker.width, inWorker.height], [64, 32]);
    assert.deepEqual([blankCanvas(128).width, blankCanvas(128).height], [128, 128]);

    globalThis.document = { createElement: (tag) => ({ tag }) };
    assert.deepEqual(blankCanvas(8, 4), { tag: "canvas", width: 8, height: 4 });
  } finally {
    if (before.document === undefined) delete globalThis.document; else globalThis.document = before.document;
    if (before.OffscreenCanvas === undefined) delete globalThis.OffscreenCanvas; else globalThis.OffscreenCanvas = before.OffscreenCanvas;
  }
});
