// The homepage's side of the 3D house: where it is drawn, and what the page
// shows when the house is slow, lost or cannot be drawn. docs/3d-hus.md.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createHouseStage } from "../src/lib/home-house-stage.mjs";
import { COMPILE_LIMIT_MS, firstFrameGate } from "../src/lib/house3d/first-frame.mjs";
import { chipName, drawingPlace, OVERRIDE_KEY, SOFTWARE } from "../src/lib/house3d/probe.mjs";
import { FakeWorker, fakePage } from "./lib/fake-house-page.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const SWIFTSHADER = "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)";

/** A stage on a fake page. remote.mjs starts its worker through the global. */
async function stage(options) {
  FakeWorker.started.length = 0;
  globalThis.Worker = FakeWorker;
  const page = fakePage(options);
  let unavailable = 0;
  const house = createHouseStage(page.win, page.doc, page.root, { onUnavailable: () => { unavailable += 1; } });
  return { ...page, house, workers: FakeWorker.started, unavailable: () => unavailable };
}

/** Runs `body` with the console's warnings and errors switched off. */
async function quietly(body) {
  const { warn, error } = console;
  console.warn = () => {};
  console.error = () => {};
  try {
    return await body();
  } finally {
    Object.assign(console, { warn, error });
  }
}

test("the house is drawn in a worker where a worker can draw it", () => {
  const { win, doc, probes } = fakePage();
  assert.equal(drawingPlace(win, doc), "worker");
  assert.deepEqual(probes, ['webgl2:{"failIfMajorPerformanceCaveat":true}', "released"], "one test context, given back at once");
});

test("a browser whose workers have no WebGL draws the house on the page", () => {
  // Safari 16.4 to 16.6 has OffscreenCanvas, but only for 2D drawing.
  const safari = fakePage({ worker: null });
  assert.equal(drawingPlace(safari.win, safari.doc), "page");
  const old = fakePage({ worker: false });
  assert.equal(drawingPlace(old.win, old.doc), "page");
  assert.equal(old.probes.length, 2, "only the page's canvas was tried");
});

test("without a graphics chip the house is not drawn at all", () => {
  for (const options of [
    { worker: null, page: null },
    { worker: SWIFTSHADER, page: SWIFTSHADER },
    { worker: false, page: "llvmpipe (LLVM 19.1.0, 256 bits)" },
  ]) {
    const { win, doc } = fakePage(options);
    assert.equal(drawingPlace(win, doc), "none", JSON.stringify(options));
  }
  const throwing = fakePage();
  throwing.win.OffscreenCanvas = class { getContext() { throw new Error("blocked"); } };
  throwing.doc.createElement = () => ({ getContext() { throw new Error("blocked"); } });
  assert.equal(drawingPlace(throwing.win, throwing.doc), "none");
});

test("the names of software drawing are recognised, the names of graphics chips are not", () => {
  for (const name of [
    SWIFTSHADER,
    "llvmpipe (LLVM 19.1.0, 256 bits)",
    "ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "Apple Software Renderer",
  ]) assert.match(name, SOFTWARE, name);
  for (const name of [
    "ANGLE (NVIDIA, NVIDIA GeForce RTX 5090 (0x00002B85) Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "Apple M3", "Adreno (TM) 750", "Mali-G715", "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)", "",
  ]) assert.doesNotMatch(name, SOFTWARE, name);
});

test("a browser that hides the chip's name is judged by the name it does give", () => {
  const gl = { RENDERER: 1, getExtension: () => null, getParameter: (key) => (key === 1 ? "llvmpipe (LLVM 15.0.7, 256 bits)" : null) };
  assert.equal(chipName(gl), "llvmpipe (LLVM 15.0.7, 256 bits)");
  assert.match(chipName(gl), SOFTWARE);
});

