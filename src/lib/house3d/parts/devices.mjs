// The smart devices inside the house. Each one registers a channel on the
// rig (0 = off, 1 = on), which the scenes in modes.mjs drive.
import {
  AdditiveBlending, CanvasTexture, Color, DoubleSide, Mesh, MeshBasicMaterial, PointLight, RingGeometry,
  SpotLight, SRGBColorSpace, Vector3,
} from "three";
import { bloom, box, cyl, glow, group, matte, overlay, setGlow, soft } from "../kit.mjs";
import { palette as c } from "../palette.mjs";
import { FLOOR } from "./shell.mjs";

/** A lamp group: the lights, glowing parts and halos that follow one channel. */
function lamp(rig, name) {
  const group = { lights: [], parts: [], halos: [] };
  rig.channels[name] = (level) => {
    group.lights.forEach(({ light, power }) => { light.intensity = power * level; });
    group.parts.forEach((part) => setGlow(part, level));
    group.halos.forEach((sprite) => { sprite.material.opacity = 0.28 * level; });
  };
  return group;
}

/** Ceiling light that throws shadows, so furniture stands on the floor. */
function ceiling(rig, group, color, power, x, z, reach = 9) {
  const light = new SpotLight(color, 0, reach, 1.12, 0.9, 1.3);
  light.position.set(x, 3.5, z);
  light.target.position.set(x, 0, z);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.bias = -0.0006;
  light.shadow.normalBias = 0.04;
  light.shadow.camera.near = 0.6;
  rig.root.add(light, light.target);
  group.lights.push({ light, power });
}

function fill(rig, group, color, power, x, y, z, reach) {
  const light = new PointLight(color, 0, reach, 1.6);
  light.position.set(x, y, z);
  rig.root.add(light);
  group.lights.push({ light, power });
}

function shade(rig, group, color, r, h, x, y, z, haloSize = 1.5) {
  const material = glow(color, { base: 0xe6dfd2, strength: 1.7 });
  cyl(rig.root, r * 0.72, r, h, material, x, y, z, 28).castShadow = false;
  group.parts.push(material);
  group.halos.push(bloom(rig.root, color, haloSize, x, y, z));
}

function strip(rig, group, color, w, d, x, y, z) {
  const material = glow(color, { base: 0x3a3d40, strength: 3.2 });
  overlay(box(rig.root, w, 0.018, d, material, x, y, z));
  group.parts.push(material);
}

function lights(rig, colors) {
  const warm = colors.lamp;
  const living = lamp(rig, "living");
  ceiling(rig, living, warm, 42, -3.5, 0.45);
  fill(rig, living, warm, 5, -1.5, FLOOR + 1.5, -0.5, 4.5);
  const metal = matte(c.dark, { metal: 0.6, rough: 0.4 });
  cyl(rig.root, 0.014, 0.014, 1.55, metal, -1.5, FLOOR + 0.78, -0.5, 10);
  cyl(rig.root, 0.15, 0.15, 0.02, metal, -1.5, FLOOR + 0.01, -0.5, 24);
  shade(rig, living, warm, 0.22, 0.28, -1.5, FLOOR + 1.66, -0.5, 2.0);
  strip(rig, living, warm, 0.02, 1.9, -5.4, FLOOR + 0.085, -0.05);
  rig.anchors.light = new Vector3(-1.5, 2.15, -0.5);

  const kitchen = lamp(rig, "kitchen");
  ceiling(rig, kitchen, warm, 30, 0.5, 0.45, 8);
  strip(rig, kitchen, warm, 1.56, 0.02, 0.45, FLOOR + 0.845, 1.165);
  strip(rig, kitchen, warm, 1.86, 0.02, 0.15, FLOOR + 0.87, -0.275);

  const bedroom = lamp(rig, "bedroom");
  fill(rig, bedroom, warm, 9, -4.25, 1.7, -2.6, 6);
  for (const x of [-5.45, -3.05]) {
    cyl(rig.root, 0.016, 0.045, 0.14, metal, x, FLOOR + 0.51, -3.68, 12);
    shade(rig, bedroom, warm, 0.1, 0.15, x, FLOOR + 0.655, -3.68, 0.9);
  }

  const bath = lamp(rig, "bath");
  fill(rig, bath, "#fff0dc", 7, -1.4, 1.9, -2.7, 5);
  soft(rig.root, 0.72, 0.8, 0.02, matte(0xcfd8dd, { rough: 0.03, metal: 0.95 }), -0.85, FLOOR + 1.5, -3.865, 0.008);
  strip(rig, bath, "#fff0dc", 0.72, 0.03, -0.85, FLOOR + 1.93, -3.85);

  const hall = lamp(rig, "hall");
  fill(rig, hall, warm, 6, 0.85, 1.9, -2.5, 5);
  strip(rig, hall, warm, 1.1, 0.02, 0.55, FLOOR + 0.972, -3.58);
}

