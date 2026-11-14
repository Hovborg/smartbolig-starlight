// Which Zigbee channels sit under the Wi-Fi channels a visitor has marked.
// No DOM, so it runs in Node tests.
//
// Zigbee (IEEE 802.15.4) channel n, 11 to 26: centre 2405 + 5 * (n - 11) MHz, 2 MHz wide.
// Wi-Fi channel m, 1 to 13 (the channels used in Europe): centre 2412 + 5 * (m - 1) MHz.
// A Wi-Fi channel is counted as WIFI_WIDTH_MHZ (22 MHz) wide, as in AN5185 figure 1.

export const ZIGBEE_CHANNELS = Array.from({ length: 16 }, (_, i) => 11 + i);
export const WIFI_CHANNELS = Array.from({ length: 13 }, (_, i) => 1 + i);
export const ZIGBEE_WIDTH_MHZ = 2;
export const WIFI_WIDTH_MHZ = 22;
export const COMMON_WIFI_CHANNELS = [1, 6, 11];

/** The channels Zigbee2MQTT (ZLL: 11, 15, 20, 25) and ZHA (15, 20, 25) name; tried first, in this order on a tie. */
export const PREFERRED = [15, 20, 25, 11];
/** Never recommended. */
export const LAST_RESORT = 26;

export const zigbeeCentre = (channel) => 2405 + 5 * (channel - 11);
export const wifiCentre = (channel) => 2412 + 5 * (channel - 1);

const band = (centre, width) => ({ low: centre - width / 2, high: centre + width / 2 });
export const zigbeeBand = (channel) => band(zigbeeCentre(channel), ZIGBEE_WIDTH_MHZ);
export const wifiBand = (channel) => band(wifiCentre(channel), WIFI_WIDTH_MHZ);

const isChannel = (value) => Number.isInteger(value) && value >= 1 && value <= 13;

/** The Wi-Fi channels as a sorted list without duplicates; anything that is not 1 to 13 is dropped. */
export function cleanWifi(channels) {
  return [...new Set((channels ?? []).filter(isChannel))].sort((a, b) => a - b);
}

/** Do the two bands share more than a single point? */
export function overlaps(a, b) {
  return a.low < b.high && b.low < a.high;
}

/** Zigbee channels that overlap at least one of the Wi-Fi channels. */
export function overlapping(wifiChannels) {
  const bands = cleanWifi(wifiChannels).map(wifiBand);
  return ZIGBEE_CHANNELS.filter((channel) => bands.some((wifi) => overlaps(zigbeeBand(channel), wifi)));
}

/** Zigbee channels per Wi-Fi channel: which Wi-Fi channels cover this Zigbee channel. */
export function coveredBy(zigbeeChannel, wifiChannels) {
  return cleanWifi(wifiChannels).filter((m) => overlaps(zigbeeBand(zigbeeChannel), wifiBand(m)));
}

/**
 * Distance in MHz from the Zigbee channel's centre to the nearest edge of a
 * chosen Wi-Fi band; 0 when the centre is inside a band. Infinity with no Wi-Fi.
 */
export function score(zigbeeChannel, wifiChannels) {
  const centre = zigbeeCentre(zigbeeChannel);
  let best = Number.POSITIVE_INFINITY;
  for (const m of cleanWifi(wifiChannels)) {
    const { low, high } = wifiBand(m);
    const distance = centre >= low && centre <= high ? 0 : Math.min(Math.abs(centre - low), Math.abs(centre - high));
    best = Math.min(best, distance);
  }
  return best;
}

function tieRank(channel) {
  const preferred = PREFERRED.indexOf(channel);
  return preferred === -1 ? PREFERRED.length + channel : preferred;
}

/** The candidate furthest from the Wi-Fi; on a tie 15, 20, 25, 11, then the lowest number. */
function furthest(candidates, wifi) {
  const rows = candidates.map((channel) => ({ channel, score: score(channel, wifi) }));
  return rows.sort((a, b) => b.score - a.score || tieRank(a.channel) - tieRank(b.channel))[0];
}

/**
 * The whole answer for a set of Wi-Fi channels: the recommended channel, its
 * distance (null with no Wi-Fi marked), the overlapping Zigbee channels and
 * the ones that are free. Channel 26 is never recommended.
 *
 * `kind` says which rule gave the channel:
 * - "none": no Wi-Fi marked, so 15.
 * - "preferred": one of 15, 20, 25, 11 is free of the Wi-Fi; the furthest one.
 * - "other": those four are all covered; a free channel from 11 to 25, the furthest.
 * - "covered": every channel from 11 to 25 overlaps; the first in 15, 20, 25, 11, then the lowest.
 */
export function advise(wifiChannels) {
  const wifi = cleanWifi(wifiChannels);
  const overlap = overlapping(wifi);
  const free = ZIGBEE_CHANNELS.filter((channel) => !overlap.includes(channel));
  const recommendable = free.filter((channel) => channel !== LAST_RESORT);
  const allowed = ZIGBEE_CHANNELS.filter((channel) => channel !== LAST_RESORT);
  let kind = "covered";
  let pool = allowed;
  if (wifi.length === 0) {
    kind = "none";
    pool = PREFERRED;
  } else if (PREFERRED.some((channel) => recommendable.includes(channel))) {
    kind = "preferred";
    pool = PREFERRED.filter((channel) => recommendable.includes(channel));
  } else if (recommendable.length > 0) {
    kind = "other";
    pool = recommendable;
  }
  const best = furthest(pool, wifi);
  return {
    wifi,
    kind,
    best: best.channel,
    distance: Number.isFinite(best.score) ? best.score : null,
    overlap,
    free,
  };
}
