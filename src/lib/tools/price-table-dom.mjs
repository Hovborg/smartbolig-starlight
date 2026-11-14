// The price chart as a table: the text alternative for people who cannot see
// or use the chart. One row per hour, one group of rows per day.

import { fill, formatNumber } from "./format.mjs";
import { el } from "./dom.mjs";
import { inRun } from "./price-chart.mjs";

const HOUR_SECONDS = 3600;

export function drawTable(table, { view, area, now, lang, copy }) {
  const groups = view.days.map((day, index) => {
    const end = view.days[index + 1]?.firstIndex ?? view.hours.length;
    const rows = view.hours.slice(day.firstIndex, end).map((hour) => {
      const isNow = hour.start <= now && now < hour.start + HOUR_SECONDS;
      const marks = [isNow ? copy.chart.rowNow : "", inRun(hour.start, view.window) ? copy.chart.rowBest : ""].filter(Boolean).join(", ");
      return el("tr", {}, [
        el("td", {}, [`${hour.from}–${hour.to}`, marks && el("small", {}, marks)]),
        el("td", {}, formatNumber(hour.value, lang, 1)),
      ]);
    });
    return el("tbody", {}, [el("tr", {}, el("th", { colspan: 2, scope: "rowgroup" }, day.name)), ...rows]);
  });

  table.replaceChildren(
    el("caption", {}, fill(copy.chart.caption, { area })),
    el("thead", {}, el("tr", {}, [el("th", { scope: "col" }, copy.chart.hour), el("th", { scope: "col" }, copy.chart.price)])),
    ...groups,
  );
}
