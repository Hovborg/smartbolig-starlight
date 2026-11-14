// Rehype plugin: tells the browser how wide a guide's pictures are shown, so it
// fetches the smallest file that fills the text column.
//
// Astro makes every picture in several widths (config/images.mjs). On its own
// it assumes a picture fills the whole window, so a laptop would still fetch
// the widest file for a column half that wide.
//
// Drawings (SVG) are sharp at any width and stay one file.

import { isLocalPicture } from "./local-picture.mjs";

// All in rem. The column is never wider than --sb-measure; beside it stand the
// page's edges (below 50rem), the menu (from 50rem) and the menu plus the table
// of contents (from 72rem). A page without a table of contents has a wider
// column from 72rem, so such pages have no pictures (site-images.test.mjs).
const MEASURE = 45;
const EDGES = 2;
const MENU = 22;
const MENU_AND_CONTENTS = 40;

/** How wide the text column is at each window width (measured, see docs/billeder.md). */
export const COLUMN_SIZES = [
  `(min-width: ${MEASURE + MENU_AND_CONTENTS}rem) ${MEASURE}rem`,
  `(min-width: 72rem) calc(100vw - ${MENU_AND_CONTENTS}rem)`,
  `(min-width: ${MEASURE + MENU}rem) ${MEASURE}rem`,
  `(min-width: 50rem) calc(100vw - ${MENU}rem)`,
  `(min-width: ${MEASURE + EDGES}rem) ${MEASURE}rem`,
  `calc(100vw - ${EDGES}rem)`,
].join(", ");

function eachImage(node, visit) {
  if (node.type === "element" && node.tagName === "img") visit(node);
  for (const child of node.children ?? []) eachImage(child, visit);
}

export function rehypeBodyImages() {
  return (tree) => {
    eachImage(tree, (image) => {
      const src = String(image.properties?.src ?? "");
      // Only pictures Astro optimizes get widths; public/ ones stay as written.
      if (!isLocalPicture(src)) return;
      if (/\.svg$/i.test(src)) image.properties.layout = "none";
      else image.properties.sizes = COLUMN_SIZES;
    });
  };
}