/** What the TV shows: a small home dashboard with tiles and a graph. */
function dashboard(colors) {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 180;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0b1016";
  ctx.fillRect(0, 0, 320, 180);
  const tiles = [[colors.energy, 14, 14, 140, 70], [colors.light, 166, 14, 66, 70], [colors.heat, 240, 14, 66, 70], [colors.security, 14, 96, 92, 70]];
  ctx.globalAlpha = 0.85;
  for (const [color, x, y, w, h] of tiles) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#e9eef2";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= 12; i += 1) {
    const x = 122 + i * 15;
    const y = 152 - 30 * Math.abs(Math.sin(i * 0.7)) - i;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function media(rig, colors) {
  soft(rig.root, 0.035, 0.82, 1.42, matte(c.screen, { rough: 0.3, metal: 0.4 }), -5.855, FLOOR + 1.4, -0.05, 0.012);
  const screen = glow("#ffffff", { base: 0x05070a, strength: 1.15 });
  screen.emissiveMap = dashboard(colors);
  screen.userData.on = new Color(0x05070a);
  screen.roughness = 0.12;
  box(rig.root, 0.008, 0.76, 1.36, screen, -5.834, FLOOR + 1.4, -0.05).castShadow = false;
  rig.channels.tv = (level) => setGlow(screen, level);

  cyl(rig.root, 0.085, 0.085, 0.17, matte(0x4b4e52, { rough: 1 }), -5.62, FLOOR + 0.525, 0.7, 28);
  const ring = glow(colors.energy, { base: 0x2c3238, strength: 3 });
  cyl(rig.root, 0.07, 0.07, 0.008, ring, -5.62, FLOOR + 0.614, 0.7, 28).castShadow = false;
  rig.channels.speaker = (level) => setGlow(ring, level);
}

function hub(rig, colors) {
  // The hub: the brain of the house, on the shelf in the hall.
  soft(rig.root, 0.44, 0.1, 0.3, matte(c.white, { rough: 0.35 }), 0.35, FLOOR + 1.07, -3.72, 0.03);
  const line = glow(colors.energy, { base: 0x2c3238, strength: 3.4 });
  overlay(box(rig.root, 0.36, 0.016, 0.008, line, 0.35, FLOOR + 1.07, -3.567));
  const halo = bloom(rig.root, colors.energy, 1.2, 0.35, FLOOR + 1.1, -3.55);
  rig.channels.hub = (level) => { setGlow(line, level); halo.material.opacity = 0.4 * level; };
  // Router with two antennas.
  soft(rig.root, 0.36, 0.05, 0.22, matte(c.dark, { rough: 0.4 }), 0.25, FLOOR + 1.6, -3.72, 0.015);
  for (const dx of [-0.13, 0.13]) cyl(rig.root, 0.01, 0.01, 0.22, matte(c.dark), 0.25 + dx, FLOOR + 1.72, -3.8, 8);
  rig.anchors.hub = new Vector3(0.35, 1.55, -3.6);
}

function heating(rig, colors) {
  // Radiator under the living-room window, with a smart valve.
  const g = group(rig.root, -5.82, FLOOR, 1.45);
  const panel = matte(c.radiator, { rough: 0.4 });
  soft(g, 0.07, 0.55, 1.05, panel, 0, 0.42, 0, 0.012);
  for (let i = 0; i < 20; i += 1) box(g, 0.012, 0.5, 0.006, matte(0xc9c8c3, { rough: 0.5 }), 0.038, 0.42, -0.48 + i * 0.05).castShadow = false;
  const pipe = cyl(g, 0.012, 0.012, 0.14, matte(c.steel, { metal: 0.8, rough: 0.3 }), 0, 0.2, -0.58, 8);
  pipe.rotation.x = Math.PI / 2;
  const valve = glow(colors.heat, { base: 0xdcdcdc, strength: 3 });
  const body = cyl(g, 0.04, 0.04, 0.12, valve, 0.02, 0.62, -0.6, 20);
  body.rotation.x = Math.PI / 2;
  const halo = bloom(rig.root, colors.heat, 1.0, -5.7, FLOOR + 0.62, 0.85);
  rig.channels.radiator = (level) => { setGlow(valve, level); halo.material.opacity = 0.4 * level; };
  rig.channels.floorHeat = (level) => setGlow(rig.glows.floorHeat, level);
  rig.anchors.heat = new Vector3(-5.7, 1.25, 1.2);
}

function security(rig, colors) {
  // Motion sensor in the hall: rings on the floor show what it sees.
  soft(rig.root, 0.09, 0.09, 0.05, matte(c.white, { rough: 0.35 }), 1.85, FLOOR + 2.1, -2.4, 0.025);
  const rings = [0, 1, 2].map((index) => {
    const material = new MeshBasicMaterial({
      color: colors.security, transparent: true, opacity: 0, side: DoubleSide, depthWrite: false, blending: AdditiveBlending,
    });
    const ring = overlay(new Mesh(new RingGeometry(0.92, 1.0, 64), material));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0.85, FLOOR + 0.04, -2.45);
    ring.userData.offset = index / 3;
    rig.root.add(ring);
    return ring;
  });
  rig.pulses.sensor = { rings, level: 0 };
  rig.channels.sensor = (level) => { rig.pulses.sensor.level = level; };
  rig.channels.lock = (level) => setGlow(rig.glows.lock, level);
}

