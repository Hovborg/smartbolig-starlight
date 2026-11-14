// A blank surface to draw a texture on. The house runs both on the page and
// in a worker (worker.mjs), and a worker has no document to make a canvas from.
export function blankCanvas(width, height = width) {
  if (typeof document === "undefined") return new OffscreenCanvas(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
