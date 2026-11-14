// The electric car on the driveway. The body is cut from a side profile, so
// it has a real bonnet, roofline and wheel arches.
import { ExtrudeGeometry, Mesh, Shape } from "three";
import { bloom, box, cyl, glow, group, lacquer, matte, setGlow, soft } from "../kit.mjs";

const WIDTH = 1.86;

/**
 * Extrude a side profile (x = along the car, y = up) across the car. In the
 * finished part the car's length runs along z, with the nose at -z.
 */
function across(shape, width, bevel, material) {
  const depth = width - bevel * 2;
  const geometry = new ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 6, curveSegments: 28,
  });
  geometry.rotateY(-Math.PI / 2);
  geometry.translate(depth / 2, 0, 0);
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function bodyShape() {
  const shape = new Shape();
  // Underside from nose to tail, with the two wheel arches cut out.
  shape.moveTo(-2.18, 0.3);
  shape.lineTo(-1.78, 0.3);
  shape.absarc(-1.36, 0.34, 0.42, Math.PI, 0, true);
  shape.lineTo(0.94, 0.3);
  shape.absarc(1.36, 0.34, 0.42, Math.PI, 0, true);
  shape.lineTo(2.14, 0.3);
  // Tail, belt line and bonnet back to the nose.
  shape.quadraticCurveTo(2.26, 0.34, 2.24, 0.62);
  shape.quadraticCurveTo(2.22, 0.9, 1.95, 0.96);
  shape.lineTo(1.2, 1.0);
  shape.lineTo(-0.95, 0.95);
  shape.quadraticCurveTo(-1.7, 0.86, -2.12, 0.72);
  shape.quadraticCurveTo(-2.28, 0.62, -2.26, 0.46);
  shape.quadraticCurveTo(-2.25, 0.32, -2.18, 0.3);
  return shape;
}

function cabinShape() {
  const shape = new Shape();
  shape.moveTo(-1.02, 0.93);
  shape.quadraticCurveTo(-0.55, 1.34, -0.1, 1.4);
  shape.quadraticCurveTo(0.5, 1.45, 0.95, 1.36);
  shape.quadraticCurveTo(1.5, 1.2, 1.86, 0.97);
  shape.closePath();
  return shape;
}

function roofShape() {
  const shape = new Shape();
  shape.moveTo(-0.06, 1.41);
  shape.quadraticCurveTo(0.5, 1.466, 0.92, 1.378);
  shape.lineTo(0.92, 1.34);
  shape.quadraticCurveTo(0.5, 1.43, -0.06, 1.37);
  shape.closePath();
  return shape;
}

export function buildCar(rig, colors, chargerRing) {
  const car = group(rig.root, 5.4, 0.08, 3.15);
  const paint = lacquer(0x6b7279, { rough: 0.34, metal: 0.7 });
  const trim = matte(0x0d0f12, { rough: 0.5 });
  car.add(across(bodyShape(), WIDTH, 0.1, paint));
  car.add(across(cabinShape(), WIDTH - 0.36, 0.15, matte(0x0b0e12, { rough: 0.05, metal: 0.9 })));

  car.add(across(roofShape(), WIDTH - 0.6, 0.02, paint));

  for (const x of [-0.84, 0.84]) {
    for (const z of [-1.36, 1.36]) {
      const tyre = cyl(car, 0.36, 0.36, 0.25, matte(0x0c0d0f, { rough: 0.92 }), x, 0.34, z, 40);
      tyre.rotation.z = Math.PI / 2;
      const rim = cyl(car, 0.25, 0.25, 0.26, matte(0x8d9299, { rough: 0.25, metal: 0.9 }), x, 0.34, z, 32);
      rim.rotation.z = Math.PI / 2;
      const hubCap = cyl(car, 0.08, 0.08, 0.275, matte(0x15171a, { rough: 0.4, metal: 0.6 }), x, 0.34, z, 16);
      hubCap.rotation.z = Math.PI / 2;
    }
    // Sill, door seams, handle and mirror on each side.
    const side = Math.sign(x);
    box(car, 0.02, 0.07, 1.86, trim, side * 0.925, 0.33, 0).castShadow = false;
    for (const z of [-0.42, 0.62]) box(car, 0.004, 0.52, 0.008, trim, side * 0.931, 0.66, z).castShadow = false;
    box(car, 0.008, 0.02, 0.16, trim, side * 0.934, 0.84, 0.2).castShadow = false;
    soft(car, 0.2, 0.1, 0.09, paint, side * 0.99, 0.99, -0.72, 0.03);
  }
  // Light bars and the number plate.
  const tail = glow("#ff3b2f", { base: 0x4a0f0b, strength: 3 });
  box(car, 1.5, 0.04, 0.03, tail, 0, 0.82, 2.215).castShadow = false;
  setGlow(tail, 0.7);
  const head = glow("#eef4ff", { base: 0x8a8f96, strength: 2 });
  box(car, 1.3, 0.03, 0.03, head, 0, 0.68, -2.2).castShadow = false;
  setGlow(head, 0.2);
  box(car, 0.5, 0.11, 0.02, matte(0xe9eaeb, { rough: 0.5 }), 0, 0.5, 2.25).castShadow = false;
  // Charge port on the left front wing, where the cable ends.
  const port = glow(colors.energy, { base: 0x202428, strength: 3.6 });
  box(car, 0.012, 0.09, 0.16, port, -0.935, 0.72, -1.47).castShadow = false;
  const halo = bloom(rig.root, colors.energy, 0.9, 4.42, 0.8, 1.68);
  rig.channels.ev = (level) => {
    setGlow(port, level);
    setGlow(chargerRing, level);
    halo.material.opacity = 0.35 * level;
  };
}
