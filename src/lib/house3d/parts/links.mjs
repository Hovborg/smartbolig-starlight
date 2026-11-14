// Glowing arcs between the hub and the devices: the picture of "everything
// talks to the hub, locally". One group of arcs per system.
import { AdditiveBlending, Mesh, MeshBasicMaterial, QuadraticBezierCurve3, SphereGeometry, TubeGeometry, Vector3 } from "three";
import { overlay } from "../kit.mjs";

const HUB = new Vector3(0.35, 1.3, -3.66);

/** Device end of each arc, by system. */
const ENDS = {
  light: [[-1.5, 1.95, -0.5], [0.45, 1.05, 0.75], [-5.45, 0.95, -3.68], [0.75, 0.6, 3.1]],
  heat: [[-5.78, 0.78, 0.85], [-1.4, 0.2, -2.3], [-0.55, 0.95, 2.62]],
  energy: [[5.2, 2.95, -1.2], [3.72, 1.5, 0.3], [1.58, 0.95, -3.5]],
  security: [[1.75, 1.2, 2.1], [1.9, 2.25, -2.4]],
  diy: [[-4.3, 0.6, 1.7]],
};

function arc(rig, color, to) {
  const end = new Vector3(...to);
  const mid = HUB.clone().lerp(end, 0.5);
  mid.y = Math.max(HUB.y, end.y) + 1.1 + HUB.distanceTo(end) * 0.22;
  const curve = new QuadraticBezierCurve3(HUB, mid, end);
  const material = new MeshBasicMaterial({
    color, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false,
  });
  const tube = overlay(new Mesh(new TubeGeometry(curve, 48, 0.016, 6), material));
  rig.root.add(tube);
  const pulses = [0, 0.5].map((offset) => {
    const dot = overlay(new Mesh(new SphereGeometry(0.05, 12, 8), new MeshBasicMaterial({
      color, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false,
    })));
    dot.userData.offset = offset;
    rig.root.add(dot);
    return dot;
  });
  return { curve, tube, pulses };
}

export function buildLinks(rig, colors) {
  const colorOf = { ...colors, diy: colors.energy };
  for (const [system, ends] of Object.entries(ENDS)) {
    rig.links[system] = { level: 0, arcs: ends.map((to) => arc(rig, colorOf[system], to)) };
    rig.channels[`link.${system}`] = (level) => { rig.links[system].level = level; };
  }
}

/** Move the pulses along the arcs. `time` in seconds; `moving` is false when motion is off. */
export function animateLinks(rig, time, moving) {
  for (const link of Object.values(rig.links)) {
    for (const { curve, tube, pulses } of link.arcs) {
      tube.material.opacity = 0.06 + 0.5 * link.level;
      for (const dot of pulses) {
        const t = moving ? (time * 0.28 + dot.userData.offset) % 1 : dot.userData.offset + 0.25;
        dot.position.copy(curve.getPoint(1 - t));
        dot.material.opacity = link.level * Math.sin(Math.PI * t);
        dot.scale.setScalar(0.7 + link.level * 0.9);
      }
    }
  }
}
