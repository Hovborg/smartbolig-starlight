// Composes the news header image as one SVG. Every piece of text is an outlined
// path from the site's own fonts, so the result is identical on every machine.
import { dark as colors } from "../brand/palette.mjs";
import { markSvg } from "../brand/mark.mjs";
import { textPath } from "../brand/text.mjs";
import { wordmark } from "../brand/compose.mjs";
import { fitHeadline } from "./headline.mjs";
import { motifSvg, seedFrom } from "./motif.mjs";

const W = 1200;
const M = 72;
const LANDSCAPE_SIZES = [84, 78, 72, 66, 60, 56, 52, 48, 44];
const TALL_SIZES = [120, 112, 104, 96, 88, 80, 72, 66];
const xmlEscape = (v) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const place = (d, x, y, fill) => `<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" d="${d}" fill="${fill}"/>`;

const COPY = {
  da: { tag: "AI-nyheder", locale: "da-DK", fallback: "AI-nyheder" },
  en: { tag: "AI News", locale: "en-GB", fallback: "AI News" },
};

export function formatDate(date, lang = "da") {
  return new Intl.DateTimeFormat(COPY[lang].locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

function brand(lang) {
  const word = wordmark(colors, 30);
  const tag = textPath(`·  ${COPY[lang].tag}`, { size: 22, weight: 600, font: "text" });
  const baseline = M + 22 + word.capHeight / 2;
  return (
    markSvg({ x: M, y: M, size: 44, tile: colors.accent, onTile: colors.onAccent }) +
    `<g transform="translate(${M + 44 + 16} ${baseline.toFixed(1)})">${word.svg}</g>` +
    place(tag.d, M + 44 + 16 + word.width + 14, baseline, colors.inkSubtle)
  );
}

// Date in the accent colour, then the source chips as neutral outlined pills.
function meta(date, providers, lang, y) {
  const d = textPath(formatDate(date, lang), { size: 28, weight: 700, font: "text" });
  let out = place(d.d, M, y + 28, colors.accent);
  let x = M + d.width + 32;
  for (const name of providers) {
    const t = textPath(name, { size: 21, weight: 600, font: "text" });
    const w = t.width + 40;
    out +=
      `<rect x="${x.toFixed(1)}" y="${y - 4}" width="${w.toFixed(1)}" height="42" rx="21" fill="${colors.surface}" fill-opacity="0.6" stroke="${colors.lineStrong}" stroke-width="1.5"/>` +
      place(t.d, x + 20, y + 24, colors.inkMuted);
    x += w + 12;
  }
  return out;
}

export function renderNewsSvg({ width = W, height, date, headline, providers, motif, lang = "da" }) {
  const tall = height >= 850;
  const text = String(headline || "").trim() || `${COPY[lang].fallback}, ${formatDate(date, lang)}`;
  const columnWidth = tall ? W - 2 * M : 640;
  const fit = fitHeadline(text, { maxWidth: columnWidth, sizes: tall ? TALL_SIZES : LANDSCAPE_SIZES, maxLines: 3 });
  const brandBottom = M + 44;
  let top;
  let metaY;
  let motifBox;
  if (tall) {
    top = brandBottom + 90;
    metaY = height - M - 38;
    const free = metaY - (top + fit.height) - 70;
    const r = Math.max(150, Math.min(250, free / 2 - 10));
    motifBox = { cx: W - M - r - 24, cy: metaY - 40 - r, r };
  } else {
    metaY = height - M - 38;
    top = brandBottom + (metaY - brandBottom - fit.height) / 2 - 6;
    motifBox = { cx: W - M - 190, cy: height / 2 + 6, r: height < 650 ? 168 : 180 };
  }
  const lines = fit.paths.map((p, i) => place(p.d, M, top + fit.capHeight + i * fit.lead, "#ffffff")).join("");
  const copyBottom = Math.round(metaY + 42);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-motif="${motif}" data-headline-lines="${fit.lines.length}" data-headline-size="${fit.size}" data-text-column-right="${M + columnWidth}" data-copy-bottom="${copyBottom}">` +
    `<title>${xmlEscape(fit.lines.join(" "))}</title>` +
    `<defs><radialGradient id="corner" cx="${width}" cy="0" r="${Math.round(width * 0.62)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${colors.accentVivid}" stop-opacity="0.2"/><stop offset="1" stop-color="${colors.accentVivid}" stop-opacity="0"/></radialGradient>` +
    `<pattern id="dots" width="36" height="36" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.4" fill="#ffffff" fill-opacity="0.055"/></pattern></defs>` +
    `<rect width="${width}" height="${height}" fill="${colors.bg}"/><rect width="${width}" height="${height}" fill="url(#dots)"/>` +
    `<rect width="${width}" height="${height}" fill="url(#corner)"/>` +
    motifSvg(motif, { ...motifBox, colors, seed: seedFrom(`${text}${date}`) }) +
    brand(lang) +
    lines +
    meta(date, providers, lang, metaY) +
    `</svg>`
  );
}
