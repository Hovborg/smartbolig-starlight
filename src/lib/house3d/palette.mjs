// Plain colours of the 3D models; textured surfaces are in textures.mjs.
// The system colours and the colours of the day come from the site's design tokens at run time
// (see readSystemColors), so the brand colours are still defined in one
// place: src/styles/tokens/color.css.
export const palette = {
  white: 0xecebe7,
  ceramic: 0xf3f2ef,
  dark: 0x17191c,
  steel: 0xaeb3b8,
  screen: 0x0b0d10,
  stone: 0x2b2d30,
  cabinet: 0xd6d3cb,
  radiator: 0xe6e5e1,
  books: [0x5c6b73, 0x9a7b5a, 0x6f6a7a, 0xb8ad9c, 0x3e4a4f, 0x8a4f3d],
};

/** System colours as fallbacks when the page has no tokens (render scripts). */
export const systemFallback = {
  light: "#f5a524",
  heat: "#ff6f57",
  energy: "#2ee6a3",
  security: "#4ea3ff",
  lamp: "#ffdcb4",
  time: { morning: "#ff9d6b", day: "#4ea8ff", evening: "#6a5cf0", night: "#2b47c9" },
};

/** Read the system colours from the page's design tokens. */
export function readSystemColors(element) {
  const style = element ? getComputedStyle(element) : null;
  const token = (name, fallback) => style?.getPropertyValue(name).trim() || fallback;
  return {
    light: token("--sb-warm-vivid", systemFallback.light),
    heat: token("--sb-danger-vivid", systemFallback.heat),
    energy: token("--sb-accent-vivid", systemFallback.energy),
    security: token("--sb-sky-vivid", systemFallback.security),
    lamp: systemFallback.lamp,
    time: Object.fromEntries(Object.entries(systemFallback.time).map(([name, fallback]) => [name, token(`--sb-time-${name}`, fallback)])),
  };
}
