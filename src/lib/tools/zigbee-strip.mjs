// Where the Wi-Fi bars and Zigbee marks go on the frequency strip, in drawing
// units (10 units per MHz). No DOM; ZigbeeStrip.astro draws it on the server.

import { WIFI_CHANNELS, ZIGBEE_CHANNELS, wifiBand, zigbeeCentre } from "./zigbee-channel.mjs";

const START_MHZ = 2398;
const END_MHZ = 2486;
const UNITS_PER_MHZ = 10;
const LANES = 5; // channels 5 apart do not overlap, so five lanes are enough
const LANE_HEIGHT = 34;
const LANE_STEP = 40;
const ZIGBEE_TOP = 222;

export const STRIP = {
  width: (END_MHZ - START_MHZ) * UNITS_PER_MHZ,
  height: 338,
  zigbeeTop: ZIGBEE_TOP,
  barHeight: 44,
  labelY: 330,
};

export const x = (mhz) => (mhz - START_MHZ) * UNITS_PER_MHZ;

/** Rounded to whole units, so the markup is short. */
const round = (value) => Math.round(value);

export function wifiShapes() {
  return WIFI_CHANNELS.map((channel) => {
    const { low, high } = wifiBand(channel);
    const lane = (channel - 1) % LANES;
    return { channel, x: round(x(low)), width: round(x(high) - x(low)), y: 8 + lane * LANE_STEP, height: LANE_HEIGHT };
  });
}

export function zigbeeShapes() {
  return ZIGBEE_CHANNELS.map((channel) => {
    const centre = x(zigbeeCentre(channel));
    return {
      channel,
      centre: round(centre),
      cellX: round(centre - 23),
      barX: round(centre - 10),
      major: [11, 15, 20, 25, 26].includes(channel),
    };
  });
}
