// Furniture, room by room. No smart devices here: those live in devices.mjs.
import { ball, box, cyl, group, matte, overlay, soft, surface } from "../kit.mjs";
import { palette as c } from "../palette.mjs";
import { potPlant } from "./foliage.mjs";
import { FLOOR } from "./shell.mjs";

const oak = (rx = 0.6, ry = 0.6) => surface("oakVeneer", rx, ry, { rough: 0.6, relief: 0.3 });
const walnut = (rx = 0.5, ry = 0.5) => surface("walnutVeneer", rx, ry, { rough: 0.55, relief: 0.3 });
const cloth = (tint = 0xffffff, rx = 1.5, ry = 1.5) => surface("fabric", rx, ry, { rough: 1, relief: 0.6, tint });
const linen = (tint = 0xffffff, rx = 1, ry = 1) => surface("linen", rx, ry, { rough: 1, relief: 0.5, tint });
const steel = () => matte(c.steel, { rough: 0.3, metal: 0.8 });
const ceramic = () => matte(c.ceramic, { rough: 0.22 });

function sofa(g) {
  const fabric = cloth(0xffffff);
  soft(g, 0.95, 0.3, 2.1, fabric, -2.35, 0.23, 0.45, 0.06);
  soft(g, 0.24, 0.74, 2.1, fabric, -1.98, 0.45, 0.45, 0.08);
  for (const z of [-0.6, 1.5]) soft(g, 0.95, 0.5, 0.22, fabric, -2.35, 0.34, z, 0.08);
  // Loose seat and back cushions.
  for (const z of [-0.02, 0.92]) {
    soft(g, 0.76, 0.15, 0.9, fabric, -2.45, 0.45, z, 0.06);
    soft(g, 0.2, 0.42, 0.88, fabric, -2.16, 0.7, z, 0.08);
  }
  soft(g, 0.4, 0.14, 0.4, linen(0xd3ab7c), -2.36, 0.62, 1.2, 0.06).rotation.z = 0.5;
  soft(g, 0.4, 0.14, 0.4, linen(0xb9c2c4), -2.36, 0.62, -0.3, 0.06).rotation.z = 0.5;
  for (const [x, z] of [[-2.76, -0.62], [-2.76, 1.52], [-1.94, -0.62], [-1.94, 1.52]]) cyl(g, 0.02, 0.02, 0.08, matte(c.dark), x, 0.04, z, 8);
}

function bookshelf(g) {
  const wood = oak(0.4, 0.4);
  const x = -1.24;
  const z = 1.5;
  // A low shelf, so it does not hide the room behind it.
  box(g, 0.3, 0.82, 0.03, wood, x, 0.41, z - 0.46);
  box(g, 0.3, 0.82, 0.03, wood, x, 0.41, z + 0.46);
  box(g, 0.02, 0.82, 0.92, wood, x + 0.14, 0.41, z);
  for (let shelf = 0; shelf < 3; shelf += 1) box(g, 0.3, 0.025, 0.9, wood, x, 0.02 + shelf * 0.39, z);
  // Books: thin boxes of mixed height and colour.
  for (let shelf = 0; shelf < 2; shelf += 1) {
    let at = z - 0.42;
    for (let i = 0; at < z + 0.2; i += 1) {
      const thick = 0.035 + ((i * 7 + shelf * 3) % 4) * 0.012;
      const tall = 0.22 + ((i * 5 + shelf) % 5) * 0.022;
      box(g, 0.19, tall, thick, matte(c.books[(i + shelf * 2) % c.books.length], { rough: 0.8 }), x - 0.03, 0.035 + shelf * 0.39 + tall / 2, at + thick / 2);
      at += thick + 0.004;
    }
  }
  cyl(g, 0.07, 0.05, 0.2, ceramic(), x - 0.02, 0.915, z + 0.28, 20);
  box(g, 0.2, 0.03, 0.27, matte(c.books[3], { rough: 0.8 }), x - 0.02, 0.83, z - 0.2);
  box(g, 0.18, 0.025, 0.25, matte(c.books[4], { rough: 0.8 }), x - 0.02, 0.858, z - 0.2).rotation.y = 0.2;
}

