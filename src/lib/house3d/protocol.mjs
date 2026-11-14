// What the page and the worker say to each other (remote.mjs and worker.mjs).
//
// Page to worker:
//   { type: "mount", canvas, options }   once, with the canvas handed over
//   { type: "call", name, args }         one of CONTROLS on the engine
// Worker to page:
//   { type: "spots", spots }             after every frame: where the hotspots are
//   { type: "failed", reason }           the house could not start
//   { type: "lost" }                     the browser took the graphics context away

/** The engine's controls that the page may call (engine.mjs). */
export const CONTROLS = ["setMode", "setFocus", "setView", "rotate", "setDragging", "setMotion", "setVisible", "resize"];
