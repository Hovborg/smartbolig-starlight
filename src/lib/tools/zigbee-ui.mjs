// Wires the Zigbee channel picker (ZigbeeChannel.astro) to its calculation.
// Everything happens in the browser; nothing is fetched or stored.

import { part, setText } from "./dom.mjs";
import { COMMON_WIFI_CHANNELS } from "./zigbee-channel.mjs";
import { zigbeeView } from "./zigbee-view.mjs";

export function startZigbeeTool(root) {
  const lang = root.dataset.lang === "en" ? "en" : "da";
  const chips = [...root.querySelectorAll("[data-wifi-chip]")];
  const wifiBars = [...root.querySelectorAll("[data-wifi]")];
  const zigbeeMarks = [...root.querySelectorAll("[data-zigbee]")];
  const picked = new Set();

  function render() {
    const view = zigbeeView([...picked], lang);
    for (const chip of chips) chip.setAttribute("aria-pressed", String(picked.has(Number(chip.dataset.wifiChip))));
    for (const bar of wifiBars) bar.classList.toggle("is-picked", picked.has(Number(bar.dataset.wifi)));
    for (const mark of zigbeeMarks) {
      const channel = Number(mark.dataset.zigbee);
      mark.classList.toggle("is-overlap", view.advice.overlap.includes(channel));
      mark.classList.toggle("is-best", channel === view.advice.best);
    }
    setText(part(root, "best"), view.best);
    setText(part(root, "reason"), view.reason);
    setText(part(root, "overlap"), view.overlap);
    setText(part(root, "free"), view.free);
    setText(part(root, "summary"), view.summary);
  }

  for (const chip of chips) {
    chip.addEventListener("click", () => {
      const channel = Number(chip.dataset.wifiChip);
      if (picked.has(channel)) picked.delete(channel);
      else picked.add(channel);
      render();
    });
  }
  part(root, "common").addEventListener("click", () => {
    picked.clear();
    for (const channel of COMMON_WIFI_CHANNELS) picked.add(channel);
    render();
  });
  part(root, "clear").addEventListener("click", () => {
    picked.clear();
    render();
  });
  render();
}
