// Generates the whole brand set from the one house mark that SiteTitle.astro
// draws in the header. Run with `npm run brand:build`; the output is committed,
// the site build does not depend on it. Deterministic: same input, same bytes.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { light, dark } from "./lib/brand/palette.mjs";
import { MARK, houseSvg, scaledMarkSvg } from "./lib/brand/mark.mjs";
import { logoSvg, ogSvg } from "./lib/brand/compose.mjs";
import { pngToIco } from "./lib/brand/ico.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = (rel) => path.join(root, "public", rel);
const OG_LINE = "Guides til Home Assistant, ESPHome og det smarte hjem";

function write(rel, data) {
  const file = out(rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, data);
  console.log(`${rel} (${data.length} bytes)`);
}

const png = (svg, { palette = false } = {}) =>
  sharp(Buffer.from(svg), { density: 72 }).png({ compressionLevel: 9, palette, effort: 10 }).toBuffer();

// favicon.svg: plain colours, no filters, only the two brand colours.
const favicon =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MARK.viewBox} ${MARK.viewBox}">` +
  `<rect width="32" height="32" rx="${MARK.tileRadius}" fill="${light.accent}"/>${houseSvg(light.onAccent)}</svg>
`;
write("favicon.svg", favicon);

const rounded = (size) => png(favicon.replace("<svg ", `<svg width="${size}" height="${size}" `));
const bleed = (size, scale = 1) => png(scaledMarkSvg({ size, tile: light.accent, onTile: light.onAccent, scale }));

write("favicon.ico", pngToIco(await rounded(32), 32));
write("apple-touch-icon.png", await bleed(180));
write("brand/icon/icon-192.png", await rounded(192));
write("brand/icon/icon-512.png", await rounded(512));
// Maskable: the house sits well inside the central safe zone (80 % circle).
write("brand/icon/icon-maskable-512.png", await bleed(512, 0.72));

const padding = { x: 60, y: 36 };
const size = { width: 1200, height: 270, padding };
write("brand/logo/logo-dark-1200x270.png", await png(logoSvg(light, { ...size, bg: light.bg })));
write("brand/logo/logo-light-1200x270.png", await png(logoSvg(dark, { ...size, bg: dark.bg })));
write("brand/logo/logo.svg", logoSvg(light, { ...size, bg: null }) + "\n");

write("images/og-image.png", await png(ogSvg(light, OG_LINE), { palette: true }));
