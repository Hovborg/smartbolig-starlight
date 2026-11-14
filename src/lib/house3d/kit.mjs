// Small building blocks for the 3D kit: cached materials and primitive
// shapes. Every model in parts/ is put together from these, so the house on
// the homepage and the illustrations in the guides share one style.
import {
  AdditiveBlending, BoxGeometry, CanvasTexture, Color, CylinderGeometry, Group, Mesh, MeshBasicMaterial,
  MeshPhysicalMaterial, MeshStandardMaterial, PlaneGeometry, SphereGeometry, Sprite, SpriteMaterial,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { blankCanvas } from "./canvas.mjs";
import { surfaceMaps } from "./textures.mjs";

const materials = new Map();

/** A matte material, shared by colour. */
export function matte(color, { rough = 0.82, metal = 0, opacity = 1 } = {}) {
  const key = `${color}|${rough}|${metal}|${opacity}`;
  if (!materials.has(key)) {
    materials.set(key, new MeshStandardMaterial({
      color, roughness: rough, metalness: metal, transparent: opacity < 1, opacity,
    }));
  }
  return materials.get(key);
}

/**
 * A material that can light up. Never shared: its strength is animated
 * through `userData.level` (0 = off, 1 = fully on).
 */
export function glow(color, { base = 0x20252b, strength = 2.4 } = {}) {
  const material = new MeshStandardMaterial({
    color: base, emissive: new Color(color), emissiveIntensity: 0, roughness: 0.5,
  });
  material.userData = { strength, off: new Color(base), on: new Color(color) };
  return material;
}

/** Set how much a glow material is lit, 0..1. */
export function setGlow(material, level) {
  material.emissiveIntensity = material.userData.strength * level;
  material.color.copy(material.userData.off).lerp(material.userData.on, Math.min(1, level) * 0.85);
}

function place(mesh, x, y, z, parent) {
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent?.add(mesh);
  return mesh;
}

/** A box whose position is its centre. */
export function box(parent, w, h, d, material, x = 0, y = 0, z = 0) {
  return place(new Mesh(new BoxGeometry(w, h, d), material), x, y, z, parent);
}

/** A box with soft edges, for furniture and devices. */
export function soft(parent, w, h, d, material, x = 0, y = 0, z = 0, radius = 0.06) {
  const r = Math.min(radius, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  return place(new Mesh(new RoundedBoxGeometry(w, h, d, 3, r), material), x, y, z, parent);
}

/** An upright cylinder (or cone when the radii differ). */
export function cyl(parent, rTop, rBottom, h, material, x = 0, y = 0, z = 0, sides = 24) {
  return place(new Mesh(new CylinderGeometry(rTop, rBottom, h, sides), material), x, y, z, parent);
}

export function ball(parent, r, material, x = 0, y = 0, z = 0, detail = 16) {
  return place(new Mesh(new SphereGeometry(r, detail, Math.max(8, detail / 2)), material), x, y, z, parent);
}

export function group(parent, x = 0, y = 0, z = 0) {
  const g = new Group();
  g.position.set(x, y, z);
  parent?.add(g);
  return g;
}

let haloTexture;
function halo() {
  if (!haloTexture) {
    const size = 128;
    const canvas = blankCanvas(size);
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.25, "rgba(255,255,255,0.45)");
    gradient.addColorStop(0.6, "rgba(255,255,255,0.1)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    haloTexture = new CanvasTexture(canvas);
  }
  return haloTexture;
}

/** A soft light bloom around a lamp. Opacity is animated with the lamp. */
export function bloom(parent, color, size, x, y, z) {
  const sprite = new Sprite(new SpriteMaterial({
    map: halo(), color, blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0,
  }));
  sprite.scale.set(size, size, 1);
  sprite.position.set(x, y, z);
  sprite.userData.overlay = true;
  parent.add(sprite);
  return sprite;
}

/** A pool of light on the ground under a lamp. Opacity follows the lamp. */
export function pool(parent, color, size, x, y, z) {
  const mesh = new Mesh(new PlaneGeometry(size, size), new MeshBasicMaterial({
    map: halo(), color, blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0,
  }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.userData.overlay = true;
  parent.add(mesh);
  return mesh;
}

/** Things that never throw or take shadow: glass, glows, thin lines. */
export function noShadow(mesh) {
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

const surfaces = new Map();

/**
 * A material with a drawn texture (textures.mjs). `rx` and `ry` say how many
 * times the texture repeats over the face, so boards and tiles keep their
 * real size on parts of different sizes. `turn` makes the grain run upright.
 */
export function surface(name, rx = 1, ry = 1, { rough = 0.8, metal = 0, relief = 0.5, tint = 0xffffff, turn = false } = {}) {
  const key = `${name}|${rx}|${ry}|${rough}|${metal}|${relief}|${tint}|${turn}`;
  if (!surfaces.has(key)) {
    const maps = surfaceMaps(name);
    const repeat = (texture) => {
      const copy = texture.clone();
      copy.repeat.set(rx, ry);
      if (turn) copy.rotation = Math.PI / 2;
      copy.needsUpdate = true;
      return copy;
    };
    surfaces.set(key, new MeshStandardMaterial({
      map: repeat(maps.map), bumpMap: repeat(maps.bump), bumpScale: relief, roughness: rough, metalness: metal, color: tint,
    }));
  }
  return surfaces.get(key);
}

/** Car paint and other lacquered parts: colour under a clear, glossy coat. */
export function lacquer(color, { rough = 0.4, metal = 0.5 } = {}) {
  return new MeshPhysicalMaterial({ color, roughness: rough, metalness: metal, clearcoat: 1, clearcoatRoughness: 0.08 });
}

/**
 * Glass, glows and data lines are drawn on top of the lit scene. Marking
 * them keeps them out of the shading pass (post.mjs), where they would
 * leave dark outlines.
 */
export function overlay(object) {
  object.userData.overlay = true;
  object.castShadow = false;
  object.receiveShadow = false;
  return object;
}
