// Draws the price chart as SVG from the geometry in price-chart.mjs. One SVG
// unit is one CSS pixel. Everything is built with DOM calls (dom.mjs).

import { fill, formatNumber, formatOre } from "./format.mjs";
import { svgEl } from "./dom.mjs";

export const AXIS_WIDTH = 44;
/** Empty room at each side of the plot, so the first and last hour label are not cut. */
export const PLOT_PAD = 10;
// The "now" mark has a row of its own under the hour labels, so it never hides one.
const PILL_WIDTH = 38;
const PILL_HEIGHT = 20;
const LABEL_ROW = 16;
const PILL_ROW = 27;
// An hour label under every third hour, or every sixth when the bars are thin.
const labelEvery = (slot) => (slot >= 10 ? 3 : 6);

export function setSize(svg, width, height) {
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
}

/** The value axis: one number per grid line, right-aligned next to the plot. */
export function drawAxis(svg, geometry, lang) {
  setSize(svg, AXIS_WIDTH, geometry.height);
  const digits = geometry.ticks.some((tick) => !Number.isInteger(tick.value)) ? 1 : 0;
  svg.replaceChildren(
    ...geometry.ticks.map((tick) =>
      svgEl("text", { x: AXIS_WIDTH - 8, y: tick.y, "text-anchor": "end", "dominant-baseline": "middle" }, formatNumber(tick.value, lang, digits)),
    ),
  );
}

/** What a bar says when it is pointed at or read: "I dag kl. 09–10: 187,9 øre/kWh i gennemsnit". */
export function barLabel(hour, view, lang, copy) {
  const day = [...view.days].reverse().find((entry) => hour.start >= view.hours[entry.firstIndex].start);
  return fill(copy.chart.readout, { day: day?.word ?? day?.date ?? "", from: hour.from, to: hour.to, price: formatOre(hour.value, lang) }).trim();
}

/**
 * The plot: band of the cheapest run, grid, day marks, bars, hour labels and
 * the "now" mark. `animate` lets the bars rise once, on the first drawing.
 */
export function drawPlot(svg, { geometry, view, lang, copy, animate }) {
  const { width, height, plotTop, plotBottom, slot, left, bars, band } = geometry;
  setSize(svg, width, height);
  svg.setAttribute("aria-label", view.summary);
  svg.classList.toggle("is-entering", Boolean(animate));
  const nodes = [svgEl("title", {}, view.summary)];

  if (band && band.width > 0) {
    nodes.push(svgEl("rect", { class: "sb-tool-chart__band", x: band.x, y: plotTop - 4, width: band.width, height: plotBottom - plotTop + 4, rx: 4 }));
  }
  for (const tick of geometry.ticks) {
    const y = Math.round(tick.y) + 0.5;
    nodes.push(svgEl("line", { class: `sb-tool-chart__grid${tick.value === 0 ? " sb-tool-chart__grid--zero" : ""}`, x1: 0, x2: width, y1: y, y2: y }));
  }
  view.days.forEach((day, index) => {
    const x = left + day.firstIndex * slot;
    const next = view.days[index + 1];
    if (index > 0) nodes.push(svgEl("line", { class: "sb-tool-chart__day-line", x1: x + 0.5, x2: x + 0.5, y1: 4, y2: plotBottom }));
    // data-from and data-to: the room the day has, for the name that follows a scrolling plot.
    const from = x + (index > 0 ? 8 : 0);
    nodes.push(svgEl("text", { class: "sb-tool-chart__day", x: from, y: 14, "data-from": from, "data-to": next ? left + next.firstIndex * slot : width }, day.name));
  });

  for (const bar of bars) {
    const classes = ["sb-tool-chart__bar", `is-${bar.state}`, bar.best ? "is-best" : ""].join(" ").trim();
    const rect = svgEl("rect", { class: classes, x: bar.x, y: bar.y, width: bar.width, height: bar.height, rx: Math.min(3, bar.width / 2), "data-index": bar.index }, [
      svgEl("title", {}, barLabel(view.hours[bar.index], view, lang, copy)),
    ]);
    rect.style.setProperty("--i", String(bar.index));
    nodes.push(rect);
    if (Number(view.hours[bar.index].from) % labelEvery(slot) === 0) {
      nodes.push(svgEl("text", { x: bar.x + bar.width / 2, y: plotBottom + LABEL_ROW, "text-anchor": "middle" }, view.hours[bar.index].from));
    }
  }

  if (band && band.width > 0) {
    // Kept inside the plot, also when the run is at one of its edges.
    const x = Math.min(Math.max(band.x + band.width / 2, 30), Math.max(30, width - 30));
    nodes.push(svgEl("text", { class: "sb-tool-chart__best", x, y: plotTop - 11, "text-anchor": "middle" }, copy.chart.best));
  }
  const nowBar = bars.find((bar) => bar.state === "now");
  if (nowBar) {
    const centre = nowBar.x + nowBar.width / 2;
    const x = Math.min(Math.max(centre - PILL_WIDTH / 2, 0), Math.max(0, width - PILL_WIDTH));
    const y = plotBottom + PILL_ROW;
    nodes.push(
      // A small point on the mark shows which bar it belongs to.
      svgEl("path", { class: "sb-tool-chart__pill", d: `M${centre - 5} ${y + 1}L${centre} ${y - 4}L${centre + 5} ${y + 1}Z` }),
      svgEl("rect", { class: "sb-tool-chart__pill", x, y, width: PILL_WIDTH, height: PILL_HEIGHT, rx: PILL_HEIGHT / 2 }),
      svgEl("text", { class: "sb-tool-chart__pill-text", x: x + PILL_WIDTH / 2, y: y + PILL_HEIGHT / 2 + 1, "text-anchor": "middle", "dominant-baseline": "middle" }, copy.chart.now),
    );
  }
  svg.replaceChildren(...nodes);
}
