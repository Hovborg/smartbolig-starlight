// The ground, the floor plan and the walls of the house.
// Layout (metres, y up): the house covers x -6..2 and z -4..2.
//   living room  x -6..-1    z -1..2      kitchen  x -1..2     z -1..2
//   bedroom      x -6..-2.5  z -4..-1     bath     x -2.5..-0.3  hall  x -0.3..2
import { BufferAttribute, CanvasTexture, CircleGeometry, Color, Mesh, PlaneGeometry, Vector3 } from "three";
import { box, glow, group, matte, overlay, setGlow, soft, surface } from "../kit.mjs";
import { surfaceMaps } from "../textures.mjs";

export const FLOOR = 0.12;
export const WALL_HEIGHT = 2.6;
const THICK = 0.24;
const CUT = 0x1f2327;
const FRAME = 0x17191c;

const PLOT = { x: 0.1, z: 0.6, r: 11.8 };

/** White in the middle, black at the rim: the ground fades into the page. */
function fadeMap() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "#fff");
  gradient.addColorStop(0.74, "#fff");
  gradient.addColorStop(0.98, "#000");
  gradient.addColorStop(1, "#000");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  return new CanvasTexture(canvas);
}

/**
 * A flat piece of ground (driveway, pavement, street). Its second UV set is
 * its place on the plot, so it fades out together with the lawn.
 */
function patch(parent, fade, w, d, material, x, y, z) {
  const geometry = new PlaneGeometry(w, d);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  const place = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i += 1) {
    place[i * 2] = (position.getX(i) + x - PLOT.x) / (PLOT.r * 2) + 0.5;
    place[i * 2 + 1] = 0.5 - (position.getZ(i) + z - PLOT.z) / (PLOT.r * 2);
  }
  geometry.setAttribute("uv1", new BufferAttribute(place, 2));
  const faded = material.clone();
  faded.alphaMap = fade;
  faded.transparent = true;
  const mesh = new Mesh(geometry, faded);
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  mesh.renderOrder = 1;
  parent.add(mesh);
  return mesh;
}

/** Lawn, driveway, garden path, terrace and the street in front. */
export function buildGround(rig) {
  const g = group(rig.root);
  const lawn = surface("grass", 9, 9, { rough: 0.95, relief: 1.4 }).clone();
  lawn.alphaMap = fadeMap();
  lawn.transparent = true;
  const ground = new Mesh(new CircleGeometry(PLOT.r, 72), lawn);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(PLOT.x, 0, PLOT.z);
  ground.receiveShadow = true;
  g.add(ground);

  const fade = lawn.alphaMap.clone();
  fade.channel = 1;
  patch(g, fade, 4.0, 6.3, surface("paving", 2.7, 4.2, { rough: 0.85, relief: 0.9 }), 5.2, 0.03, 3.45);
  patch(g, fade, 24, 1.2, surface("concrete", 16, 0.8, { rough: 0.9, relief: 0.6 }), PLOT.x, 0.035, 7.2);
  patch(g, fade, 24, 4.4, surface("asphalt", 8, 1.5, { rough: 0.92, relief: 1 }), PLOT.x, 0.02, 10.0);
  for (let i = 0; i < 5; i += 1) {
    soft(g, 0.95, 0.05, 0.6, surface("concrete", 0.6, 0.4, { rough: 0.9, relief: 0.6 }), 1.45, 0.03, 2.72 + i * 0.84, 0.012);
  }
  // Terrace in front of the living room.
  box(g, 4.6, 0.1, 2.3, surface("oak", 1.45, 1.45, { rough: 0.8, relief: 1, tint: 0x9d8f80 }), -3.6, 0.07, 3.3);
}

