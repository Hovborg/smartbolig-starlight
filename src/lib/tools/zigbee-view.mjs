// The words the Zigbee channel picker shows for a set of Wi-Fi channels.
// No DOM, so the server render and the script give the same text.

import { fill } from "./format.mjs";
import { zigbeeCopy } from "./zigbee-copy.mjs";
import { advise } from "./zigbee-channel.mjs";

const list = (numbers) => numbers.join(", ");

export function zigbeeView(wifiChannels, lang = "da") {
  const copy = zigbeeCopy[lang].result;
  const advice = advise(wifiChannels);
  let reason = copy.none;
  if (advice.wifi.length > 0) {
    reason = fill(advice.distance > 0 ? copy.apart : copy.inside, { n: advice.best, mhz: advice.distance });
  }
  return {
    advice,
    best: String(advice.best),
    reason,
    overlap: advice.overlap.length > 0 ? fill(copy.overlap, { list: list(advice.overlap) }) : copy.noOverlap,
    free: advice.free.length > 0 ? fill(copy.free, { list: list(advice.free) }) : copy.noFree,
    summary: fill(copy.summary, { wifi: advice.wifi.length > 0 ? list(advice.wifi) : copy.noWifi, n: advice.best }),
  };
}
