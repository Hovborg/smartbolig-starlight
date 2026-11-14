// The live part of the price chart: fits the bars to the room there is, lets
// the plot scroll on narrow screens and names the hour under the pointer.

import { part, setText, show } from "./dom.mjs";
import { chartGeometry, slotWidth } from "./price-chart.mjs";
import { AXIS_WIDTH, barLabel, drawAxis, drawPlot, PLOT_PAD, setSize } from "./price-chart-dom.mjs";

/** `clock` gives the time in epoch seconds. Returns { draw(view) }. */
export function createPriceChart(root, { lang, copy, clock }) {
  const scroll = part(root, "scroll");
  const plot = part(root, "plot");
  let view = null;
  let geometry = null;
  let drawn = false;
  // An SVG without a size is 300 x 150: on a phone the axis would take the
  // whole card and leave the plot no room to be measured.
  setSize(part(root, "axis"), AXIS_WIDTH, 1);
  setSize(plot, 1, 1);

  // The line under the chart: the hour pointed at, or the current hour.
  function readout(index) {
    if (!view || view.hours.length === 0) return;
    const current = geometry.bars.find((bar) => bar.state === "now")?.index ?? 0;
    setText(part(root, "readout"), barLabel(view.hours[index ?? current], view, lang, copy));
    for (const bar of plot.querySelectorAll(".is-active")) bar.classList.remove("is-active");
    if (index !== undefined) plot.querySelector(`[data-index="${index}"]`)?.classList.add("is-active");
  }

  // In a plot that scrolls, the name of the day stays in view until the next
  // day pushes it out. Otherwise a phone shows half a date, or none.
  function pinDays() {
    for (const label of plot.querySelectorAll(".sb-tool-chart__day")) {
      const last = Number(label.dataset.to) - label.getComputedTextLength() - 8;
      label.setAttribute("x", Math.max(Number(label.dataset.from), Math.min(scroll.scrollLeft + 4, last)));
    }
  }
  scroll.addEventListener("scroll", pinDays, { passive: true });

  function draw(next = view) {
    view = next;
    const room = scroll.clientWidth;
    // Without a view or a size (a closed tab panel, for example) there is nothing to draw yet.
    if (!view || room === 0) return;
    geometry = chartGeometry(view.hours, { slot: slotWidth(room - PLOT_PAD * 2, view.hours.length), pad: PLOT_PAD, now: clock(), window: view.window ?? undefined });
    drawAxis(part(root, "axis"), geometry, lang);
    drawPlot(plot, { geometry, view, lang, copy, animate: !drawn });

    // Like the site's wide tables: only a plot that scrolls is a stop for the keyboard.
    const scrolls = geometry.width > room + 1;
    show(part(root, "scroll-hint"), scrolls);
    for (const [name, value] of [["tabindex", "0"], ["role", "region"], ["aria-label", copy.chart.region]]) {
      if (scrolls) scroll.setAttribute(name, value);
      else scroll.removeAttribute(name);
    }
    if (!drawn && scrolls) {
      // Start with the current hour in view, a little in from the left edge.
      const current = geometry.bars.find((bar) => bar.state === "now");
      if (current) scroll.scrollLeft = Math.max(0, current.x - room * 0.25);
    }
    pinDays();
    drawn = true;
    readout();
  }

  const point = (event) => {
    if (!geometry) return;
    const x = event.clientX - plot.getBoundingClientRect().left;
    readout(Math.min(geometry.bars.length - 1, Math.max(0, Math.floor((x - geometry.left) / geometry.slot))));
  };
  plot.addEventListener("pointermove", point);
  plot.addEventListener("pointerdown", point);
  plot.addEventListener("pointerleave", () => readout());

  // The bars are drawn in pixels, so a new width needs a new drawing.
  if (typeof ResizeObserver === "function") {
    let width = scroll.clientWidth;
    new ResizeObserver(() => {
      if (scroll.clientWidth === width) return;
      width = scroll.clientWidth;
      draw();
    }).observe(scroll);
  }

  return { draw };
}