function wall(rig, name, length, cx, cz, alongX, normal) {
  const outsidePositive = alongX ? normal[2] > 0 : normal[0] > 0;
  const inside = surface("plaster", length / 2.4, 1.1, { rough: 0.92, relief: 0.12 });
  const outside = surface("cladding", length / 1.6, 1, { rough: 0.7, relief: 1.2 });
  const cut = matte(CUT, { rough: 0.9 });
  const faces = alongX
    ? [cut, cut, cut, cut, outsidePositive ? outside : inside, outsidePositive ? inside : outside]
    : [outsidePositive ? outside : inside, outsidePositive ? inside : outside, cut, cut, cut, cut];
  const g = group(rig.root, cx, FLOOR, cz);
  const size = alongX ? [length, WALL_HEIGHT, THICK] : [THICK, WALL_HEIGHT, length];
  box(g, size[0], size[1], size[2], faces, 0, WALL_HEIGHT / 2, 0);
  // Windows and blinds sit beside the wall, so they are hidden, not squashed,
  // when the wall is lowered.
  const extras = group(rig.root, cx, FLOOR, cz);
  const entry = { name, group: g, extras, alongX, normal: new Vector3(...normal), level: 1 };
  rig.walls.push(entry);
  return entry;
}

function windowIn(rig, entry, offset, y, w, h, blind) {
  const depth = THICK + 0.05;
  const at = (dw, dh, dd, material, dy = 0, along = 0) => (entry.alongX
    ? box(entry.extras, dw, dh, dd, material, offset + along, y + dy, 0)
    : box(entry.extras, dd, dh, dw, material, 0, y + dy, offset + along));
  const frame = matte(FRAME, { rough: 0.4, metal: 0.6 });
  // Frame: four slim bars around the pane, like aluminium windows.
  at(w + 0.12, 0.06, depth, frame, h / 2 + 0.03);
  at(w + 0.12, 0.06, depth, frame, -h / 2 - 0.03);
  at(0.06, h, depth, frame, 0, -w / 2 - 0.03);
  at(0.06, h, depth, frame, 0, w / 2 + 0.03);
  if (w > 1.6) at(0.05, h, depth, frame);
  // The pane shows the sky outside: bright by day, dark at night.
  at(w, h, THICK + 0.02, rig.glows.panes).castShadow = false;
  if (!blind) return;
  // A blind hangs from the top of the window and rolls down.
  const roll = group(entry.extras, entry.alongX ? offset : 0, y + h / 2, entry.alongX ? 0 : offset);
  const size = entry.alongX ? [w, h, 0.03] : [0.03, h, w];
  const inward = entry.alongX ? [0, 0, -entry.normal.z * (THICK / 2 + 0.03)] : [-entry.normal.x * (THICK / 2 + 0.03), 0, 0];
  const cloth = box(roll, size[0], size[1], size[2], surface("linen", w, h, { rough: 1, relief: 0.4 }), inward[0], -h / 2, inward[2]);
  cloth.castShadow = false;
  roll.scale.y = 0.06;
  rig.blinds.push({ room: blind, roll });
}

function stub(rig, w, d, x, z) {
  const side = surface("plaster", 1, 0.25, { rough: 0.92, relief: 0.12 });
  const cut = matte(CUT, { rough: 0.9 });
  box(rig.root, w, 0.5, d, [side, side, cut, side, side, side], x, FLOOR + 0.25, z);
}

