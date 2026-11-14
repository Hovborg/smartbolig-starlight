// The page's side of the house when it is drawn in a worker (worker.mjs).
// Hands back the same controls as the engine; each call is a message. The 3D
// library is loaded by the worker, never by the page.
import { readSystemColors, systemFallback } from "./palette.mjs";
import { CONTROLS } from "./protocol.mjs";

const startWorker = () => new Worker(new URL("./worker.mjs", import.meta.url), { type: "module" });

/**
 * Start the house in a worker. Returns null when that is not possible; the
 * canvas is then untouched and the caller can draw on the page (index.mjs).
 * `onFrame` gets the hotspots' places after every frame. `onGone` is called
 * when the worker cannot draw, or loses its graphics context later.
 */
export function mountHouse(canvas, { onFrame, onGone, ...options } = {}, createWorker = startWorker) {
  // The worker cannot read the page's design tokens: the colours go with the message.
  const colors = options.colors ?? (canvas.isConnected ? readSystemColors(canvas) : systemFallback);
  let worker;
  try {
    // A canvas that has been handed over cannot be taken back. What cannot be
    // sent to a worker is therefore found here, before the canvas goes.
    const sendable = structuredClone({ ...options, colors });
    worker = createWorker();
    worker.addEventListener("message", ({ data }) => {
      if (data.type === "spots") return onFrame?.(data.spots);
      if (data.type === "failed") console.warn("3D house unavailable:", data.reason);
      if (data.type === "failed" || data.type === "lost") onGone?.();
    });
    worker.addEventListener("error", () => onGone?.());
    const surface = canvas.transferControlToOffscreen();
    worker.postMessage({ type: "mount", canvas: surface, options: sendable }, [surface]);
  } catch {
    worker?.terminate();
    return null;
  }

  const house = { dispose: () => worker.terminate() };
  for (const name of CONTROLS) house[name] = (...args) => worker.postMessage({ type: "call", name, args });
  return house;
}
