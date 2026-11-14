// Renders the still pictures of the 3D house: on the homepage the picture
// shown before the model has loaded (and all there is without WebGL), the
// topic cards and the featured guide; on every guide the picture at the top
// (src/lib/guide-art.mjs decides which page gets which).
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

const OUT = fileURLToPath(new URL("../public/images/", import.meta.url));
const TOPIC = { width: 960, height: 720, widths: [480, 960] };
const GUIDE = { folder: "guide", width: 1600, height: 640, widths: [800, 1600] };

/** Each picture: a time of day and a named view or a camera of its own.
 *  `folder` is the folder under public/images/ ("home" when left out).
 *  `scene` draws a scene from src/lib/house3d/stills.mjs instead of the house. */
export const PICTURES = [
  // Same start as the live model in src/lib/home-house-stage.mjs.
  { name: "house-evening", mode: "evening", view: "overview", width: 1440, height: 1080, widths: [640, 960, 1440] },
  { name: "house-morning", mode: "morning", camera: { az: 34, el: 28, dist: 27, target: [0.7, 1.0, 0.3] }, width: 1280, height: 720, widths: [640, 1280] },
  { name: "topic-home-assistant", mode: "evening", camera: { az: 58, el: 24, dist: 10, target: [-4.2, 1.0, 0.1] }, ...TOPIC },
  { name: "topic-automations", mode: "evening", focus: "light", camera: { az: 14, el: 34, dist: 14, target: [-2.5, 0.9, 0.2] }, ...TOPIC },
  { name: "topic-esp32", mode: "day", scene: "bench", camera: { az: -24, el: 38, dist: 29, target: [-0.2, 0.3, 2.2] }, ...TOPIC },
  { name: "topic-products", mode: "day", camera: { az: 24, el: 22, dist: 10, target: [0.2, 0.7, 2.6] }, ...TOPIC },
  { name: "topic-ai", mode: "night", camera: { az: 0, el: 72, dist: 24, target: [0.9, 0.5, -0.6] }, ...TOPIC },
  { name: "guide-overview", mode: "day", camera: { az: 34, el: 28, dist: 25, target: [0.7, 1.0, 0.3] }, ...GUIDE },
  { name: "guide-home-assistant", mode: "evening", camera: { az: 58, el: 24, dist: 11, target: [-4.0, 1.0, 0.1] }, ...GUIDE },
  { name: "guide-automation", mode: "evening", focus: "light", camera: { az: 14, el: 34, dist: 17, target: [-2.5, 0.9, 0.2] }, ...GUIDE },
  { name: "guide-light", mode: "evening", focus: "light", camera: { az: -32, el: 26, dist: 12, target: [-3.2, 0.9, 0.4] }, ...GUIDE },
  { name: "guide-heat", mode: "morning", focus: "heat", camera: { az: -28, el: 32, dist: 17, target: [-3.4, 0.8, 0.4] }, ...GUIDE },
  { name: "guide-energy", mode: "day", focus: "energy", camera: { az: 40, el: 28, dist: 12.5, target: [4.4, 1.0, 1.8] }, ...GUIDE },
  { name: "guide-security", mode: "night", focus: "security", camera: { az: 22, el: 24, dist: 15, target: [1.3, 1.1, 1.2] }, ...GUIDE },
  { name: "guide-diy", mode: "day", scene: "bench", camera: { az: -24, el: 34, dist: 27, target: [1.6, 1.2, -1.2] }, ...GUIDE },
  { name: "guide-network", mode: "night", camera: { az: 0, el: 70, dist: 24, target: [0.9, 0.5, -0.6] }, ...GUIDE },
  { name: "guide-products", mode: "day", camera: { az: 24, el: 22, dist: 11, target: [0.2, 0.7, 2.6] }, ...GUIDE },
  { name: "guide-garden", mode: "day", camera: { az: 28, el: 26, dist: 12, target: [-2.0, 0.4, 3.6] }, ...GUIDE },
  { name: "guide-ai", mode: "night", camera: { az: -24, el: 28, dist: 25, target: [0.7, 1.0, 0.3] }, ...GUIDE },
];

/** Where a picture's files live, relative to public/. */
export const pictureFolder = (picture) => `images/${picture.folder ?? "home"}`;

if (process.argv[1]?.endsWith("house-posters.mjs")) {
  const only = process.argv[2];
  const pictures = PICTURES.filter((picture) => !only || picture.name.startsWith(only));
  const work = await mkdtemp(join(tmpdir(), "house-posters-"));
  try {
    await renderHouse(work, pictures.map((picture) => ({ focus: "", az: 0, scale: 2, ...picture })));
    for (const picture of pictures) {
      const master = join(work, `${picture.name}.png`);
      const folder = join(OUT, picture.folder ?? "home");
      await mkdir(folder, { recursive: true });
      for (const width of picture.widths) {
        const base = join(folder, `${picture.name}-${width}`);
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