function helpers(rig, colors) {
  // Robot vacuum in the living room.
  const vacuum = group(rig.root, -3.75, FLOOR + 0.045, 1.5);
  cyl(vacuum, 0.19, 0.19, 0.07, matte(0x1c1e21, { rough: 0.3, metal: 0.3 }), 0, 0.045, 0, 36);
  cyl(vacuum, 0.065, 0.065, 0.025, matte(c.steel, { rough: 0.3, metal: 0.7 }), 0, 0.09, 0.05, 24);
  const eye = glow(colors.energy, { base: 0x2c3238, strength: 3 });
  overlay(box(vacuum, 0.1, 0.012, 0.012, eye, 0, 0.06, 0.186));
  rig.movers.vacuum = { body: vacuum, level: 0, phase: 0 };
  rig.channels.vacuum = (level) => { rig.movers.vacuum.level = level; setGlow(eye, level); };

  // Home-made ESP32 sensor in the plant by the window.
  const board = group(rig.root, -4.4, FLOOR, 1.62);
  box(board, 0.02, 0.26, 0.1, matte(0x1c5a41, { rough: 0.5 }), 0.1, 0.46, 0.08);
  box(board, 0.024, 0.07, 0.07, matte(c.steel, { rough: 0.3, metal: 0.8 }), 0.1, 0.52, 0.08);
  const led = glow(colors.energy, { base: 0x1c5a41, strength: 4 });
  overlay(box(board, 0.026, 0.02, 0.02, led, 0.1, 0.57, 0.11));
  rig.channels.sensorLed = (level) => setGlow(led, level);
  rig.anchors.diy = new Vector3(-4.3, 1.35, 1.7);
}

export function buildDevices(rig, colors) {
  lights(rig, colors);
  media(rig, colors);
  hub(rig, colors);
  heating(rig, colors);
  security(rig, colors);
  helpers(rig, colors);
}
