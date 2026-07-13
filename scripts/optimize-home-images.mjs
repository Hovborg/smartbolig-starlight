#!/usr/bin/env node
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const input = path.join(rootDir, "src/assets/homepage/smart-home-editorial-master.png");
const outputBase = path.join(rootDir, "public/images/hero/smart-home-editorial");
const widths = [640, 960, 1440];

await access(input);

for (const width of widths) {
  const height = Math.round((width * 9) / 16);
  const resized = sharp(input).resize(width, height, {
    fit: "cover",
    position: "centre",
    withoutEnlargement: width > 1440,
  });

  await resized
    .clone()
    .avif({ quality: 58, effort: 6 })
    .toFile(`${outputBase}-${width}.avif`);
  await resized
    .clone()
    .webp({ quality: 76, effort: 6 })
    .toFile(`${outputBase}-${width}.webp`);
}

console.log(`Generated ${widths.length * 2} responsive homepage images from ${path.relative(rootDir, input)}.`);
