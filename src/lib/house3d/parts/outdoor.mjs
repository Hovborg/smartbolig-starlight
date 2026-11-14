// Everything outside the house: garage with solar roof, charger, heat pump,
// garden lights, hedge, trees and the robot mower. The car is in car.mjs.
import { CatmullRomCurve3, ExtrudeGeometry, Mesh, PointLight, Shape, TubeGeometry, Vector3 } from "three";
import { bloom, box, cyl, glow, group, matte, pool, setGlow, soft, surface } from "../kit.mjs";
import { buildCar } from "./car.mjs";
import { hedge, shrub, tree } from "./foliage.mjs";

const DARK = 0x17191c;

function garage(rig, colors) {
  // Body with a single-pitch roof: 2.3 m at the front, 3.0 m at the back.
  const profile = new Shape();
  profile.moveTo(-4, 0);
  profile.lineTo(0.2, 0);
  profile.lineTo(0.2, 2.3);
  profile.lineTo(-4, 3.0);
  profile.closePath();
  const geometry = new ExtrudeGeometry(profile, { depth: 4, bevelEnabled: false });
  geometry.rotateY(-Math.PI / 2);
  const cladding = surface("cladding", 2.6, 1, { rough: 0.7, relief: 1.2 });
  const body = new Mesh(geometry, matte(DARK, { rough: 0.8 }));
  body.position.set(7.2, 0.02, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  rig.root.add(body);
  // Cladding on the two sides you can see.
  box(rig.root, 4.02, 2.3, 0.03, cladding, 5.2, 1.17, 0.215);
  box(rig.root, 0.03, 2.3, 4.2, cladding, 7.215, 1.17, -1.9);

  const roof = group(rig.root, 5.2, 2.74, -1.9);
  roof.rotation.x = Math.atan(0.7 / 4.2);
  box(roof, 4.5, 0.1, 4.8, surface("roofing", 3, 1, { rough: 0.5, metal: 0.4, relief: 0.8 }), 0, 0, 0);
  box(roof, 4.56, 0.16, 0.06, matte(DARK, { rough: 0.4, metal: 0.6 }), 0, -0.03, 2.4);
  const cells = surface("solar", 1, 1, { rough: 0.16, metal: 0.65, relief: 0.2 });
  const frame = matte(0xb9bec4, { rough: 0.35, metal: 0.8 });
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const x = -1.38 + col * 1.38;
      const z = -1.1 + row * 2.2;
      box(roof, 1.3, 0.04, 2.1, frame, x, 0.085, z);
      box(roof, 1.26, 0.012, 2.06, cells, x, 0.11, z).castShadow = false;
    }
  }
  rig.anchors.energy = new Vector3(5.2, 3.3, -1.2);

  // Sectional garage door.
  box(rig.root, 2.7, 2.05, 0.05, matte(0x2a2d31, { rough: 0.55, metal: 0.3 }), 5.65, 1.05, 0.245);
  for (let i = 1; i < 5; i += 1) box(rig.root, 2.7, 0.014, 0.012, matte(0x101214), 5.65, 0.02 + i * 0.41, 0.272).castShadow = false;

  // Charger on the wall, with a cable to the car.
  soft(rig.root, 0.26, 0.4, 0.12, matte(0xe9eaeb, { rough: 0.3 }), 3.72, 1.25, 0.29, 0.04);
  const ring = glow(colors.energy, { base: 0x202428, strength: 3.4 });
  box(rig.root, 0.16, 0.025, 0.012, ring, 3.72, 1.33, 0.352).castShadow = false;
  const cable = new CatmullRomCurve3([
    new Vector3(3.72, 1.04, 0.34), new Vector3(3.78, 0.4, 0.62), new Vector3(4.05, 0.1, 1.2),
    new Vector3(4.34, 0.42, 1.62), new Vector3(4.47, 0.74, 1.68),
  ]);
  const tube = new Mesh(new TubeGeometry(cable, 40, 0.02, 8), matte(0x0e0f11, { rough: 0.5 }));
  tube.castShadow = true;
  rig.root.add(tube);
  return ring;
}

function heatPump(rig) {
  const g = group(rig.root, -0.55, 0.02, 2.62);
  soft(g, 1.05, 0.8, 0.4, matte(0xe4e5e3, { rough: 0.45, metal: 0.2 }), 0, 0.52, 0, 0.03);
  for (const x of [-0.4, 0.4]) box(g, 0.1, 0.12, 0.42, matte(DARK), x, 0.06, 0);
  const face = cyl(g, 0.3, 0.3, 0.012, matte(0x0d0e10, { rough: 0.6 }), -0.15, 0.52, 0.203, 40);
  face.rotation.x = Math.PI / 2;
  const fan = group(g, -0.15, 0.52, 0.212);
  for (let i = 0; i < 5; i += 1) {
    const arm = group(fan);
    arm.rotation.z = (i * Math.PI * 2) / 5;
    const blade = soft(arm, 0.25, 0.1, 0.008, matte(0x3a3d41, { rough: 0.4, metal: 0.5 }), 0.14, 0.02, 0, 0.003);
    blade.rotation.x = 0.3;
  }
  // Grille in front of the fan.
  for (let i = 0; i < 9; i += 1) box(g, 0.62, 0.008, 0.008, matte(0xd6d7d5, { metal: 0.4 }), -0.15, 0.24 + i * 0.07, 0.225).castShadow = false;
  const spinner = { object: fan, speed: 9, level: 0 };
  rig.spin.push(spinner);
  rig.channels.heatpump = (level) => { spinner.level = level; };
}

