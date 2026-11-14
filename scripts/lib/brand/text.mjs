// Turns text into SVG path data from the repo's own font file, so the generated
// images do not depend on any font installed on the machine.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { create } from "fontkitten";

const require = createRequire(import.meta.url);
const file = require.resolve("@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2");
const buffer = readFileSync(file);
const base = create(buffer);
const instances = new Map();

// fontkitten 1.0.3 cannot instance a WOFF2 variable font by itself: getVariation()
// reopens the compressed bytes as a plain TTF, and decoding composite glyphs with
// variation active calls a private method on the wrong receiver. Build the instance
// from the same WOFF2 class instead, and let the one composite-decoding call that
// fails skip the variation of component offsets (only the placement of accent
// parts, not a single letter used in the wordmark, is affected).
const Glyph = Object.getPrototypeOf(base.getGlyph(0).constructor.prototype);
const decodeComposite = Glyph._decodeComposite;
Glyph._decodeComposite = function (glyph, stream) {
  if (this.constructor !== Object) return decodeComposite.call(this, glyph, stream);
  const font = this._font;
  Object.defineProperty(font, "_variationProcessor", { get: () => null, configurable: true });
  try {
    return decodeComposite.call(this, glyph, stream);
  } finally {
    delete font._variationProcessor;
  }
};

function instance(weight) {
  if (!instances.has(weight)) {
    const stream = new base.stream.constructor(new Uint8Array(buffer));
    instances.set(weight, new base.constructor(stream, [weight]));
  }
  return instances.get(weight);
}

const round = (n) => Math.round(n * 100) / 100;

/**
 * Lays out a single line. Returns path data in pixels with the baseline at y=0
 * and the left edge at x=0, plus the advance width. No kerning (fontkitten has
 * no layout engine), which is fine for the short strings used here.
 */
export function textPath(text, { size, weight = 700, tracking = 0 }) {
  const font = instance(weight);
  const scale = size / base.unitsPerEm;
  let x = 0;
  let d = "";
  for (const ch of text) {
    const id = base.glyphForCodePoint(ch.codePointAt(0)).id;
    const glyph = font.getGlyph(id);
    if (glyph.path.commands.length) {
      const p = glyph.path.scale(scale, -scale).translate(x, 0);
      d += p.commands.map(fmt).join("");
    }
    x += glyph.advanceWidth * scale + tracking * size;
  }
  return { d, width: x - tracking * size, capHeight: base.capHeight * scale };
}

function fmt({ command, args }) {
  const a = args.map(round).join(" ");
  switch (command) {
    case "moveTo": return `M${a}`;
    case "lineTo": return `L${a}`;
    case "quadraticCurveTo": return `Q${a}`;
    case "bezierCurveTo": return `C${a}`;
    default: return "Z";
  }
}
