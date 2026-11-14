// The words the Zigbee channel picker shows for a set of Wi-Fi channels.
// No DOM, so the server render and the script give the same text.

import { fill } from "./format.mjs";
import { zigbeeCopy } from "./zigbee-copy.mjs";
import { LAST_RESORT, advise } from "./zigbee-channel.mjs";

const list = (numbers) => numbers.join(", ");

export function zigbeeView(wifiChannels, lang = "da") {
  const copy = zigbeeCopy[lang].result;
  const advice = advise(wifiChannels);
  const values = { n: advice.best, mhz: advice.distance };
  const reasons = {
    none: copy.none,
    preferred: fill(copy.apart, values),
    other: fill(copy.other, values),
    // Channel 26 is held out, so say so when it is the one that is free.
    covered: fill(copy.inside, values) + (advice.free.includes(LAST_RESORT) ? ` ${copy.free26}` : ""),
  };
  const reason = reasons[advice.kind];
  return {
    advice,
    best: String(advice.best),
    reason,
    overlap: advice.overlap.length > 0 ? fill(copy.overlap, { list: list(advice.overlap) }) : copy.noOverlap,
    free: advice.free.length > 0 ? fill(copy.free, { list: list(advice.free) }) : copy.noFree,
    summary: fill(copy.summary, { wifi: advice.wifi.length > 0 ? list(advice.wifi) : copy.noWifi, n: advice.best }),
  };
}