function living(root) {
  const g = group(root, 0, FLOOR, 0);
  soft(g, 2.7, 0.025, 1.9, surface("carpet", 3, 2.1, { rough: 1, relief: 0.9, tint: 0xd9d3c8 }), -3.7, 0.033, 0.45, 0.01);
  sofa(g);
  // Coffee table with a book and a cup.
  cyl(g, 0.46, 0.46, 0.035, walnut(0.6, 0.6), -3.75, 0.36, 0.45, 40);
  for (const [dx, dz] of [[0.26, 0.2], [-0.26, 0.2], [0, -0.32]]) cyl(g, 0.014, 0.014, 0.34, matte(c.dark, { metal: 0.6, rough: 0.4 }), -3.75 + dx, 0.17, 0.45 + dz, 8);
  box(g, 0.24, 0.025, 0.17, matte(c.books[0], { rough: 0.8 }), -3.85, 0.39, 0.38).rotation.y = 0.4;
  cyl(g, 0.038, 0.032, 0.08, ceramic(), -3.6, 0.418, 0.56, 16);
  // TV bench.
  soft(g, 0.42, 0.36, 2.0, walnut(0.3, 1.1), -5.62, 0.26, -0.05, 0.015);
  for (const z of [-0.72, -0.05, 0.62]) box(g, 0.006, 0.3, 0.006, matte(c.dark), -5.408, 0.26, z + 0.33);
  for (const z of [-0.95, 0.85]) box(g, 0.36, 0.08, 0.04, matte(c.dark), -5.62, 0.04, z);
  bookshelf(g);
  potPlant(root, -4.4, FLOOR, 1.62, 1.15, 5);
}

function kitchen(root) {
  const g = group(root, 0, FLOOR, 0);
  const cabinet = matte(c.cabinet, { rough: 0.5 });
  const top = matte(c.stone, { rough: 0.28 });
  const gap = matte(c.dark);
  soft(g, 1.9, 0.88, 0.62, cabinet, 0.15, 0.44, -0.6, 0.008);
  box(g, 1.9, 0.09, 0.56, gap, 0.15, 0.045, -0.62);
  soft(g, 1.96, 0.04, 0.68, top, 0.15, 0.9, -0.6, 0.008);
  for (let i = 1; i < 3; i += 1) box(g, 0.006, 0.74, 0.006, gap, -0.8 + i * 0.633, 0.5, -0.288).castShadow = false;
  // Tall fridge and oven cabinet.
  soft(g, 0.7, 2.0, 0.66, matte(c.steel, { rough: 0.32, metal: 0.75 }), 1.55, 1.0, -0.6, 0.012);
  box(g, 0.7, 0.006, 0.006, gap, 1.55, 0.78, -0.268).castShadow = false;
  box(g, 0.018, 0.7, 0.03, steel(), 1.27, 1.25, -0.25);
  // Hob, sink and tap.
  soft(g, 0.6, 0.008, 0.44, matte(c.screen, { rough: 0.08, metal: 0.4 }), 0.55, 0.924, -0.6, 0.003);
  soft(g, 0.5, 0.008, 0.38, steel(), -0.35, 0.924, -0.6, 0.003);
  box(g, 0.42, 0.006, 0.3, matte(0x6f7479, { rough: 0.3, metal: 0.8 }), -0.35, 0.93, -0.6).castShadow = false;
  cyl(g, 0.014, 0.014, 0.26, steel(), -0.35, 1.05, -0.84, 10);
  const spout = cyl(g, 0.012, 0.012, 0.16, steel(), -0.35, 1.18, -0.77, 10);
  spout.rotation.x = Math.PI / 2;
  // Island with two stools.
  soft(g, 1.6, 0.86, 0.8, oak(1.1, 0.6), 0.45, 0.43, 0.75, 0.008);
  soft(g, 1.72, 0.04, 0.92, top, 0.45, 0.88, 0.75, 0.008);
  for (const x of [0.05, 0.85]) {
    cyl(g, 0.17, 0.17, 0.04, oak(0.3, 0.3), x, 0.64, 1.48, 28);
    for (const [dx, dz] of [[0.11, 0.11], [-0.11, 0.11], [0.11, -0.11], [-0.11, -0.11]]) cyl(g, 0.012, 0.016, 0.62, matte(c.dark, { metal: 0.6, rough: 0.4 }), x + dx, 0.31, 1.48 + dz, 8);
  }
  // Fruit bowl and a pot on the hob.
  cyl(g, 0.17, 0.1, 0.07, ceramic(), 0.75, 0.935, 0.75, 28);
  for (const [dx, dz, color] of [[-0.04, -0.02, 0xc8622f], [0.05, 0.03, 0xc9a233], [0.0, 0.06, 0x8f9c3a]]) ball(g, 0.05, matte(color, { rough: 0.6 }), 0.75 + dx, 0.985, 0.75 + dz, 14);
  cyl(g, 0.1, 0.1, 0.1, steel(), 0.42, 0.98, -0.52, 24);
}

