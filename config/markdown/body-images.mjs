// Rehype plugin: tells the browser how wide a guide's pictures are shown, so it
// fetches the smallest file that fills the text column.
//
// Astro makes every picture in several widths (`image.layout` in
// astro.config.mjs). On its own it assumes a picture fills the whole window,
// so a laptop would still fetch the widest file for a column half that wide.
//
// Drawings (SVG) are sharp at any width and stay one file.

/** The text column: 45rem (--sb-measure) on wide screens, the window's width below that. */
export const COLUMN_SIZES = "(min-width: 50rem) 45rem, 100vw";

function eachImage(node, visit) {
  if (node.type === "element" && node.tagName === "img") visit(node);
  for (const child of node.children ?? []) eachImage(child, visit);
}

export function rehypeBodyImages() {
  return (tree) => {
    eachImage(tree, (image) => {
      const src = String(image.properties?.src ?? "");
      // Only pictures Astro optimizes get widths; public/ ones stay as written.
      if (!src.startsWith(".")) return;
      if (/\.svg$/i.test(src)) image.properties.layout = "none";
      else image.properties.sizes = COLUMN_SIZES;
    });
  };
}