test("the way of drawing can be chosen by hand for debugging", () => {
  assert.equal(OVERRIDE_KEY, "sb-house-draw");
  const onPage = fakePage({ stored: "page" });
  assert.equal(drawingPlace(onPage.win, onPage.doc), "page");
  const off = fakePage({ stored: "none" });
  assert.equal(drawingPlace(off.win, off.doc), "none");
  assert.equal(off.probes.length, 0);
  const blocked = fakePage();
  blocked.win.sessionStorage = { getItem() { throw new Error("storage is blocked"); } };
  assert.equal(drawingPlace(blocked.win, blocked.doc), "worker");
});

test("a browser that cannot draw the house keeps the still picture and fetches nothing", async () => {
  const { house, workers, canvas, screen, turn, unavailable } = await stage({ worker: null, page: null });
  // A house that is fetched and then fails says so in the console; this one is never fetched.
  const said = [];
  const { warn, error } = console;
  console.warn = (...parts) => said.push(parts.join(" "));
  console.error = console.warn;
  try {
    assert.equal(await house.load(), undefined);
  } finally {
    Object.assign(console, { warn, error });
  }
  assert.deepEqual(said, []);
  assert.equal(screen.dataset.state, "still");
  assert.equal(workers.length, 0);
  assert.equal(canvas.handed, 0);
  assert.equal(turn.hidden, true);
  assert.equal(unavailable(), 1);
});

test("a browser whose workers have no WebGL never hands its canvas to a worker", async () => {
  const { house, workers, canvas } = await stage({ worker: null });
  // The fake canvas cannot really draw, so the house on the page gives up.
  await quietly(() => house.load());
  assert.equal(workers.length, 0);
  assert.equal(canvas.handed, 0, "a canvas given to a worker could not be drawn on the page");
});

test("the first picture from the worker switches the screen from still to live", async () => {
  const { house, workers, canvas, screen, spotBox } = await stage();
  assert.equal(canvas.handed, 0);
  await house.load();
  const [worker] = workers;
  assert.equal(canvas.handed, 1);
  assert.equal(screen.dataset.state, "loading");
  assert.equal(house.live(), false);
  worker.emit("message", { type: "spots", spots: {} });
  assert.equal(screen.dataset.state, "live");
  assert.equal(spotBox.hidden, false);
  assert.equal(house.live(), true);
});

test("a browser that cannot start a worker draws the house on the page", async () => {
  const { house, canvas, screen, win } = await stage();
  win.Worker = globalThis.Worker = class { constructor() { throw new Error("workers are blocked"); } };
  // The fake canvas cannot really draw, so the house on the page gives up:
  // its warning shows that drawing on the page was tried.
  const warnings = [];
  const { warn, error } = console;
  console.warn = (...args) => warnings.push(String(args[0]));
  console.error = () => {};
  try {
    await house.load();
  } finally {
    Object.assign(console, { warn, error });
  }
  assert.equal(canvas.handed, 0, "the canvas stayed with the page");
  assert.equal(screen.dataset.state, "still");
  assert.equal(warnings.filter((text) => text.startsWith("3D house unavailable")).length, 1);
});

test("a live house that is lost hides its hotspots with it", async () => {
  const { house, workers, screen, spotBox } = await stage();
  await house.load();
  workers[0].emit("message", { type: "spots", spots: {} });
  assert.equal(spotBox.hidden, false);
  workers[0].emit("message", { type: "lost" });
  assert.equal(screen.dataset.state, "still");
  assert.equal(spotBox.hidden, true);
});

test("a house that was removed is not handed out again", async () => {
  const { house, workers } = await stage();
  assert.ok(await house.load());
  house.dispose();
  assert.equal(await house.load(), null);
  assert.equal(workers.length, 1);
});

test("a worker that cannot draw gives the still picture back", async () => {
  const { house, workers, screen, turn, unavailable } = await stage();
  await house.load();
  await quietly(() => workers[0].emit("message", { type: "failed", reason: "Error creating WebGL context." }));
  assert.equal(screen.dataset.state, "still");
  assert.equal(workers[0].terminated, true);
  assert.equal(workers.length, 1, "no second try");
  assert.equal(turn.hidden, true);
  assert.equal(unavailable(), 1);
});

