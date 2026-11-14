// Entry for the still-picture renderer (scripts/house-render.mjs): the house
// and the scenes that only exist as pictures. The homepage loads index.mjs,
// so nothing here adds to what a visitor downloads.
import { mountHouse } from "./index.mjs";
import { buildWorkbench } from "./parts/workbench.mjs";

/** name -> (rig, colors) => void, run once the house has been built. */
const scenes = {
  // The desk with the ESP32 board. The house is taken out of the picture;
  // the engine keeps its own references to the parts it animates.
  bench(rig, colors) {
    rig.root.clear();
    buildWorkbench(rig.root, colors);
  },
};

export const sceneNames = Object.keys(scenes);

export function mountStill(canvas, options = {}) {
  return mountHouse(canvas, { ...options, extend: scenes[options.scene] });
}
