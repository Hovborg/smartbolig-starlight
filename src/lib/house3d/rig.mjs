// Puts the house together. The rig is the model plus the handles the engine
// needs: channels to switch things on, walls to lower, anchors for hotspots.
import { Group } from "three";
import { buildDevices } from "./parts/devices.mjs";
import { buildInterior } from "./parts/interior.mjs";
import { buildLinks } from "./parts/links.mjs";
import { buildOutdoor } from "./parts/outdoor.mjs";
import { buildGround, buildShell } from "./parts/shell.mjs";

export function createRig(colors) {
  const rig = {
    root: new Group(),
    /** name -> (level 0..1) => void */
    channels: {},
    /** Outer walls, lowered when they face the camera. */
    walls: [],
    blinds: [],
    glows: {},
    /** name -> Vector3 in model space, for hotspots. */
    anchors: {},
    links: {},
    movers: {},
    pulses: {},
    spin: [],
  };
  buildGround(rig, colors);
  buildShell(rig, colors);
  buildInterior(rig);
  buildDevices(rig, colors);
  buildOutdoor(rig, colors);
  buildLinks(rig, colors);
  for (const room of ["living", "bedroom"]) {
    const rolls = rig.blinds.filter((blind) => blind.room === room).map((blind) => blind.roll);
    rig.channels[`blinds.${room}`] = (level) => rolls.forEach((roll) => { roll.scale.y = 0.06 + 0.94 * level; });
  }
  return rig;
}
