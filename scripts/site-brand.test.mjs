import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import test from "node:test";

import { MARK } from "./lib/brand/mark.mjs";
import { light } from "./lib/brand/palette.mjs";

const bytes = (path) => readFileSync(new URL(`../${path}`, import.meta.url));
const text = (path) => bytes(path).toString("utf8");

function pngSize(path) {
  const buf = bytes(path);
  assert.equal(buf.subarray(1, 4).toString("ascii"), "PNG", `${path} is a PNG`);
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

test("the generated PNG files have the documented pixel sizes", () => {
  const sizes = {
    "public/apple-touch-icon.png": [180, 180],
    "public/brand/icon/icon-192.png": [192, 192],
    "public/brand/icon/icon-512.png": [512, 512],
    "public/brand/icon/icon-maskable-512.png": [512, 512],
    // The Organization JSON-LD pins this size (src/lib/seo/site.ts, scripts/seo-validate.mjs).
    "public/brand/logo/logo-dark-1200x270.png": [1200, 270],
    "public/brand/logo/logo-light-1200x270.png": [1200, 270],
    "public/images/og-image.png": [1200, 630],
  };
  for (const [path, size] of Object.entries(sizes)) assert.deepEqual(pngSize(path), size, path);
});

test("favicon.ico holds one 32x32 PNG", () => {
  const ico = bytes("public/favicon.ico");
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 1);
  assert.equal(ico[6], 32);
  assert.equal(ico[7], 32);
  const offset = ico.readUInt32LE(18);
  const length = ico.readUInt32LE(14);
  assert.equal(offset, 22);
  assert.equal(ico.length, offset + length);
  const png = ico.subarray(offset);
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [32, 32]);
});

test("the default social image stays small enough for a link preview", () => {
  assert.ok(statSync(new URL("../public/images/og-image.png", import.meta.url)).size < 150 * 1024);
});

test("favicon.svg uses only the two brand colours and no filters", () => {
  const svg = text("public/favicon.svg");
  const colours = new Set((svg.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).map((c) => c.toLowerCase()));
  assert.deepEqual([...colours].sort(), [light.accent, light.onAccent].sort());
  assert.equal(/<filter|<linearGradient|<radialGradient|<style|<image/.test(svg), false);
});

test("the generator's mark is the mark in the header (SiteTitle.astro)", () => {
  const title = text("src/components/SiteTitle.astro");
  const paths = [...title.matchAll(/<path class="line" d="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(paths, MARK.paths);
  const dot = title.match(/<circle class="dot" cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/);
  assert.deepEqual(dot.slice(1).map(Number), [MARK.dot.cx, MARK.dot.cy, MARK.dot.r]);
  assert.equal(Number(title.match(/<rect class="tile" width="32" height="32" rx="([\d.]+)"/)[1]), MARK.tileRadius);
  assert.equal(Number(title.match(/stroke-width: ([\d.]+);/)[1]), MARK.strokeWidth);
  assert.match(title, /viewBox="0 0 32 32"/);
  const favicon = text("public/favicon.svg");
  for (const d of MARK.paths) assert.ok(favicon.includes(`d="${d}"`), d);
});

test("pages link the favicon, the ICO fallback, the touch icon and a theme colour", () => {
  const icons = text("config/head/icons.mjs");
  for (const needle of ["/favicon.ico", "/apple-touch-icon.png", "#f8fafb", "#090d11"]) assert.ok(icons.includes(needle), needle);
  assert.match(text("config/site.mjs"), /favicon: "\/favicon\.svg"/);
  const notFound = text("src/components/not-found/NotFoundLayout.astro");
  for (const needle of ["/favicon.ico", "/favicon.svg", "/apple-touch-icon.png", 'name="theme-color"']) assert.ok(notFound.includes(needle), needle);
});

test("the browser theme colour, the brand palette and the manifest follow the bg tokens", async () => {
  const css = text("src/styles/tokens/color.css");
  const token = (block, name) => block.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, "i"))[1].toLowerCase();
  const darkStart = css.indexOf(':root[data-theme="dark"]');
  const lightBlock = css.slice(0, darkStart);
  const darkBlock = css.slice(darkStart);
  const { themeColor } = await import("../config/head/icons.mjs");
  const palette = await import("./lib/brand/palette.mjs");
  assert.equal(themeColor.light, token(lightBlock, "--sb-bg"));
  assert.equal(themeColor.dark, token(darkBlock, "--sb-bg"));
  assert.equal(palette.light.bg, token(lightBlock, "--sb-bg"));
  assert.equal(palette.dark.bg, token(darkBlock, "--sb-bg"));
  assert.equal(palette.light.accent, token(lightBlock, "--sb-accent"));
  assert.equal(palette.dark.accent, token(darkBlock, "--sb-accent"));
  const manifest = JSON.parse(text("public/site.webmanifest"));
  assert.equal(manifest.theme_color, themeColor.dark);
  assert.equal(manifest.background_color, themeColor.dark);
  for (const icon of manifest.icons) assert.equal(existsSync(new URL(`../public${icon.src}`, import.meta.url)), true, icon.src);
  assert.ok(text("config/head/icons.mjs").includes('href: "/site.webmanifest"'));
});
