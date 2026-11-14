// Surface textures, drawn in code: wood, tiles, grass, asphalt and so on.
// Nothing is downloaded, so there are no image licences to keep track of.
// Each texture is a colour map plus a height map for small relief.
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import { blankCanvas } from "./canvas.mjs";

const SIZE = 512;

/** Repeatable random numbers, so every render of the house looks the same. */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(size = SIZE) {
  const element = blankCanvas(size);
  return [element, element.getContext("2d")];
}

/** Soft, tileable noise: a small random bitmap stretched over the canvas. */
function noise(ctx, random, cells, alpha, blend = "overlay") {
  const [small, sctx] = canvas(cells);
  const image = sctx.createImageData(cells, cells);
  for (let i = 0; i < cells * cells; i += 1) {
    const value = Math.floor(random() * 255);
    image.data.set([value, value, value, 255], i * 4);
  }
  sctx.putImageData(image, 0, 0);
  const pattern = ctx.createPattern(small, "repeat");
  pattern.setTransform(new DOMMatrix().scale(SIZE / cells));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = blend;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.restore();
}

function grain(ctx, random, layers) {
  for (const [cells, alpha] of layers) noise(ctx, random, cells, alpha);
}

function pair(seed, draw) {
  const [colorCanvas, color] = canvas();
  const [heightCanvas, height] = canvas();
  height.fillStyle = "#808080";
  height.fillRect(0, 0, SIZE, SIZE);
  draw(color, height, seeded(seed));
  const wrap = (source, srgb) => {
    const texture = new CanvasTexture(source);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.anisotropy = 8;
    if (srgb) texture.colorSpace = SRGBColorSpace;
    return texture;
  };
  return { map: wrap(colorCanvas, true), bump: wrap(heightCanvas, false) };
}

/** Rows of boards with staggered ends, each with its own tone and grain. */
function boards(color, height, random, { rows, base, spread, gap, vertical = false }) {
  const step = SIZE / rows;
  for (let row = 0; row < rows; row += 1) {
    let x = -random() * SIZE * 0.5;
    while (x < SIZE) {
      const length = SIZE * (0.45 + random() * 0.4);
      const tone = (random() - 0.5) * spread;
      color.fillStyle = `hsl(${base[0] + tone * 0.3}, ${base[1]}%, ${base[2] + tone}%)`;
      const rect = vertical ? [row * step, x, step, length] : [x, row * step, length, step];
      color.fillRect(...rect);
      // Grain: thin streaks along the board.
      color.strokeStyle = `hsla(${base[0]}, ${base[1]}%, ${base[2] - 14}%, 0.16)`;
      for (let i = 0; i < 7; i += 1) {
        const offset = row * step + random() * step;
        color.lineWidth = 0.6 + random();
        color.beginPath();
        if (vertical) { color.moveTo(offset, x); color.lineTo(offset + (random() - 0.5) * 3, x + length); }
        else { color.moveTo(x, offset); color.lineTo(x + length, offset + (random() - 0.5) * 3); }
        color.stroke();
      }
      for (const ctx of [color, height]) {
        ctx.fillStyle = ctx === color ? `rgba(20, 14, 8, ${gap})` : "#3a3a3a";
        if (vertical) ctx.fillRect(row * step, x + length - 1.5, step, 1.5);
        else ctx.fillRect(x + length - 1.5, row * step, 1.5, step);
      }
      x += length;
    }
    for (const ctx of [color, height]) {
      ctx.fillStyle = ctx === color ? `rgba(20, 14, 8, ${gap})` : "#3a3a3a";
      if (vertical) ctx.fillRect(row * step, 0, 1.6, SIZE);
      else ctx.fillRect(0, row * step, SIZE, 1.6);
    }
  }
  grain(color, random, [[64, 0.1], [256, 0.08]]);
}

