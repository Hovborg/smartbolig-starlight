// The house mark, in the same geometry as src/components/SiteTitle.astro
// (viewBox 32). scripts/site-brand.test.mjs checks that the two stay equal.
export const MARK = {
  viewBox: 32,
  tileRadius: 9.5,
  strokeWidth: 2.4,
  paths: ["M7.5 15.4 16 8l8.5 7.4", "M10 14.2V22a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7.8"],
  dot: { cx: 16, cy: 18.7, r: 2.1 },
};

/** The outline and dot of the house, without a tile. */
export function houseSvg(color) {
  const lines = MARK.paths
    .map((d) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${MARK.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join("");
  const { cx, cy, r } = MARK.dot;
  return `${lines}<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`;
}

/** Tile plus house as a nested svg at (x, y) with the given size. radius 0 = full bleed. */
export function markSvg({ x = 0, y = 0, size = 32, tile, onTile, rounded = true }) {
  const rx = rounded ? MARK.tileRadius : 0;
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 32 32"><rect width="32" height="32" rx="${rx}" fill="${tile}"/>${houseSvg(onTile)}</svg>`;
}

/** The house scaled around the tile centre, for the maskable icon's safe zone. */
export function scaledMarkSvg({ size, tile, onTile, scale }) {
  const o = (32 - 32 * scale) / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32"><rect width="32" height="32" fill="${tile}"/><g transform="translate(${o} ${o}) scale(${scale})">${houseSvg(onTile)}</g></svg>`;
}
