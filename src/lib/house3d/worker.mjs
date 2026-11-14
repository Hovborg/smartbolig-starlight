// The house in a worker thread. Building the model, compiling its shaders and
// drawing every frame happen here, so the page never waits for the house.
// remote.mjs is the page's side; protocol.mjs lists the messages.
import { createEngine } from "./engine.mjs";
import { CONTROLS } from "./protocol.mjs";

let house = null;

function mount({ canvas, options }) {
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    self.postMessage({ type: "lost" });
  });
  house = createEngine(canvas, {
    ...options,
    onFrame: (spots) => self.postMessage({ type: "spots", spots }),
  });
}

self.addEventListener("message", ({ data }) => {
  if (data.type === "mount") {
    try {
      mount(data);
    } catch (error) {
      self.postMessage({ type: "failed", reason: String(error?.message ?? error) });
    }
  } else if (data.type === "call" && house && CONTROLS.includes(data.name)) {
    house[data.name](...data.args);
  }
});
