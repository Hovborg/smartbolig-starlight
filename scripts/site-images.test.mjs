import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { COLUMN_SIZES, rehypeBodyImages } from "../config/markdown/body-images.mjs";
import { rehypeLeadImage } from "../config/markdown/lead-image.mjs";

const root = new URL("../", import.meta.url);

// Folders under public/images/ that a page may still point at by address.
const PUBLIC_PICTURES = /^\/images\/(home\/|guide\/|produkter\/|ai-news|og-image\.png$)/;
const BODY_PICTURE = /!\[[^\]]*\]\((\/images\/[^)\s]+)\)|<img\b[^>]*\ssrc=["'](\/images\/[^"']+)["']/g;

async function mdxFiles(dir = "src/content/docs") {
  const entries = await readdir(new URL(`${dir}/`, root), { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => (entry.isDirectory() ? mdxFiles(`${dir}/${entry.name}`) : entry.name.endsWith(".mdx") ? [`${dir}/${entry.name}`] : [])),
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

test("the browser is told how wide a guide's pictures are shown, and drawings stay one file", async () => {
  const tree = page(image("../../../../assets/guides/a/photo.webp"), image("../../../../assets/guides/a/wiring.svg"), image("/images/home/topic-light-960.webp"));
  rehypeBodyImages()(tree);
  const [photo, drawing, fixed] = tree.children.map((paragraph) => paragraph.children[0].properties);
  assert.equal(photo.sizes, COLUMN_SIZES);
  assert.equal(photo.layout, undefined);
  assert.equal(drawing.layout, "none", "an SVG in several widths would be the same file several times");
  assert.equal(drawing.sizes, undefined);
  assert.deepEqual(fixed, { src: "/images/home/topic-light-960.webp", alt: "" }, "pictures in public/ are served as written");

  const [config, scale] = await Promise.all([readFile(new URL("astro.config.mjs", root), "utf8"), readFile(new URL("src/styles/tokens/scale.css", root), "utf8")]);
  assert.ok(config.includes('image: { layout: "constrained" }'), "without it Astro makes one width only");
  assert.ok(config.includes("rehypeLeadImage, rehypeBodyImages]"));
  // The width in COLUMN_SIZES is the text column's.
  assert.ok(scale.includes("--sb-measure: 45rem;") && COLUMN_SIZES.includes(" 45rem,"), "COLUMN_SIZES must follow --sb-measure");
});

test("guide pictures are not pointed at by address from public/images", async () => {
  const offenders = [];
  for (const file of await mdxFiles()) {
    const source = await readFile(new URL(file, root), "utf8");
    for (const match of source.matchAll(BODY_PICTURE)) {
      const src = match[1] ?? match[2];
      if (!PUBLIC_PICTURES.test(src)) offenders.push(`${file}: ${src}`);
    }
  }
  assert.deepEqual(offenders, [], "put guide pictures in src/assets/guides/ and reference them relative to the MDX file (see CONTENT-GUIDE.md)");
});
