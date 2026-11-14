// The page's side of the house when it is drawn in a worker (worker.mjs).
// Hands back the same controls as the engine; each call is a message. The 3D
// library is loaded by the worker, never by the page.
import { readSystemColors, systemFallback } from "./palette.mjs";
import { CONTROLS } from "./protocol.mjs";

const startWorker = () => new Worker(new URL("./worker.mjs", import.meta.url), { type: "module" });

/**
 * Start the house in a worker. Returns null when that is not possible; the
 * caller can then draw on the page instead (index.mjs).
 * `onFrame` gets the hotspots' places after every frame. `onGone` is called
 * when the worker cannot draw, or loses its graphics context later.
 */
export function mountHouse(canvas, { onFrame, onGone, ...options } = {}, createWorker = startWorker) {
  let worker;
  let surface;
  try {
    worker = createWorker();
    surface = canvas.transferControlToOffscreen();
  } catch {
    worker?.terminate();
    return null;
  }
  worker.addEventListener("message", ({ data }) => {
    if (data.type === "spots") return onFrame?.(data.spots);
    if (data.type === "failed") console.warn("3D house unavailable:", data.reason);
    if (data.type === "failed" || data.type === "lost") onGone?.();
  });
  worker.addEventListener("error", () => onGone?.());
  // The worker cannot read the page's design tokens: the colours go with the message.
  const colors = options.colors ?? (canvas.isConnected ? readSystemColors(canvas) : systemFallback);
  worker.postMessage({ type: "mount", canvas: surface, options: { ...options, colors } }, [surface]);

  const house = { dispose: () => worker.terminate() };
  for (const name of CONTROLS) house[name] = (...args) => worker.postMessage({ type: "call", name, args });
  return house;
}
