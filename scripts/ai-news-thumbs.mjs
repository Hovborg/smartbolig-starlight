#!/usr/bin/env node
// Generates small WebP thumbnails for AI News hero images so the homepage
// news list never ships the full 1200x630 heroes. Idempotent: runs before
// `astro build` and renders only thumbnails that are missing. File times say
// nothing after a git checkout, so they are not used.
//
//   node scripts/ai-news-thumbs.mjs                     missing thumbnails only
//   node scripts/ai-news-thumbs.mjs --date 2026-11-13   (re)render that day
//   node scripts/ai-news-thumbs.mjs --force             re-render every thumbnail
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE_IMAGE = /^(\d{4}-\d{2}-\d{2})\.(?:jpg|png)$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const THUMB_WIDTH = 320;
const THUMB_HEIGHT = 180;

export function thumbPath(imageDir, baseName) {
  return path.join(imageDir, baseName.replace(/\.(?:jpg|png)$/, "-thumb.webp"));
}

// Which base images need a thumbnail. Pure: `exists` is injected.
export function thumbsToRender({ names, exists, force = false, date = "" }) {
  const bases = names.filter((name) => BASE_IMAGE.test(name)).sort();
  if (date) return bases.filter((name) => name.startsWith(`${date}.`));
  return bases.filter((name) => force || !exists(name));
}

async function sharpRender(source, target) {
  const { default: sharp } = await import("sharp");
  await sharp(source)
    .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: "cover", position: "centre" })
    .webp({ quality: 78, effort: 6 })
    .toFile(target);
}

export async function renderThumbs({ imageDir, force = false, date = "", render = sharpRender }) {
  if (date && !DATE.test(date)) throw new Error("--date must be YYYY-MM-DD");
  const names = await readdir(imageDir);
  const jobs = thumbsToRender({ names, force, date, exists: (name) => existsSync(thumbPath(imageDir, name)) });
  if (date && jobs.length === 0) throw new Error(`No hero image found for ${date}`);
  for (const name of jobs) await render(path.join(imageDir, name), thumbPath(imageDir, name));
  return { generated: jobs.length, total: names.filter((name) => BASE_IMAGE.test(name)).length };
}

async function main() {
  const args = process.argv.slice(2);
  const dateIndex = args.indexOf("--date");
  const date = dateIndex === -1 ? "" : args[dateIndex + 1] || "";
  if (dateIndex !== -1 && !date) throw new Error("--date needs a value");
  const result = await renderThumbs({ imageDir: path.join(rootDir, "public/images/ai-news"), force: args.includes("--force"), date });
  console.log(`AI News thumbnails: ${result.generated} generated, ${result.total} total base images.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
