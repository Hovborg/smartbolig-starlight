// Trees, hedges and plants made of many small leaf cards, so they look like
// foliage and not like balls. One draw call per plant.
import {
  Color, DoubleSide, InstancedMesh, MeshDepthMaterial, MeshStandardMaterial, Object3D, PlaneGeometry, RGBADepthPacking,
} from "three";
import { ball, box, cyl, group, matte } from "../kit.mjs";
import { leafCard } from "../textures.mjs";

const dummy = new Object3D();
const shade = new Color();

function random(seed) {
  let a = seed;
  return () => {
    a = (a * 16807) % 2147483647;
    return (a - 1) / 2147483646;
  };
}

/**
 * Scatter leaf cards. `place(next)` returns [x, y, z] for one card;
 * `next` gives repeatable random numbers between 0 and 1.
 */
function leaves(parent, count, size, hue, seed, place) {
  const texture = leafCard(hue);
  const material = new MeshStandardMaterial({ map: texture, alphaTest: 0.45, side: DoubleSide, roughness: 0.85 });
  const mesh = new InstancedMesh(new PlaneGeometry(size, size), material, count);
  mesh.customDepthMaterial = new MeshDepthMaterial({ depthPacking: RGBADepthPacking, map: texture, alphaTest: 0.45 });
  const next = random(seed);
  for (let i = 0; i < count; i += 1) {
    dummy.position.set(...place(next));
    dummy.rotation.set(next() * 6.28, next() * 6.28, next() * 6.28);
    dummy.scale.setScalar(0.7 + next() * 0.6);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, shade.setScalar(0.62 + next() * 0.5));
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  // Leaf cards are see-through in places, which the contact-shadow pass cannot handle.
  mesh.userData.overlay = true;
  parent.add(mesh);
  return mesh;
}

/** A point on a slightly flattened ball: the shape of a crown or a bush. */
function onBall(next, cx, cy, cz, r, depth = 0.35) {
  const theta = next() * Math.PI * 2;
  const phi = Math.acos(2 * next() - 1);
  const radius = r * (1 - depth * next());
  return [
    cx + radius * Math.sin(phi) * Math.cos(theta),
    cy + radius * Math.cos(phi) * 0.82,
    cz + radius * Math.sin(phi) * Math.sin(theta),
  ];
}

export function tree(parent, x, z, scale = 1, seed = 7) {
  const g = group(parent, x, 0, z);
  const bark = matte(0x3d3229, { rough: 0.95 });
  cyl(g, 0.1 * scale, 0.17 * scale, 2.0 * scale, bark, 0, 1.0 * scale, 0, 10);
  for (const [dx, dz, tilt] of [[0.35, 0.1, -0.6], [-0.3, 0.2, 0.55], [0.05, -0.35, 0.3]]) {
    const branch = cyl(g, 0.04 * scale, 0.08 * scale, 1.2 * scale, bark, dx * scale, 2.3 * scale, dz * scale, 8);
    branch.rotation.set(dz * 1.4, 0, tilt);
  }
  const crowns = [[0, 3.0, 0, 1.25], [0.75, 2.6, 0.2, 0.9], [-0.7, 2.55, -0.25, 0.85], [0.1, 3.75, -0.1, 0.8], [-0.15, 2.5, 0.7, 0.75]];
  // A dark core, so the sky does not shine through the middle of the crown.
  for (const [cx, cy, cz, r] of crowns) ball(g, r * 0.5 * scale, matte(0x1c2a17, { rough: 1 }), cx * scale, cy * scale, cz * scale, 10);
  leaves(g, 760, 0.66 * scale, 100, seed, (next) => {
    const [cx, cy, cz, r] = crowns[Math.floor(next() * crowns.length)];
    return onBall(next, cx * scale, cy * scale, cz * scale, r * scale);
  });
  return g;
}

export function shrub(parent, x, z, r = 0.4, seed = 3) {
  const g = group(parent, x, 0, z);
  ball(g, r * 0.7, matte(0x1c2a17, { rough: 1 }), 0, r * 0.75, 0, 10);
  leaves(g, 90, r * 0.75, 112, seed, (next) => onBall(next, 0, r * 0.8, 0, r, 0.2));
  return g;
}

/** A clipped hedge: a box covered in leaves. */
export function hedge(parent, x, z, length, alongX, height = 1.5, seed = 11) {
  const g = group(parent, x, 0, z);
  const size = alongX ? [length, height, 0.6] : [0.6, height, length];
  box(g, size[0] - 0.14, height - 0.08, size[2] - 0.14, matte(0x1b2a16, { rough: 1 }), 0, height / 2, 0);
  leaves(g, Math.round(length * 150), 0.34, 104, seed, (next) => {
    // Cards on the top and the two long sides.
    const along = (next() - 0.5) * length;
    const face = next();
    const across = face < 0.3 ? (next() - 0.5) * 0.6 : (face < 0.65 ? 0.3 : -0.3);
    const y = face < 0.3 ? height : next() * height;
    return alongX ? [along, y, across] : [across, y, along];
  });
  return g;
}

/** A house plant in a pot. */
export function potPlant(parent, x, y, z, scale = 1, seed = 5) {
  const g = group(parent, x, y, z);
  cyl(g, 0.17 * scale, 0.13 * scale, 0.32 * scale, matte(0xcfc6b8, { rough: 0.7 }), 0, 0.16 * scale, 0, 20);
  cyl(g, 0.012 * scale, 0.02 * scale, 0.5 * scale, matte(0x4a3a2a), 0, 0.5 * scale, 0, 6);
  leaves(g, 46, 0.36 * scale, 118, seed, (next) => onBall(next, 0, 0.82 * scale, 0, 0.36 * scale, 0.5));
  return g;
}
