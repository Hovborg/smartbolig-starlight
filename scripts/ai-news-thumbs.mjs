#!/usr/bin/env node
// Generates small WebP thumbnails for AI News hero images so the homepage
// news list never ships the full 1200x630 PNGs. Idempotent: runs before
// `astro build` and only renders thumbs that are missing or stale.
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const imageDir = path.join(rootDir, "public/images/ai-news");
const BASE_IMAGE = /^\d{4}-\d{2}-\d{2}\.png$/;
const THUMB_WIDTH = 320;
const THUMB_HEIGHT = 180;

const entries = await readdir(imageDir);
let generated = 0;

for (const entry of entries.filter((name) => BASE_IMAGE.test(name)).sort()) {
  const source = path.join(imageDir, entry);
  const target = path.join(imageDir, entry.replace(/\.png$/, "-thumb.webp"));

  try {
    const [sourceStat, targetStat] = await Promise.all([stat(source), stat(target)]);
    if (targetStat.mtimeMs >= sourceStat.mtimeMs) continue;
  } catch {
    // Target missing: fall through and render it.
  }

  await sharp(source)
    .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: "cover", position: "centre" })
    .webp({ quality: 78, effort: 6 })
    .toFile(target);
  generated += 1;
}

console.log(`AI News thumbnails: ${generated} generated, ${entries.filter((name) => BASE_IMAGE.test(name)).length} total base images.`);
