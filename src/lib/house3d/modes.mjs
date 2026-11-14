// What the house does at each time of day, and where the camera looks in
// each chapter of the tour. Angles are degrees; azimuth 0 is straight in
// front of the house, positive to the right.

/** Channel levels that are the same all day. */
const always = { hub: 1, speaker: 1, sensorLed: 1 };

export const modes = {
  morning: {
    sun: { az: 105, el: 24, power: 3.2, color: "#ffc9a0" },
    sky: { power: 0.9, top: "#ffe3cf", ground: "#6b6f78" },
    env: 0.32,
    levels: {
      ...always, daylight: 0.55, living: 0.15, kitchen: 0.75, bedroom: 0.9, bath: 0.85, hall: 0.3, garden: 0,
      tv: 0, radiator: 1, floorHeat: 1, heatpump: 1, lock: 0, sensor: 0, vacuum: 0, mower: 0, ev: 0.2,
      "blinds.living": 0, "blinds.bedroom": 0.4,
    },
  },
  day: {
    sun: { az: -35, el: 52, power: 2.5, color: "#fff4e2" },
    sky: { power: 0.8, top: "#dfeeff", ground: "#8a9088" },
    env: 0.4,
    levels: {
      ...always, daylight: 1, living: 0, kitchen: 0, bedroom: 0, bath: 0, hall: 0, garden: 0,
      tv: 0, radiator: 0, floorHeat: 0, heatpump: 0.3, lock: 0, sensor: 0, vacuum: 1, mower: 1, ev: 1,
      "blinds.living": 0, "blinds.bedroom": 0,
    },
  },
  evening: {
    sun: { az: -118, el: 15, power: 1.0, color: "#ff9d6b" },
    sky: { power: 0.75, top: "#7d93d6", ground: "#2a2f3a" },
    env: 0.18,
    levels: {
      ...always, daylight: 0.1, living: 1, kitchen: 0.85, bedroom: 0.25, bath: 0, hall: 0.5, garden: 1,
      tv: 1, radiator: 0.7, floorHeat: 0.1, heatpump: 0.6, lock: 0, sensor: 0, vacuum: 0, mower: 0, ev: 0.6,
      "blinds.living": 0.75, "blinds.bedroom": 1,
    },
  },
  night: {
    sun: { az: 60, el: 48, power: 0.55, color: "#9db8ff" },
    sky: { power: 0.32, top: "#3d4f86", ground: "#1c2029" },
    env: 0.1,
    levels: {
      ...always, daylight: 0.02, living: 0, kitchen: 0, bedroom: 0, bath: 0, hall: 0.2, garden: 0.35,
      tv: 0, radiator: 0.2, floorHeat: 0, heatpump: 0.2, lock: 1, sensor: 1, vacuum: 0, mower: 0, ev: 1,
      "blinds.living": 1, "blinds.bedroom": 1,
    },
  },
};

export const systems = ["light", "heat", "energy", "security", "diy"];

/** Camera positions: the overview and one per chapter of the tour. */
export const views = {
  overview: { az: 34, el: 33, dist: 39, target: [0.7, 0.5, 0.3] },
  light: { az: 14, el: 37, dist: 21, target: [-2.9, 0.9, 0.3] },
  heat: { az: -28, el: 34, dist: 22, target: [-3.4, 0.8, 0.4] },
  energy: { az: 52, el: 27, dist: 21, target: [5.0, 1.3, 1.2] },
  security: { az: 22, el: 26, dist: 18, target: [1.3, 1.1, 1.2] },
};

/** How strongly each system's arcs glow: all softly, or one in focus. */
export function linkLevels(focus) {
  return Object.fromEntries(systems.map((system) => [
    `link.${system}`,
    focus ? (system === focus ? 1 : 0.04) : 0.32,
  ]));
}