/** Floors, outer walls with windows, low inner walls and the front door. */
export function buildShell(rig, colors) {
  const g = rig.root;
  box(g, 8.6, FLOOR, 6.6, surface("concrete", 4, 3, { rough: 0.9 }), -2, FLOOR / 2, -1);
  const floor = (w, d, material, x, z) => box(g, w, 0.02, d, material, x, FLOOR + 0.01, z);
  const oak = (w, d) => surface("oak", w / 3.2, d / 1.6, { rough: 0.55, relief: 0.5 });
  floor(4.9, 2.9, oak(4.9, 2.9), -3.5, 0.5);
  floor(2.9, 2.9, surface("tile", 2.9 / 2.4, 2.9 / 2.4, { rough: 0.35, relief: 0.4 }), 0.5, 0.5);
  floor(3.4, 2.9, oak(3.4, 2.9), -4.25, -2.5);
  // The bathroom floor can glow: floor heating.
  const tiles = surfaceMaps("bathTile");
  rig.glows.floorHeat = glow(colors.heat, { base: 0xffffff, strength: 0.4 });
  for (const key of ["map", "bump"]) {
    const texture = tiles[key].clone();
    texture.repeat.set(1.75, 2.4);
    texture.needsUpdate = true;
    rig.glows.floorHeat[key === "map" ? "map" : "bumpMap"] = texture;
  }
  rig.glows.floorHeat.roughness = 0.35;
  // Warm tiles, not red ones: the glow is a hint, not a heat map.
  rig.glows.floorHeat.userData.on = new Color(0xffcdbb);
  floor(2.1, 2.9, rig.glows.floorHeat, -1.4, -2.5);
  floor(2.2, 2.9, surface("tile", 2.2 / 2.4, 2.9 / 2.4, { rough: 0.35, relief: 0.4 }), 0.85, -2.5);

  rig.glows.panes = glow("#8fbdf0", { base: 0x0d1318, strength: 0.8 });
  rig.glows.panes.roughness = 0.06;
  rig.glows.panes.metalness = 0.5;
  rig.glows.panes.userData.on = rig.glows.panes.userData.off;
  rig.channels.daylight = (level) => setGlow(rig.glows.panes, level);
  const back = wall(rig, "back", 8.24, -2, -4, true, [0, 0, -1]);
  const front = wall(rig, "front", 8.24, -2, 2, true, [0, 0, 1]);
  const left = wall(rig, "left", 5.76, -6, -1, false, [-1, 0, 0]);
  const right = wall(rig, "right", 5.76, 2, -1, false, [1, 0, 0]);
  windowIn(rig, back, -2.25, 1.6, 1.4, 0.9, "bedroom");
  windowIn(rig, back, 0.6, 1.85, 0.7, 0.5);
  windowIn(rig, left, 2.45, 1.4, 1.0, 1.4, "living");
  windowIn(rig, left, -1.6, 1.45, 0.9, 1.1, "bedroom");
  windowIn(rig, front, -1.75, 1.25, 3.0, 1.9, "living");
  windowIn(rig, front, 2.0, 1.5, 0.9, 1.0);
  windowIn(rig, right, 1.6, 1.5, 1.3, 1.0);

  // Low inner walls with door openings.
  stub(rig, 1.1, 0.12, -5.45, -1);
  stub(rig, 2.1, 0.12, -2.95, -1);
  stub(rig, 1.4, 0.12, -0.4, -1);
  stub(rig, 0.8, 0.12, 1.6, -1);
  stub(rig, 0.12, 3, -2.5, -2.5);
  stub(rig, 0.12, 3, -0.3, -2.5);
  stub(rig, 0.12, 0.9, -1, 1.55);

  // The front door keeps its full height when the wall in front is lowered.
  const door = group(g, 1.45, FLOOR, 2);
  const frame = matte(FRAME, { rough: 0.4, metal: 0.6 });
  box(door, 0.07, 2.2, THICK + 0.08, frame, -0.49, 1.1, 0);
  box(door, 0.07, 2.2, THICK + 0.08, frame, 0.49, 1.1, 0);
  box(door, 1.05, 0.07, THICK + 0.08, frame, 0, 2.2, 0);
  soft(door, 0.9, 2.14, 0.07, surface("walnutVeneer", 1.4, 0.6, { rough: 0.5, relief: 0.4, turn: true }), 0, 1.08, 0.04, 0.012);
  overlay(box(door, 0.16, 1.5, 0.012, matte(0x9db7c9, { rough: 0.04, metal: 0.2, opacity: 0.35 }), -0.24, 1.15, 0.08));
  // Smart lock: a keypad that lights up when the door is locked.
  soft(door, 0.07, 0.34, 0.035, matte(FRAME, { rough: 0.3, metal: 0.7 }), 0.31, 1.08, 0.085, 0.012);
  rig.glows.lock = glow(colors.security, { base: 0x202428, strength: 3.4 });
  box(door, 0.04, 0.1, 0.012, rig.glows.lock, 0.31, 1.17, 0.106).castShadow = false;
  const handle = box(door, 0.03, 0.03, 0.12, matte(0xc9ccd0, { metal: 0.9, rough: 0.25 }), 0.31, 0.98, 0.16);
  handle.castShadow = false;
  rig.anchors.security = new Vector3(1.78, 1.25, 2.2);
}
