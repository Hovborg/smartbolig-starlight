import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

import { fonts } from "../config/fonts.mjs";

const require = createRequire(import.meta.url);
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("both font families are self-hosted files that exist in the pinned packages", () => {
  assert.deepEqual(fonts.map((font) => font.cssVariable), ["--font-body", "--font-display"]);
  for (const font of fonts) {
    assert.equal(font.provider.name, "local");
    for (const variant of font.options.variants) {
      for (const source of variant.src) {
        assert.match(source, /^@fontsource-variable\/[a-z-]+\/files\/[a-z-]+\.woff2$/);
        assert.equal(existsSync(require.resolve(source)), true, source);
      }
    }
  }
});

test("the first variant of each family is the Latin file, which is the one the head preloads", () => {
  for (const font of fonts) {
    const [latin, extended] = font.options.variants;
    assert.match(latin.src[0], /-latin-wght-normal\.woff2$/);
    assert.equal(latin.unicodeRange[0], "U+0000-00FF");
    assert.match(extended.src[0], /-latin-ext-wght-normal\.woff2$/);
    assert.equal(extended.unicodeRange.includes("U+0000-00FF"), false);
  }
  const head = read("src/components/Head.astro");
  assert.match(head, /fontData\[cssVariable[^\]]*\]\?\.\[0\]\?\.src\[0\]\?\.url/);
  assert.match(head, /<link rel="preload" as="font" type="font\/woff2" href=\{href\} crossorigin \/>/);
  assert.equal(/<Font[^>]*\spreload/.test(head), false);
});

test("no font is loaded from another host", () => {
  const seoFiles = readdirSync(new URL("../src/lib/seo/", import.meta.url)).map((name) => `src/lib/seo/${name}`);
  // public/_headers holds the CSP: no font host may be allowed there either.
  for (const path of ["config/head/index.mjs", "config/site.mjs", "src/components/Head.astro", ...seoFiles, "src/styles/index.css", "public/_headers"]) {
    assert.equal(/fonts\.googleapis|fonts\.gstatic|use\.typekit|fonts\.bunny/.test(read(path)), false, path);
  }
});
