// Where the house can be drawn: in a worker, on the page, or not at all.
// Asked before any of the house is fetched, so a browser that cannot draw it
// never downloads the 3D library. Loads nothing itself.

// Names of WebGL drawn by the processor instead of a graphics chip.
export const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render/i;
/** Set to "page" or "none" in sessionStorage to try the other ways of drawing. */
export const OVERRIDE_KEY = "sb-house-draw";

/** What the browser calls its graphics chip: the plain name and, where it is told, the real one. */
export function chipName(gl) {
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  return [gl.getParameter(gl.RENDERER), info && gl.getParameter(info.UNMASKED_RENDERER_WEBGL)].filter(Boolean).join(" ");
}

/** True when `canvas` gets a WebGL context that a graphics chip draws. */
function drawsWithChip(canvas) {
  let gl = null;
  try {
    gl = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    return Boolean(gl) && !SOFTWARE.test(chipName(gl));
  } catch {
    return false;
  } finally {
    // The test context is given back at once: browsers allow only a few.
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

function override(win) {
  try {
    return win.sessionStorage?.getItem(OVERRIDE_KEY) ?? null;
  } catch {
    return null;
  }
}

/**
 * "worker" when a canvas can be handed to a worker and drawn there with WebGL,
 * "page" when only the page can draw it, "none" when the house cannot be drawn.
 * Some browsers have OffscreenCanvas without WebGL (Safari 16.4 to 16.6): they
 * get "page".
 */
export function drawingPlace(win, doc) {
  const forced = override(win);
  if (forced === "none") return "none";
  const handsOver = typeof win.Worker === "function" && typeof win.OffscreenCanvas === "function"
    && typeof win.HTMLCanvasElement?.prototype.transferControlToOffscreen === "function";
  if (forced !== "page" && handsOver && drawsWithChip(new win.OffscreenCanvas(1, 1))) return "worker";
  return drawsWithChip(doc.createElement("canvas")) ? "page" : "none";
}
