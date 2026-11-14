// Renders the still pictures of the 3D house that the homepage uses: the
// picture shown before the model has loaded (and all there is without WebGL),
// the topic cards and the featured guide.
//
//   npm run house:posters
//
// Run it again whenever the house (src/lib/house3d/) changes its look, so the
// pictures match the live model.
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { renderHouse } from "./house-render.mjs";

const OUT = fileURLToPath(new URL("../public/images/home/", import.meta.url));
const TOPIC = { width: 960, height: 720, widths: [480, 960] };

/** Each picture: a time of day and a named view or a camera of its own. */
export const PICTURES = [
  // Same start as the live model in src/lib/home-house-stage.mjs.
  { name: "house-evening", mode: "evening", view: "overview", width: 1440, height: 1080, widths: [640, 960, 1440] },
  { name: "house-morning", mode: "morning", camera: { az: 34, el: 28, dist: 27, target: [0.7, 1.0, 0.3] }, width: 1280, height: 720, widths: [640, 1280] },
  { name: "topic-home-assistant", mode: "evening", camera: { az: 58, el: 24, dist: 10, target: [-4.2, 1.0, 0.1] }, ...TOPIC },
  { name: "topic-automations", mode: "evening", focus: "light", camera: { az: 14, el: 34, dist: 14, target: [-2.5, 0.9, 0.2] }, ...TOPIC },
  { name: "topic-esp32", mode: "day", focus: "diy", camera: { az: -8, el: 30, dist: 12, target: [-2.4, 0.9, -0.6] }, ...TOPIC },
  { name: "topic-products", mode: "day", camera: { az: 24, el: 22, dist: 10, target: [0.2, 0.7, 2.6] }, ...TOPIC },
  { name: "topic-ai", mode: "night", camera: { az: 0, el: 72, dist: 24, target: [0.9, 0.5, -0.6] }, ...TOPIC },
];

if (process.argv[1]?.endsWith("house-posters.mjs")) {
  const only = process.argv[2];
  const pictures = PICTURES.filter((picture) => !only || picture.name.startsWith(only));
  const work = await mkdtemp(join(tmpdir(), "house-posters-"));
  try {
    await renderHouse(work, pictures.map((picture) => ({ focus: "", az: 0, scale: 2, ...picture })));
    await mkdir(OUT, { recursive: true });
    for (const picture of pictures) {
      const master = join(work, `${picture.name}.png`);
      for (const width of picture.widths) {
        const base = join(OUT, `${picture.name}-${width}`);
        const scaled = sharp(master).resize({ width });
        await scaled.clone().avif({ quality: 58, effort: 7 }).toFile(`${base}.avif`);
        await scaled.clone().webp({ quality: 82, effort: 6 }).toFile(`${base}.webp`);
        console.log("wrote", `${picture.name}-${width}`);
      }
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}