function garden(rig, colors) {
  // Nothing tall stands between the camera and the rooms in any view of the tour.
  tree(rig.root, -8.0, -0.8, 1.0, 7);
  tree(rig.root, -7.9, -5.5, 1.1, 19);
  tree(rig.root, 8.3, -3.4, 0.95, 31);
  hedge(rig.root, 0.1, -5.3, 13.4, true, 1.35, 11);
  for (const [x, z, r, seed] of [[2.6, 2.55, 0.34, 3], [-6.5, 2.5, 0.42, 5], [-6.9, -2.9, 0.5, 21], [7.9, 0.9, 0.4, 9], [7.7, 5.6, 0.45, 13], [-6.0, 5.6, 0.38, 27]]) shrub(rig.root, x, z, r, seed);

  // Terrace furniture: a low table and two lounge chairs.
  const wood = surface("oakVeneer", 1, 1, { rough: 0.7, tint: 0x9a8875 });
  const cushion = surface("linen", 1, 1, { rough: 1 });
  for (const x of [-4.6, -3.1]) {
    soft(rig.root, 0.8, 0.1, 0.8, wood, x, 0.36, 3.5, 0.02);
    soft(rig.root, 0.74, 0.12, 0.74, cushion, x, 0.46, 3.5, 0.05);
    soft(rig.root, 0.8, 0.5, 0.1, wood, x, 0.56, 3.92, 0.02);
    for (const [dx, dz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) cyl(rig.root, 0.02, 0.02, 0.3, matte(DARK), x + dx, 0.24, 3.5 + dz, 8);
  }
  cyl(rig.root, 0.3, 0.3, 0.03, wood, -3.85, 0.42, 2.75, 28);
  cyl(rig.root, 0.03, 0.12, 0.3, matte(DARK), -3.85, 0.26, 2.75, 12);

  // Garden lights along the path and the driveway.
  const lamp = { parts: [], halos: [], pools: [] };
  const porch = new PointLight(colors.lamp, 0, 7, 1.8);
  porch.position.set(1.45, 2.2, 2.9);
  // A wall lamp by the garage door lights the front of the garage.
  const gate = new PointLight(colors.lamp, 0, 8, 1.6);
  gate.position.set(5.4, 2.0, 1.3);
  rig.root.add(porch, gate);
  soft(rig.root, 0.1, 0.22, 0.08, matte(DARK, { metal: 0.6, rough: 0.4 }), 4.1, 1.95, 0.27, 0.02);
  const sconce = glow(colors.lamp, { base: 0xe8e2d6, strength: 3 });
  box(rig.root, 0.07, 0.03, 0.06, sconce, 4.1, 1.83, 0.275).castShadow = false;
  lamp.parts.push(sconce);
  for (const [x, z] of [[0.7, 3.1], [0.7, 4.9], [2.95, 6.1], [-1.0, 4.6], [-5.2, 5.0], [7.6, 5.0]]) {
    cyl(rig.root, 0.03, 0.03, 0.5, matte(DARK, { metal: 0.6, rough: 0.4 }), x, 0.25, z, 10);
    const cap = glow(colors.lamp, { base: 0xe8e2d6, strength: 3 });
    cyl(rig.root, 0.05, 0.05, 0.08, cap, x, 0.52, z, 14).castShadow = false;
    lamp.parts.push(cap);
    lamp.halos.push(bloom(rig.root, colors.lamp, 1.1, x, 0.5, z));
    lamp.pools.push(pool(rig.root, colors.lamp, 3.4, x, 0.09, z));
  }
  rig.channels.garden = (level) => {
    porch.intensity = 5 * level;
    gate.intensity = 7 * level;
    lamp.parts.forEach((part) => setGlow(part, level));
    lamp.halos.forEach((sprite) => { sprite.material.opacity = 0.4 * level; });
    lamp.pools.forEach((mesh) => { mesh.material.opacity = 0.22 * level; });
  };

  // Robot mower on the lawn.
  const mower = group(rig.root, -3.5, 0.02, 5.6);
  soft(mower, 0.5, 0.17, 0.7, matte(0x26292d, { rough: 0.35, metal: 0.3 }), 0, 0.17, 0, 0.07);
  soft(mower, 0.3, 0.05, 0.34, matte(0xd9dadb, { rough: 0.3 }), 0, 0.27, -0.06, 0.02);
  for (const x of [-0.26, 0.26]) {
    const wheel = cyl(mower, 0.12, 0.12, 0.07, matte(0x0e0f11, { rough: 0.9 }), x, 0.12, 0.2, 18);
    wheel.rotation.z = Math.PI / 2;
  }
  rig.movers.mower = { body: mower, level: 0, phase: 0 };
  rig.channels.mower = (level) => { rig.movers.mower.level = level; };
}

export function buildOutdoor(rig, colors) {
  const ring = garage(rig, colors);
  buildCar(rig, colors, ring);
  heatPump(rig);
  garden(rig, colors);
}
