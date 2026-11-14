// A table wrapper (config/markdown/table-scroll.mjs) becomes a named region
// that can take keyboard focus only while its table is wider than the column.
// Tables that fit add no extra stops for keyboard and screen-reader users.
// Without this script a wide table still scrolls by touch, wheel and, in
// browsers that focus scrollers themselves, by keyboard.

/** Set or clear the region on one wrapper. Returns whether it scrolls. */
export function markTable(box) {
  const scrolls = box.scrollWidth > box.clientWidth + 1;
  if (scrolls) {
    box.setAttribute("tabindex", "0");
    box.setAttribute("role", "region");
    box.setAttribute("aria-label", box.dataset.label || "");
  } else {
    for (const name of ["tabindex", "role", "aria-label"]) box.removeAttribute(name);
  }
  return scrolls;
}

export function watchTables(doc = document, win = window) {
  const boxes = [...doc.querySelectorAll(".table-scroll")];
  if (!win.ResizeObserver) return boxes.forEach(markTable);
  const sizes = new win.ResizeObserver((entries) => entries.forEach((entry) => markTable(entry.target)));
  boxes.forEach((box) => sizes.observe(box));
}