function bedroom(root) {
  const g = group(root, 0, FLOOR, 0);
  soft(g, 2.2, 0.02, 1.4, surface("carpet", 2.4, 1.5, { rough: 1, relief: 0.9, tint: 0xcfc8bb }), -4.25, 0.03, -1.9, 0.01);
  soft(g, 1.8, 0.24, 2.15, oak(0.9, 1.1), -4.25, 0.2, -2.85, 0.015);
  soft(g, 1.66, 0.2, 2.02, linen(0xffffff, 2, 2), -4.25, 0.42, -2.85, 0.07);
  soft(g, 1.74, 0.13, 1.35, linen(0xa9b6bf, 2, 1.6), -4.25, 0.55, -2.47, 0.06);
  soft(g, 1.76, 0.05, 0.42, linen(0xc9a877, 2, 0.5), -4.25, 0.62, -1.95, 0.02);
  for (const x of [-4.65, -3.85]) soft(g, 0.62, 0.15, 0.38, linen(0xffffff), x, 0.6, -3.52, 0.07).rotation.x = -0.18;
  soft(g, 1.9, 1.0, 0.09, cloth(0xd9d2c6), -4.25, 0.62, -3.84, 0.04);
  for (const x of [-5.45, -3.05]) {
    soft(g, 0.42, 0.38, 0.38, oak(0.3, 0.3), x, 0.25, -3.68, 0.012);
    box(g, 0.34, 0.006, 0.006, matte(c.dark), x, 0.26, -3.488).castShadow = false;
    for (const dx of [-0.17, 0.17]) cyl(g, 0.012, 0.012, 0.07, matte(c.dark), x + dx, 0.035, -3.56, 6);
  }
  // Wardrobe with three doors.
  soft(g, 0.58, 2.0, 1.25, oak(0.4, 1.3), -2.88, 1.0, -1.72, 0.012);
  for (const z of [-2.13, -1.72, -1.31]) {
    box(g, 0.006, 1.92, 0.006, matte(c.dark), -3.172, 1.0, z + 0.2).castShadow = false;
    box(g, 0.02, 0.2, 0.012, steel(), -3.185, 1.05, z + 0.14).castShadow = false;
  }
}

