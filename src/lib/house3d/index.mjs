// Public entry to the 3D house. Loaded on demand (dynamic import), so the
// 3D library is never part of the first page load.
import { createEngine } from "./engine.mjs";
import { readSystemColors, systemFallback } from "./palette.mjs";

export { modes, views } from "./modes.mjs";

/**
 * Start the house on a canvas. Returns null when the browser cannot do
 * WebGL; the page then keeps showing its still image.
 */
export function mountHouse(canvas, options = {}) {
  const colors = options.colors ?? (canvas.isConnected ? readSystemColors(canvas) : systemFallback);
  try {
    return createEngine(canvas, { ...options, colors });
  } catch (error) {
    console.warn("3D house unavailable:", error);
    return null;
  }
}
