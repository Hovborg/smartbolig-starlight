import assert from "node:assert/strict";
import { mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { renderThumbs, thumbsToRender } from "./ai-news-thumbs.mjs";

const names = ["2026-11-12.jpg", "2026-11-12-thumb.webp", "2026-11-13.png", "2026-11-11.jpg", "notes.txt"];

test("only missing thumbnails are rendered by default", () => {
  const have = new Set(["2026-11-12.jpg"]);
  assert.deepEqual(thumbsToRender({ names, exists: (name) => have.has(name) }), ["2026-11-11.jpg", "2026-11-13.png"]);
});

test("--force renders all and --date renders exactly one", () => {
  const everything = () => true;
  assert.deepEqual(thumbsToRender({ names, exists: everything, force: true }), ["2026-11-11.jpg", "2026-11-12.jpg", "2026-11-13.png"]);
  assert.deepEqual(thumbsToRender({ names, exists: everything, date: "2026-11-12" }), ["2026-11-12.jpg"]);
});

test("file times do not matter: a thumbnail older than its source is kept", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "smartbolig-thumbs-"));
  try {
    await writeFile(path.join(dir, "2026-11-12.jpg"), "x");
    await writeFile(path.join(dir, "2026-11-12-thumb.webp"), "old");
    await utimes(path.join(dir, "2026-11-12-thumb.webp"), new Date(2020, 0, 1), new Date(2020, 0, 1));
    await writeFile(path.join(dir, "2026-11-13.jpg"), "x");
    const rendered = [];
    const render = async (source, target) => rendered.push(path.basename(target));
    assert.deepEqual(await renderThumbs({ imageDir: dir, render }), { generated: 1, total: 2 });
    assert.deepEqual(rendered, ["2026-11-13-thumb.webp"]);
    rendered.length = 0;
    await renderThumbs({ imageDir: dir, render, date: "2026-11-12" });
    assert.deepEqual(rendered, ["2026-11-12-thumb.webp"]);
    await assert.rejects(renderThumbs({ imageDir: dir, render, date: "2026-01-01" }), /No hero image/);
    await assert.rejects(renderThumbs({ imageDir: dir, render, date: "today" }), /YYYY-MM-DD/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