function bath(root) {
  const g = group(root, 0, FLOOR, 0);
  // Shower with glass walls.
  soft(g, 0.95, 0.05, 0.95, ceramic(), -1.95, 0.045, -3.45, 0.015);
  const glass = matte(0xa9c4d2, { rough: 0.04, metal: 0.2, opacity: 0.2 });
  overlay(box(g, 0.012, 1.95, 0.95, glass, -1.47, 1.0, -3.45));
  overlay(box(g, 0.95, 1.95, 0.012, glass, -1.95, 1.0, -2.97));
  box(g, 0.02, 1.95, 0.02, steel(), -1.47, 1.0, -2.97);
  cyl(g, 0.012, 0.012, 1.9, steel(), -2.3, 0.97, -3.82, 8);
  cyl(g, 0.11, 0.11, 0.015, steel(), -2.12, 1.92, -3.62, 20);
  const arm = cyl(g, 0.01, 0.01, 0.28, steel(), -2.21, 1.92, -3.72, 8);
  arm.rotation.set(Math.PI / 2, 0, 0.72);
  // Basin cabinet with a round basin and a tap.
  soft(g, 0.85, 0.5, 0.46, walnut(0.5, 0.3), -0.85, 0.55, -3.7, 0.012);
  soft(g, 0.9, 0.03, 0.5, matte(c.stone, { rough: 0.3 }), -0.85, 0.815, -3.7, 0.008);
  cyl(g, 0.19, 0.14, 0.11, ceramic(), -0.85, 0.885, -3.68, 28);
  cyl(g, 0.012, 0.012, 0.2, steel(), -0.85, 0.93, -3.88, 8);
  // Toilet.
  soft(g, 0.36, 0.38, 0.5, ceramic(), -0.72, 0.2, -1.6, 0.09);
  soft(g, 0.38, 0.5, 0.16, ceramic(), -0.72, 0.45, -1.28, 0.05);
  soft(g, 0.34, 0.03, 0.42, ceramic(), -0.72, 0.405, -1.62, 0.012);
  soft(g, 0.8, 0.02, 0.55, linen(0xcbd3d2), -1.7, 0.03, -2.0, 0.008);
  // Towels on a rail.
  box(g, 0.5, 0.012, 0.012, steel(), -2.1, 1.2, -1.14);
  soft(g, 0.4, 0.5, 0.03, linen(0xe9e4da), -2.1, 0.97, -1.15, 0.012);
}

function hall(root) {
  const g = group(root, 0, FLOOR, 0);
  // Shelves for the hub and the router.
  for (const y of [1.0, 1.55]) soft(g, 1.2, 0.04, 0.36, oak(0.8, 0.25), 0.55, y, -3.72, 0.01);
  for (const x of [0.02, 1.08]) box(g, 0.012, 0.55, 0.3, matte(c.dark, { metal: 0.6, rough: 0.4 }), x, 1.275, -3.74);
  for (const [x, color] of [[0.78, 3], [0.84, 0], [0.9, 5]]) box(g, 0.045, 0.24, 0.17, matte(c.books[color], { rough: 0.8 }), x, 1.69, -3.72);
  // Washing machine.
  soft(g, 0.62, 0.86, 0.6, matte(c.white, { rough: 0.3 }), 1.58, 0.43, -3.62, 0.025);
  const ring = cyl(g, 0.22, 0.22, 0.03, steel(), 1.58, 0.42, -3.31, 32);
  ring.rotation.x = Math.PI / 2;
  const door = cyl(g, 0.17, 0.17, 0.04, matte(0x10161c, { rough: 0.08, metal: 0.6 }), 1.58, 0.42, -3.305, 32);
  door.rotation.x = Math.PI / 2;
  box(g, 0.5, 0.07, 0.006, matte(c.dark, { rough: 0.3 }), 1.58, 0.78, -3.318).castShadow = false;
  // Shoe bench with shoes underneath.
  soft(g, 0.9, 0.05, 0.36, walnut(0.6, 0.25), 1.5, 0.42, -1.4, 0.012);
  for (const x of [1.08, 1.92]) box(g, 0.03, 0.4, 0.34, matte(c.dark, { metal: 0.6, rough: 0.4 }), x, 0.2, -1.4);
  for (const [x, color] of [[1.3, 0x3a342e], [1.42, 0x3a342e], [1.66, 0xd9d6cf], [1.78, 0xd9d6cf]]) soft(g, 0.09, 0.07, 0.26, matte(color, { rough: 0.7 }), x, 0.04, -1.4, 0.03);
  potPlant(root, 0.05, FLOOR, -1.45, 0.85, 17);
}

export function buildInterior(rig) {
  living(rig.root);
  kitchen(rig.root);
  bedroom(rig.root);
  bath(rig.root);
  hall(rig.root);
}
