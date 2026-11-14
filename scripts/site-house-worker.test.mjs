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

/** Every file reached from `entry` through relative imports. */
async function graph(entry) {
  const seen = new Map();
  const follow = async (path) => {
    if (seen.has(path)) return;
    const source = await read(path);
    seen.set(path, source);
    for (const [, target] of source.matchAll(/(?:from|import)\s*\(?\s*["'](\.\.?\/[^"']+)["']/g)) {
      await follow(new URL(target, `file:///${path}`).pathname.slice(1));
    }
  };
  await follow(entry);
  return seen;
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
  assert.match(worker, /type: "failed"/, "a house that cannot start must tell the page");
  assert.match(worker, /webglcontextlost/);
});

test("nothing the worker loads needs a document or a window", async () => {
  const files = await graph(`${DIR}worker.mjs`);
  assert.ok(files.has(`${DIR}engine.mjs`) && files.has(`${DIR}parts/shell.mjs`) && files.has(`${DIR}textures.mjs`));
  for (const [path, source] of files) {
    if (path === `${DIR}canvas.mjs`) continue;
    // assert.ok keeps a failure short; doesNotMatch would print the whole file.
    assert.ok(!/\b(document|window)\.\w/.test(source), `${path} would fail in a worker`);
  }
  // Read on the page and sent with the mount message instead (remote.mjs).
  assert.doesNotMatch(files.get(`${DIR}engine.mjs`), /readSystemColors|getComputedStyle/);
});

test("the page's side of the house never loads the 3D library", async () => {
  const files = await graph(`${DIR}remote.mjs`);
  assert.deepEqual([...files.keys()].sort(), [`${DIR}palette.mjs`, `${DIR}protocol.mjs`, `${DIR}remote.mjs`]);
  for (const [path, source] of files) assert.doesNotMatch(source, /from ["']three/, path);
  assert.match(files.get(`${DIR}remote.mjs`), /new Worker\(new URL\("\.\/worker\.mjs", import\.meta\.url\), \{ type: "module" \}\)/);
});

test("a live house needs a graphics chip, a still picture does not", async () => {
  const stage = await read(`${DIR}stage.mjs`);
  assert.match(stage, /failIfMajorPerformanceCaveat: !still/);
  assert.match(stage, /if \(!still && SOFTWARE\.test\(/);
  const software = new RegExp(stage.match(/const SOFTWARE = \/(.+)\/i;/)[1], "i");
  for (const name of [
    "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)",
    "llvmpipe (LLVM 19.1.0, 256 bits)",
    "ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "Apple Software Renderer",
  ]) assert.match(name, software, name);
  for (const name of [
    "ANGLE (NVIDIA, NVIDIA GeForce RTX 5090 (0x00002B85) Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "Apple M3", "Adreno (TM) 750", "Mali-G715", "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)", "",
  ]) assert.doesNotMatch(name, software, name);
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
