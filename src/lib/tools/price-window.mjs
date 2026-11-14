// Calculations for the electricity price tool. No DOM, so it runs in Node tests.
// A point is [start in epoch seconds, price in DKK per MWh] and covers one
// quarter of an hour, as /api/elpris delivers them.

export const STEP_SECONDS = 900;
const HOUR_SECONDS = 3600;
const VAT = 1.25;

/**
 * DKK per MWh to øre per kWh. `addOn` is øre/kWh without VAT (tax and grid
 * tariff the visitor typed); VAT is put on the sum, as on an electricity bill.
 */
export function toOre(dkkPerMwh, { vat = true, addOn = 0 } = {}) {
  return (dkkPerMwh / 10 + addOn) * (vat ? VAT : 1);
}

/**
 * The mean of the quarters in each clock hour: [{ start, value, count }].
 * Danish time is always a whole number of hours from UTC, so a UTC hour is
 * also a Danish clock hour. The day the clocks change has 23 or 25 of them.
 */
export function hourly(points) {
  const hours = new Map();
  for (const [time, value] of points) {
    const start = Math.floor(time / HOUR_SECONDS) * HOUR_SECONDS;
    const hour = hours.get(start) ?? { start, sum: 0, count: 0 };
    hour.sum += value;
    hour.count += 1;
    hours.set(start, hour);
  }
  return [...hours.values()]
    .sort((a, b) => a.start - b.start)
    .map(({ start, sum, count }) => ({ start, value: sum / count, count }));
}

/** The quarter that contains `nowEpoch`, or null when the data does not cover it. */
export function currentPoint(points, nowEpoch) {
  return points.find(([time]) => time <= nowEpoch && nowEpoch < time + STEP_SECONDS) ?? null;
}

/**
 * The mean price of the window that starts with the quarter at `startEpoch`
 * and lasts `minutes`, or null when a quarter in it is missing.
 */
export function windowAverage(points, startEpoch, minutes) {
  const steps = Math.round((minutes * 60) / STEP_SECONDS);
  const first = points.findIndex(([time]) => time === startEpoch);
  if (first < 0 || steps < 1 || first + steps > points.length) return null;
  let sum = 0;
  for (let i = 0; i < steps; i += 1) {
    const [time, value] = points[first + i];
    if (time !== startEpoch + i * STEP_SECONDS) return null;
    sum += value;
  }
  return sum / steps;
}

/**
 * The cheapest run of `minutes` that has not started yet: { start, end, average }.
 * The run may start with any quarter from the one `fromEpoch` is in (that is
 * "start now"). Only runs that lie entirely inside the data count, so the
 * answer is null when the remaining data is shorter than the run.
 */
export function cheapestWindow(points, fromEpoch, minutes) {
  const steps = Math.round((minutes * 60) / STEP_SECONDS);
  if (steps < 1) return null;
  let best = null;
  let sum = 0;
  let run = 0; // how many quarters in a row end at this one, without a hole
  for (let i = 0; i < points.length; i += 1) {
    const [time, value] = points[i];
    const follows = i > 0 && time === points[i - 1][0] + STEP_SECONDS;
    run = follows ? run + 1 : 1;
    sum = follows ? sum + value : value;
    if (run > steps) {
      sum -= points[i - steps][1];
      run = steps;
    }
    const start = time - (steps - 1) * STEP_SECONDS;
    if (run === steps && start + STEP_SECONDS > fromEpoch) {
      const average = sum / steps;
      // Rounding keeps two equal runs equal, so the earliest one wins.
      if (!best || average < best.average - 1e-9) best = { start, end: time + STEP_SECONDS, average };
    }
  }
  return best;
}

/**
 * Where a value lies among the values shown: "low" in the cheapest third,
 * "high" in the dearest third, otherwise "mid". Equal prices are all "mid".
 */
export function level(value, values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length < 3 || !Number.isFinite(value)) return "mid";
  const at = (share) => {
    const position = (sorted.length - 1) * share;
    const below = Math.floor(position);
    const above = Math.min(below + 1, sorted.length - 1);
    return sorted[below] + (sorted[above] - sorted[below]) * (position - below);
  };
  if (value < at(1 / 3)) return "low";
  if (value > at(2 / 3)) return "high";
  return "mid";
}