test("what the visitor changed while the house loaded is sent when it has loaded", async () => {
  const { house, workers, html } = await stage();
  const loading = house.load();
  html.dataset.homeMotion = "off";
  house.show({ mode: "night", view: "overview", focus: null });
  await loading;
  const [worker] = workers;
  assert.equal(worker.sent[0].options.motion, true, "read before the visitor switched motion off");
  assert.deepEqual(worker.calls().slice(0, 3), ['setMode(["night"])', "setMotion([false])", "resize([800,600,1.5])"]);
});

test("a house that is removed while it loads never starts", async () => {
  const { house, workers, canvas, screen } = await stage();
  const loading = house.load();
  house.dispose();
  assert.equal(await loading, null);
  assert.equal(workers.length, 0);
  assert.equal(canvas.handed, 0, "the canvas stays with the page");
  assert.equal(screen.dataset.state, undefined);
});

test("a house that is removed after it started stops its worker and leaves a fresh canvas", async () => {
  const { house, workers, canvas, screen, turn } = await stage();
  await house.load();
  house.dispose();
  assert.equal(workers[0].terminated, true);
  assert.equal(canvas.replaced, 1, "a canvas that went to a worker cannot draw again");
  assert.equal(screen.dataset.state, undefined);
  assert.equal(turn.hidden, true);
});

test("a picture that arrives after the house was lost does not bring it back", async () => {
  const { house, workers, screen, spotBox } = await stage();
  await house.load();
  const [worker] = workers;
  worker.emit("message", { type: "lost" });
  assert.equal(screen.dataset.state, "still");
  worker.emit("message", { type: "spots", spots: {} });
  assert.equal(screen.dataset.state, "still");
  assert.equal(spotBox.hidden, true);
  assert.equal(house.live(), false);
});

test("a lost house is lost once, and nothing more is sent to it", async () => {
  const { house, workers, screen, unavailable } = await stage();
  await house.load();
  const [worker] = workers;
  worker.emit("message", { type: "spots", spots: {} });
  worker.emit("message", { type: "lost" });
  worker.emit("error", undefined);
  assert.equal(unavailable(), 1);
  const sent = worker.sent.length;
  house.show({ mode: "day", view: "overview", focus: null });
  assert.equal(worker.sent.length, sent);
  assert.equal(await house.load(), null);
  assert.equal(screen.dataset.state, "still");
});

test("the engine stays stopped after dispose and does not wait for shaders for ever", async () => {
  const engine = await read("src/lib/house3d/engine.mjs");
  const body = (name) => engine.slice(engine.indexOf(`  function ${name}(`), engine.indexOf("\n  }\n", engine.indexOf(`  function ${name}(`)));
  assert.match(body("wake"), /^  function wake\(\) \{\n    if \(disposed\) return;/);
  assert.match(body("resize"), /\{\n    if \(disposed\) return;/);
  assert.match(engine, /dispose\(\) \{\n      disposed = true;\n      cancelAnimationFrame\(raf\);/);
  assert.match(engine, /compiling = firstFrameGate\(compileStage\(stage\)\)\.then\(\(\) => \{\n\s+ready = true;\n\s+wake\(\);/);
  assert.ok(COMPILE_LIMIT_MS >= 1500 && COMPILE_LIMIT_MS <= 4000, "long enough for a slow phone, short enough to notice");
});

const turn = () => new Promise((done) => { setImmediate(done); });

test("the first picture waits for the shaders, but not past the limit", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let shown = false;
  firstFrameGate(new Promise(() => {})).then(() => { shown = true; });
  t.mock.timers.tick(COMPILE_LIMIT_MS - 1);
  await turn();
  assert.equal(shown, false, "still waiting for the shaders");
  t.mock.timers.tick(1);
  await turn();
  assert.equal(shown, true, "the limit lets the picture through");
});

test("shaders that are ready, or that fail, let the first picture through at once", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const shown = [];
  firstFrameGate(Promise.resolve()).then(() => shown.push("ready"));
  firstFrameGate(Promise.reject(new Error("no shaders"))).then(() => shown.push("failed"));
  await turn();
  assert.deepEqual(shown.sort(), ["failed", "ready"]);
});
