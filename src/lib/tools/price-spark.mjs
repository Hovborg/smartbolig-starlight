// The small bar chart of one day's hours on the homepage. No DOM, so the
// geometry can be tested in Node. home-price.mjs draws what this returns.

import { hourOfDay } from "./format.mjs";
import { inRun } from "./price-chart.mjs";

const HOUR_SECONDS = 3600;
/** The drawing's box. The bars are stretched to the width of the card. */
export const SPARK = { width: 240, height: 64, gap: 2, minBar: 1.5 };
const round = (number) => Math.round(number * 100) / 100;

/**
 * One bar per hour: { x, y, width, height, state }. `state` is "now" for the
 * hour that contains `now`, "best" for the hours of the cheapest run, "past"
 * for hours that are over, otherwise "ahead". Negative prices hang below the
 * zero line.
 */
export function sparkBars(hours, { now, window = null } = {}) {
  if (hours.length === 0) return [];
  const values = hours.map((hour) => hour.value);
  const top = Math.max(...values, 0);
  const bottom = Math.min(...values, 0);
  const range = top - bottom || 1;
  const slot = SPARK.width / hours.length;
  const zero = (top / range) * SPARK.height;
  return hours.map((hour, index) => {
    const height = Math.max((Math.abs(hour.value) / range) * SPARK.height, SPARK.minBar);
    const isNow = hour.start <= now && now < hour.start + HOUR_SECONDS;
    const state = isNow ? "now" : inRun(hour.start, window) ? "best" : hour.start < now ? "past" : "ahead";
    const y = hour.value >= 0 ? Math.max(zero - height, 0) : Math.min(zero, SPARK.height - height);
    return { x: round(index * slot + SPARK.gap / 2), y: round(y), width: round(slot - SPARK.gap), height: round(height), state };
  });
}

/**
 * The clock hours to write under the bars: every sixth hour of the Danish
 * day as { label: "06", at } where `at` is the share of the width (0 to 1).
 * Read from the hours themselves, so a 23- or 25-hour day is still right.
 */
export function sparkTicks(hours, every = 6) {
  return hours
    .map((hour, index) => ({ hour: hourOfDay(hour.start), at: round(index / hours.length) }))
    .filter(({ hour }, index, all) => hour % every === 0 && all.findIndex((other) => other.hour === hour) === index)
    .map(({ hour, at }) => ({ label: String(hour).padStart(2, "0"), at }));
}
