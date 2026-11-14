import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { COLUMN_SIZES, rehypeBodyImages } from "../config/markdown/body-images.mjs";
import { rehypeLeadImage } from "../config/markdown/lead-image.mjs";
import { isLocalPicture } from "../config/markdown/local-picture.mjs";
import { checkGuidePicture } from "./lib/seo-guide-pictures.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

// Folders under public/images/ that a page may still point at by address.
const PUBLIC_PICTURES = /^\/images\/(home\/|guide\/|produkter\/|ai-news|og-image\.png$)/;
const BODY_PICTURE = /!\[[^\]]*\]\((\/images\/[^)\s]+)\)|<img\b[^>]*\ssrc=["'](\/images\/[^"']+)["']/g;

async function contentFiles(dir = "src/content") {
  const entries = await readdir(new URL(`${dir}/`, root), { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => (entry.isDirectory() ? contentFiles(`${dir}/${entry.name}`) : /\.mdx?$/.test(entry.name) ? [`${dir}/${entry.name}`] : [])),
  );
  return nested.flat();
}

const image = (src) => ({ type: "element", tagName: "img", properties: { src, alt: "" }, children: [] });
const page = (...images) => ({ type: "root", children: images.map((picture) => ({ type: "element", tagName: "p", properties: {}, children: [picture] })) });
// Astro passes the MDX with its frontmatter blanked to spaces.
const blankFrontmatter = " ".repeat(1600);
const opening = `${blankFrontmatter}\n\n![Picture](./a.webp)\n\nText.`;
const later = `${blankFrontmatter}\n\n${"Text. ".repeat(400)}\n\n![Picture](./a.webp)`;

test("a guide that opens with a picture loads that picture first and the others lazily", () => {
  const tree = page(image("../a.webp"), image("../b.webp"));
  rehypeLeadImage()(tree, { value: opening });
  const [first, second] = tree.children.map((paragraph) => paragraph.children[0]);
  assert.equal(first.properties.priority, "true");
  assert.equal(second.properties.priority, undefined);
});

test("a guide with a head picture keeps its body pictures lazy so the page has one high-priority picture", () => {
  const tree = page(image("../a.webp"));
  rehypeLeadImage()(tree, { value: later });
  assert.equal(tree.children[0].children[0].properties.priority, undefined);
});

test("pictures that Astro does not optimize are not given the priority mark", () => {
  const tree = page(image("/images/home/topic-light-960.webp"));
  rehypeLeadImage()(tree, { value: opening });
  assert.equal(tree.children[0].children[0].properties.priority, undefined);
});

test("a picture is Astro's when it is written relative to the guide, with or without a leading dot", () => {
  for (const src of ["../../assets/a.webp", "./a.webp", "a.webp", "pictures/a.webp"]) assert.equal(isLocalPicture(src), true, src);
  for (const src of ["/images/home/a.webp", "https://example.com/a.webp", "//example.com/a.webp", "data:image/png;base64,AA", "#a", "", undefined]) {
    assert.equal(isLocalPicture(src), false, String(src));
  }
  const tree = page(image("a.webp"));
  rehypeLeadImage()(tree, { value: opening });
  rehypeBodyImages()(tree);
  assert.deepEqual(tree.children[0].children[0].properties, { src: "a.webp", alt: "", priority: "true", sizes: COLUMN_SIZES });
});

test("the browser is told how wide a guide's pictures are shown, and drawings stay one file", () => {
  const tree = page(image("../../../../assets/guides/a/photo.webp"), image("../../../../assets/guides/a/wiring.svg"), image("/images/home/topic-light-960.webp"));
  rehypeBodyImages()(tree);
  const [photo, drawing, fixed] = tree.children.map((paragraph) => paragraph.children[0].properties);
  assert.equal(photo.sizes, COLUMN_SIZES);
  assert.equal(photo.layout, undefined);
  assert.equal(drawing.layout, "none", "an SVG in several widths would be the same file several times");
  assert.equal(drawing.sizes, undefined);
  assert.deepEqual(fixed, { src: "/images/home/topic-light-960.webp", alt: "" }, "pictures in public/ are served as written");
});

// What `sizes` tells the browser at a window width, in CSS pixels (1rem = 16px).
function toldWidth(sizes, windowWidth) {
  const length = (value) => {
    const whole = value.match(/^calc\(100vw - ([\d.]+)rem\)$/);
    if (whole) return windowWidth - Number(whole[1]) * 16;
    const fixed = value.match(/^([\d.]+)rem$/);
    assert.ok(fixed, `unknown length in sizes: ${value}`);
    return Number(fixed[1]) * 16;
  };
  for (const entry of sizes.split(", ")) {
    const conditional = entry.match(/^\(min-width: ([\d.]+)rem\) (.+)$/);
    if (!conditional) return length(entry);
    if (windowWidth >= Number(conditional[1]) * 16) return length(conditional[2]);
  }
  throw new Error("sizes has no last entry without a condition");
}