/** A grid of slabs with joints; each slab gets a slightly different tone. */
function slabs(color, height, random, { count, base, spread, joint }) {
  const step = SIZE / count;
  for (let y = 0; y < count; y += 1) {
    for (let x = 0; x < count; x += 1) {
      color.fillStyle = `hsl(${base[0]}, ${base[1]}%, ${base[2] + (random() - 0.5) * spread}%)`;
      color.fillRect(x * step, y * step, step, step);
    }
  }
  grain(color, random, [[32, 0.12], [256, 0.1]]);
  for (const ctx of [color, height]) {
    ctx.fillStyle = ctx === color ? joint : "#303030";
    for (let i = 0; i < count; i += 1) {
      ctx.fillRect(i * step - 1.5, 0, 3, SIZE);
      ctx.fillRect(0, i * step - 1.5, SIZE, 3);
    }
  }
}

function speckled(color, height, random, fill, layers, relief = 0.5) {
  color.fillStyle = fill;
  color.fillRect(0, 0, SIZE, SIZE);
  grain(color, random, layers);
  noise(height, random, 256, relief, "source-over");
  noise(height, random, 64, relief * 0.5, "overlay");
}

/** Wood for furniture: one sheet with long grain, no board joints. */
function veneer(color, height, random, base) {
  color.fillStyle = `hsl(${base[0]}, ${base[1]}%, ${base[2]}%)`;
  color.fillRect(0, 0, SIZE, SIZE);
  for (let i = 0; i < 170; i += 1) {
    const y = random() * SIZE;
    color.strokeStyle = `hsla(${base[0]}, ${base[1]}%, ${base[2] + (random() - 0.6) * 22}%, ${0.1 + random() * 0.2})`;
    color.lineWidth = 0.6 + random() * 2.2;
    color.beginPath();
    color.moveTo(0, y);
    color.bezierCurveTo(SIZE * 0.3, y + (random() - 0.5) * 12, SIZE * 0.7, y + (random() - 0.5) * 12, SIZE, y);
    color.stroke();
  }
  grain(color, random, [[64, 0.08], [512, 0.08]]);
  noise(height, random, 256, 0.25, "source-over");
}

