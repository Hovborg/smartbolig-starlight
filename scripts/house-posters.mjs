// Renders the still picture of the 3D house for the homepage: what the page
// shows before the model has loaded, and all it shows without WebGL.
//
//   npm run house:posters
//
// Run it again whenever the house (src/lib/house3d/) changes its look, so the
// picture and the live model match when one fades into the other.
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { renderHouse } from "./house-render.mjs";

const OUT = fileURLToPath(new URL("../public/images/home/", import.meta.url));

// Same start as the live model in src/lib/home-house-stage.mjs.
export const POSTER = { name: "house-evening", mode: "evening", view: "overview", width: 1440, height: 1080 };
export const POSTER_WIDTHS = [640, 960, 1440];

const work = await mkdtemp(join(tmpdir(), "house-posters-"));
try {
  await renderHouse(work, [{ ...POSTER, focus: "", az: 0, scale: 2 }]);
  await mkdir(OUT, { recursive: true });
  const master = join(work, `${POSTER.name}.png`);
  for (const width of POSTER_WIDTHS) {
    const base = join(OUT, `${POSTER.name}-${width}`);
    const picture = sharp(master).resize({ width });
    await picture.clone().avif({ quality: 58, effort: 7 }).toFile(`${base}.avif`);
    await picture.clone().webp({ quality: 82, effort: 6 }).toFile(`${base}.webp`);
    console.log("wrote", `${POSTER.name}-${width}`);
  }
} finally {
  await rm(work, { recursive: true, force: true });
}
