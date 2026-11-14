// SVG compositions for the logo lockup and the Open Graph image.
import { markSvg } from "./mark.mjs";
import { textPath } from "./text.mjs";

const NOMINAL_MARK = 100; // lockup is built at this mark size, then scaled
const WORD_SIZE = 61; // 1.3rem next to a 34px mark in the header, same ratio
const GAP = 28; // 0.6rem next to a 34px mark

/** "SmartBolig.net" as outlined paths: baseline at y=0, left at x=0. */
export function wordmark(colors, size = WORD_SIZE) {
  const smart = textPath("Smart", { size, weight: 700, tracking: -0.015 });
  const bolig = textPath("Bolig", { size, weight: 700, tracking: -0.015 });
  const tld = textPath(".net", { size: size * 0.72, weight: 500 });
  const x1 = smart.width + size * -0.015;
  const x2 = x1 + bolig.width + size * -0.015;
  const svg =
    `<path d="${smart.d}" fill="${colors.ink}"/>` +
    `<path transform="translate(${x1.toFixed(2)} 0)" d="${bolig.d}" fill="${colors.accent}"/>` +
    `<path transform="translate(${x2.toFixed(2)} 0)" d="${tld.d}" fill="${colors.inkSubtle}"/>`;
  return { svg, width: x2 + tld.width, capHeight: smart.capHeight };
}

/** Mark + wordmark, centred in width x height. bg=null leaves it transparent. */
export function logoSvg(colors, { width, height, bg, padding }) {
  const word = wordmark(colors);
  const natural = NOMINAL_MARK + GAP + word.width;
  const scale = Math.min((width - 2 * padding.x) / natural, (height - 2 * padding.y) / NOMINAL_MARK);
  const x = (width - natural * scale) / 2;
  const y = (height - NOMINAL_MARK * scale) / 2;
  // Optically centre the text on the mark: the middle of the capitals on the tile's middle.
  const baseline = NOMINAL_MARK / 2 + word.capHeight / 2;
  const bgRect = bg ? `<rect width="${width}" height="${height}" fill="${bg}"/>` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    bgRect +
    `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(4)})">` +
    markSvg({ size: NOMINAL_MARK, tile: colors.accent, onTile: colors.onAccent }) +
    `<g transform="translate(${NOMINAL_MARK + GAP} ${baseline.toFixed(2)})">${word.svg}</g></g></svg>`
  );
}

function wrap(text, maxWidth, size) {
  const lines = [];
  let line = "";
  for (const w of text.split(" ")) {
    const next = line ? `${line} ${w}` : w;
    if (line && textPath(next, { size, weight: 700, tracking: -0.025 }).width > maxWidth) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  return [...lines, line];
}

/** 1200x630 link-preview image: lockup top left, headline, big mark on the right. */
export function ogSvg(colors, headline) {
  const W = 1200;
  const H = 630;
  const left = 88;
  const size = 70;
  const lines = wrap(headline, 640, size);
  const lead = size * 1.12;
  const word = wordmark(colors, 40);
  const headTop = 232;
  const text = lines
    .map((l, i) => {
      const p = textPath(l, { size, weight: 700, tracking: -0.025 });
      return `<path transform="translate(${left} ${(headTop + size * 0.7 + i * lead).toFixed(1)})" d="${p.d}" fill="${colors.ink}"/>`;
    })
    .join("");
  const bigMark = 330;
  const bx = W - 88 - bigMark;
  const by = (H - bigMark) / 2 + 20;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<rect width="${W}" height="${H}" fill="${colors.bg}"/>` +
    `<circle cx="${bx + bigMark / 2}" cy="${by + bigMark / 2}" r="268" fill="${colors.accentSoft}"/>` +
    markSvg({ x: bx, y: by, size: bigMark, tile: colors.accent, onTile: colors.onAccent }) +
    markSvg({ x: left, y: 88, size: 64, tile: colors.accent, onTile: colors.onAccent }) +
    `<g transform="translate(${left + 64 + 18} ${(88 + 32 + word.capHeight / 2).toFixed(1)})">${word.svg}</g>` +
    text +
    `</svg>`
  );
}