const recipes = {
  oakVeneer: (c, h, r) => veneer(c, h, r, [34, 26, 62]),
  walnutVeneer: (c, h, r) => veneer(c, h, r, [24, 30, 30]),
  oak: (c, h, r) => boards(c, h, r, { rows: 8, base: [33, 27, 60], spread: 8, gap: 0.5 }),
  walnut: (c, h, r) => boards(c, h, r, { rows: 6, base: [24, 34, 30], spread: 7, gap: 0.5 }),
  cladding: (c, h, r) => boards(c, h, r, { rows: 14, base: [28, 14, 17], spread: 5, gap: 0.8, vertical: true }),
  tile: (c, h, r) => slabs(c, h, r, { count: 4, base: [40, 6, 78], spread: 4, joint: "rgba(90, 88, 84, 0.7)" }),
  bathTile: (c, h, r) => slabs(c, h, r, { count: 6, base: [200, 8, 70], spread: 5, joint: "rgba(70, 76, 80, 0.7)" }),
  paving: (c, h, r) => slabs(c, h, r, { count: 5, base: [35, 5, 52], spread: 10, joint: "rgba(30, 30, 28, 0.8)" }),
  plaster: (c, h, r) => speckled(c, h, r, "#efebe3", [[128, 0.06], [512, 0.05]], 0.25),
  carpet: (c, h, r) => speckled(c, h, r, "#8f8b84", [[512, 0.3], [128, 0.12]], 0.7),
  fabric: (c, h, r) => speckled(c, h, r, "#7d8088", [[512, 0.28], [64, 0.1]], 0.8),
  linen: (c, h, r) => speckled(c, h, r, "#e6e1d6", [[512, 0.2], [64, 0.08]], 0.6),
  asphalt: (c, h, r) => speckled(c, h, r, "#2c2d2f", [[512, 0.45], [128, 0.2], [16, 0.12]], 0.9),
  concrete: (c, h, r) => speckled(c, h, r, "#8d8c88", [[256, 0.2], [32, 0.14], [8, 0.1]], 0.5),
  roofing: (c, h, r) => {
    speckled(c, h, r, "#1f2124", [[256, 0.2], [32, 0.1]], 0.3);
    for (const ctx of [c, h]) {
      ctx.fillStyle = ctx === c ? "rgba(255,255,255,0.07)" : "#d0d0d0";
      for (let i = 0; i < 8; i += 1) ctx.fillRect(i * (SIZE / 8), 0, 5, SIZE);
    }
  },
  grass: (c, h, r) => {
    c.fillStyle = "#42562f";
    c.fillRect(0, 0, SIZE, SIZE);
    grain(c, r, [[4, 0.1], [16, 0.1], [128, 0.22], [512, 0.4]]);
    // Blades: thousands of short strokes in mixed greens.
    for (let i = 0; i < 9000; i += 1) {
      const x = r() * SIZE;
      const y = r() * SIZE;
      c.strokeStyle = `hsla(${76 + r() * 30}, ${24 + r() * 20}%, ${18 + r() * 22}%, 0.5)`;
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + (r() - 0.5) * 5, y - 2 - r() * 5);
      c.stroke();
    }
    noise(h, r, 512, 0.9, "source-over");
    noise(h, r, 64, 0.5, "overlay");
  },
  solar: (c, h, r) => {
    // One panel: 6 x 10 dark cells with fine silver lines, in a black frame.
    c.fillStyle = "#0b0d12";
    c.fillRect(0, 0, SIZE, SIZE);
    const cols = 6;
    const rowsCount = 10;
    const pad = 10;
    const w = (SIZE - pad * 2) / cols;
    const hgt = (SIZE - pad * 2) / rowsCount;
    for (let y = 0; y < rowsCount; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        c.fillStyle = `hsl(${218 + r() * 6}, ${46 + r() * 8}%, ${11 + r() * 3}%)`;
        c.fillRect(pad + x * w + 1.5, pad + y * hgt + 1.5, w - 3, hgt - 3);
        c.fillStyle = "rgba(190, 205, 225, 0.22)";
        for (let i = 1; i < 4; i += 1) c.fillRect(pad + x * w + (w * i) / 4, pad + y * hgt + 2, 0.8, hgt - 4);
      }
    }
    h.fillStyle = "#909090";
    h.fillRect(pad, pad, SIZE - pad * 2, SIZE - pad * 2);
  },
};

const cache = new Map();

/** The colour and height maps of a surface, by name. */
export function surfaceMaps(name) {
  if (!cache.has(name)) cache.set(name, pair(name.length * 7919 + name.charCodeAt(0), recipes[name]));
  return cache.get(name);
}

/** A cluster of leaves on a transparent card, for trees, hedges and plants. */
export function leafCard(hue = 100) {
  const key = `leaf${hue}`;
  if (!cache.has(key)) {
    const [element, ctx] = canvas(256);
    const random = seeded(hue * 31);
    for (let i = 0; i < 26; i += 1) {
      const x = 128 + (random() - 0.5) * 170;
      const y = 128 + (random() - 0.5) * 170;
      const length = 26 + random() * 26;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(random() * Math.PI * 2);
      ctx.fillStyle = `hsl(${hue + (random() - 0.5) * 26}, ${34 + random() * 22}%, ${17 + random() * 20}%)`;
      ctx.beginPath();
      ctx.ellipse(0, 0, length / 2, length / 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-length / 2, 0);
      ctx.lineTo(length / 2, 0);
      ctx.stroke();
      ctx.restore();
    }
    const texture = new CanvasTexture(element);
    texture.colorSpace = SRGBColorSpace;
    cache.set(key, texture);
  }
  return cache.get(key);
}
