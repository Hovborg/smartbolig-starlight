// A close-up for the ESP32 guides: a development board on a breadboard with
// a sensor, a light diode and a phone that shows the reading, on a desk.
// One unit is one centimetre. Only the still pictures use it (stills.mjs);
// it is not part of the model on the homepage.
import { CatmullRomCurve3, Mesh, MeshStandardMaterial, PlaneGeometry, TubeGeometry, Vector3 } from "three";
import { ball, bloom, box, cyl, glow, group, matte, setGlow, soft, surface } from "../kit.mjs";
import { breadboardFace, circuitFace, phoneScreen } from "./workbench-faces.mjs";

const PITCH = 0.254;
const BOARD_TOP = 0.85;
const steel = () => matte(0xc7ccd1, { metal: 0.9, rough: 0.28 });
const plastic = () => matte(0x17181a, { rough: 0.45 });

/** A drawn face lying on top of a part. */
function face(parent, w, d, texture, x, y, z, options = {}) {
  const material = new MeshStandardMaterial({ map: texture, roughness: 0.6, ...options });
  const mesh = new Mesh(new PlaneGeometry(w, d), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function breadboard(parent) {
  soft(parent, 16.5, BOARD_TOP, 5.5, matte(0xe9e6dd, { rough: 0.6 }), 0, BOARD_TOP / 2, 0, 0.09);
  face(parent, 16.3, 5.3, breadboardFace(), 0, BOARD_TOP + 0.004, 0, { roughness: 0.7 });
}

/** The development board, with its USB end to the left. */
function devBoard(parent, colors) {
  const g = group(parent, -4.2, BOARD_TOP, 0);
  const top = 0.41;
  for (const z of [-1.27, 1.27]) box(g, 4.83, 0.25, 0.25, plastic(), 0, 0.125, z);
  soft(g, 5.2, 0.16, 2.8, matte(0x15181b, { rough: 0.5 }), 0, 0.33, 0, 0.05);
  face(g, 5.16, 2.76, circuitFace(), 0, top + 0.003, 0, { roughness: 0.45, metalness: 0.15 });
  // Solder joints of the two pin rows.
  const joint = matte(0xd4d6d9, { metal: 0.85, rough: 0.3 });
  for (let i = 0; i < 19; i += 1) {
    for (const z of [-1.27, 1.27]) cyl(g, 0.035, 0.06, 0.07, joint, -2.286 + i * PITCH, top + 0.035, z, 10);
  }
  // Radio module: shield can and the antenna at the end of the board.
  soft(g, 2.55, 0.09, 1.8, matte(0x101214, { rough: 0.5 }), 1.4, top + 0.045, 0, 0.03);
  soft(g, 1.72, 0.3, 1.56, steel(), 1.02, top + 0.24, 0, 0.04);
  const trace = matte(0xc9a24a, { metal: 0.9, rough: 0.35 });
  for (let i = 0; i < 5; i += 1) box(g, 0.05, 0.012, 1.25, trace, 2.02 + i * 0.13, top + 0.096, i % 2 ? 0.12 : -0.12).castShadow = false;
  // USB socket and the two buttons beside it.
  soft(g, 0.78, 0.27, 0.82, steel(), -2.32, top + 0.135, 0, 0.05);
  box(g, 0.02, 0.13, 0.62, plastic(), -2.715, top + 0.135, 0);
  for (const z of [-0.98, 0.98]) {
    soft(g, 0.4, 0.15, 0.32, steel(), -2.05, top + 0.075, z, 0.03);
    cyl(g, 0.085, 0.085, 0.09, plastic(), -2.05, top + 0.19, z, 16);
  }
  // Regulator, serial chip and the small parts around them.
  box(g, 0.36, 0.16, 0.66, plastic(), -1.2, top + 0.08, 0.15);
  box(g, 0.16, 0.12, 0.36, steel(), -0.96, top + 0.06, 0.15);
  soft(g, 0.52, 0.1, 0.52, matte(0x1c1e21, { rough: 0.35 }), -0.5, top + 0.05, -0.4, 0.02);
  const cap = matte(0xb39a74, { rough: 0.5 });
  for (const [x, z] of [[-1.55, -0.6], [-1.3, -0.6], [-0.2, 0.55], [0.0, 0.55], [-0.75, 0.75], [-0.05, -0.75]]) box(g, 0.16, 0.08, 0.09, cap, x, top + 0.04, z);
  const power = glow("#ff5a4d", { base: 0x5a1512, strength: 5 });
  box(g, 0.16, 0.07, 0.09, power, -1.6, top + 0.035, 0.82);
  setGlow(power, 1);
  const status = glow(colors.security, { base: 0x10324f, strength: 5 });
  box(g, 0.16, 0.07, 0.09, status, -1.6, top + 0.035, -0.82);
  setGlow(status, 1);
}

function sensor(parent) {
  const g = group(parent, 4.0, BOARD_TOP, -1.05);
  box(g, 1.1, 0.25, 0.25, plastic(), 0, 0.125, 0);
  soft(g, 1.3, 0.12, 1.5, matte(0x4b2a7a, { rough: 0.45 }), 0, 0.31, 0.55, 0.04);
  const pad = matte(0xd9b65a, { metal: 0.9, rough: 0.3 });
  for (let i = 0; i < 4; i += 1) cyl(g, 0.04, 0.065, 0.07, pad, -0.381 + i * PITCH, 0.405, 0, 10);
  soft(g, 0.27, 0.1, 0.27, steel(), 0.1, 0.42, 0.75, 0.02);
  box(g, 0.16, 0.08, 0.09, matte(0xb39a74, { rough: 0.5 }), -0.3, 0.41, 0.6);
  box(g, 0.16, 0.08, 0.09, matte(0x1c1e21, { rough: 0.4 }), -0.3, 0.41, 0.95);
}

/** A light diode that is on, with its series resistor across the middle. */
function diode(parent, colors) {
  const g = group(parent, 1.0, BOARD_TOP, 0.8);
  const leg = matte(0xcfd2d6, { metal: 0.9, rough: 0.3 });
  for (const x of [-0.127, 0.127]) cyl(g, 0.025, 0.025, 0.7, leg, x, 0.35, 0, 6);
  const lens = glow(colors.energy, { base: 0x1d6b4d, strength: 1.2 });
  cyl(g, 0.29, 0.29, 0.1, lens, 0, 0.72, 0, 20);
  cyl(g, 0.25, 0.25, 0.5, lens, 0, 1.0, 0, 20);
  ball(g, 0.25, lens, 0, 1.25, 0, 20);
  setGlow(lens, 1);
  bloom(parent, colors.energy, 2.6, 1.0, BOARD_TOP + 1.1, 0.8).material.opacity = 0.4;

  const r = group(parent, 2.02, BOARD_TOP + 0.34, 0);
  const lead = cyl(r, 0.025, 0.025, 1.9, leg, 0, 0, 0, 6);
  lead.rotation.x = Math.PI / 2;
  for (const z of [-0.95, 0.95]) cyl(r, 0.025, 0.025, 0.36, leg, 0, -0.17, z, 6);
  const body = cyl(r, 0.115, 0.115, 0.66, matte(0xd9c8a0, { rough: 0.55 }), 0, 0, 0, 16);
  body.rotation.x = Math.PI / 2;
  [0xb3261e, 0xb3261e, 0x5b3a1e, 0xc9a24a].forEach((color, index) => {
    const band = cyl(r, 0.119, 0.119, 0.06, matte(color, { rough: 0.5 }), 0, 0, -0.2 + index * 0.13, 16);
    band.rotation.x = Math.PI / 2;
  });
}

/** A jumper wire between two holes, with a plug at each end. */
function jumper(parent, color, from, to, { lift = 3.4, bow = 0 } = {}) {
  const plug = plastic();
  const points = [from, to].map(([x, z]) => new Vector3(x, BOARD_TOP + 1.35, z));
  for (const point of points) box(parent, 0.25, 1.35, 0.25, plug, point.x, BOARD_TOP + 0.675, point.z);
  const [a, b] = points;
  const mid = a.clone().lerp(b, 0.5);
  // Straight up out of each plug, then one soft arc between them.
  const rise = (p, toward) => new Vector3(p.x + (toward.x - p.x) * 0.06, p.y + 1.1, p.z + bow * 0.3);
  const curve = new CatmullRomCurve3([
    a, new Vector3(a.x, a.y + 0.45, a.z), rise(a, b),
    new Vector3(mid.x, BOARD_TOP + lift + 1.2, mid.z + bow),
    rise(b, a), new Vector3(b.x, b.y + 0.45, b.z), b,
  ], false, "centripetal");
  const wire = new Mesh(new TubeGeometry(curve, 64, 0.065, 8), matte(color, { rough: 0.45 }));
  wire.castShadow = true;
  wire.receiveShadow = true;
  parent.add(wire);
}

function cable(parent) {
  const g = group(parent, -6.52, BOARD_TOP + 0.545, 0);
  soft(g, 1.9, 0.72, 1.15, matte(0x1b1d20, { rough: 0.4 }), -1.35, 0, 0, 0.16);
  box(g, 0.5, 0.2, 0.7, steel(), -0.2, 0, 0);
  const curve = new CatmullRomCurve3([
    new Vector3(-2.2, 0, 0), new Vector3(-4.2, -0.3, -0.2), new Vector3(-7.5, -1.19, -2.2),
    new Vector3(-10.5, -1.19, -7), new Vector3(-11, -1.19, -15), new Vector3(-8, -1.19, -26),
  ]);
  const cord = new Mesh(new TubeGeometry(curve, 80, 0.2, 10), matte(0x1b1d20, { rough: 0.5 }));
  cord.castShadow = true;
  cord.receiveShadow = true;
  g.add(cord);
}

function phone(parent) {
  const g = group(parent, 8.4, 0, -8.2);
  g.rotation.y = -0.3;
  soft(g, 7.3, 0.82, 15.6, matte(0x15171a, { metal: 0.6, rough: 0.32 }), 0, 0.41, 0, 0.36);
  const screen = phoneScreen();
  face(g, 6.9, 15.1, screen, 0, 0.826, 0, { roughness: 0.18, emissiveMap: screen, emissive: 0xffffff, emissiveIntensity: 0.38 });
}

export function buildWorkbench(parent, colors) {
  const g = group(parent, 0.6, 0, 0.7);
  const desk = new Mesh(new PlaneGeometry(260, 260), surface("walnutVeneer", 1.3, 5.2, { rough: 0.5, relief: 0.1 }));
  desk.rotation.x = -Math.PI / 2;
  desk.receiveShadow = true;
  g.add(desk);
  breadboard(g);
  devBoard(g, colors);
  sensor(g);
  diode(g, colors);
  cable(g);
  phone(g);
  // From the board's pins (row a, beside the board) to the sensor's four pins.
  const sensorPin = (index) => [3.619 + index * PITCH, -1.56];
  jumper(g, 0xc8372d, [-2.168, -1.56], sensorPin(0), { lift: 3.1, bow: -1.5 });
  jumper(g, 0x1d1f22, [-2.93, -1.56], sensorPin(1), { lift: 3.7, bow: -2.2 });
  jumper(g, 0xe0b23a, [-4.454, -1.56], sensorPin(2), { lift: 4.3, bow: -2.9 });
  jumper(g, 0x2f6fd0, [-4.962, -1.56], sensorPin(3), { lift: 4.9, bow: -3.6 });
  // From the other pin row to the light diode.
  jumper(g, 0x2e9e5b, [-3.184, 1.56], [0.873, 1.56], { lift: 3.0, bow: 1.6 });
  return g;
}