test("the width the browser is told is the text column's at every window width", async () => {
  // [window, column] measured on the built Zigbee2MQTT guide in headless Chrome, 2026-11-14.
  const measured = [
    [320, 288], [390, 358], [600, 568], [767, 720], [800, 448], [820, 468], [1000, 648], [1071, 719],
    [1072, 720], [1151, 720], [1152, 512], [1280, 640], [1359, 688], [1360, 688], [1440, 720], [1920, 720],
  ];
  for (const [windowWidth, column] of measured) {
    const told = toldWidth(COLUMN_SIZES, windowWidth);
    assert.ok(told >= column, `${windowWidth}px: told ${told}, shown ${column}; the picture would be blurry`);
    assert.ok(told - column <= 32, `${windowWidth}px: told ${told}, shown ${column}; a wider file than needed is fetched`);
  }
  const measure = (await read("src/styles/tokens/scale.css")).match(/--sb-measure:\s*([\d.]+)rem;/)?.[1];
  assert.equal(toldWidth(COLUMN_SIZES, 1920), Number(measure) * 16, "COLUMN_SIZES must follow --sb-measure");
});

test("pictures are made in several widths, and a drawing fills the column like a photo", async () => {
  const { image: imageConfig } = await import("../config/images.mjs");
  assert.equal(imageConfig.layout, "constrained", "without it Astro makes one width only");
  const config = await read("astro.config.mjs");
  assert.ok(config.includes('import { image } from "./config/images.mjs";') && /^\s*image,$/m.test(config));
  assert.ok(config.includes("rehypeLeadImage, rehypeBodyImages]"));
  // Astro writes the drawing's own width on the tag; without this rule a 600 px drawing stays 600 px in a 720 px column.
  assert.match(await read("src/styles/content/prose.css"), /img\[src\$="\.svg"\][^{]*\{[^}]*width:\s*100%;[^}]*height:\s*auto;/);
});

test("guide pictures are not pointed at by address from public/images", async () => {
  const offenders = [];
  for (const file of await contentFiles()) {
    const source = await readFile(new URL(file, root), "utf8");
    if (source.includes("/images/guides/")) offenders.push(`${file}: /images/guides/`);
    for (const match of source.matchAll(BODY_PICTURE)) {
      const src = match[1] ?? match[2];
      if (!PUBLIC_PICTURES.test(src)) offenders.push(`${file}: ${src}`);
    }
  }
  assert.deepEqual(offenders, [], "put guide pictures in src/assets/guides/ and reference them relative to the MDX file (see CONTENT-GUIDE.md)");
  const old = new URL("public/images/guides/", root);
  const leftovers = existsSync(old) ? (await readdir(old, { recursive: true, withFileTypes: true })).filter((entry) => entry.isFile()).map((entry) => entry.name) : [];
  assert.deepEqual(leftovers, [], "public/images/guides/ is emptied; guide pictures live in src/assets/guides/");
});

test("the check of a built guide's opening picture finds each fault", () => {
  const srcset = "/_astro/a_1.webp 640w, /_astro/a_2.webp 750w, /_astro/a_3.webp 1080w";
  const tag = (extra = 'fetchpriority="high"', widths = srcset) => `<img src="/_astro/a_3.webp" srcset="${widths}" alt="" sizes="${COLUMN_SIZES}" ${extra} width="1080" height="720">`;
  const lazy = tag('loading="lazy"');
  assert.deepEqual(checkGuidePicture(`<p>${tag()}</p><p>${lazy}</p>`), []);
  assert.match(checkGuidePicture('<img src="/a.png" alt="">')[0], /no picture says/);
  assert.match(checkGuidePicture(`<img src="/a.webp" sizes="(min-width: 50rem) 45rem, 100vw" srcset="${srcset}">`)[0], /no picture says/);
  assert.match(checkGuidePicture(tag('fetchpriority="high"', "/_astro/a_1.webp 640w"))[0], /1 WebP widths/);
  assert.match(checkGuidePicture(lazy)[0], /not fetched with high priority/);
  assert.match(checkGuidePicture(tag().replace(' width="1080" height="720"', ""))[0], /no width and height/);
  assert.match(checkGuidePicture(tag() + tag())[0], /2 pictures in the text/);
});
