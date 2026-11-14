// Turns hourly prices into the geometry of a bar chart: where each bar, grid
// line and mark goes, in pixels. No DOM, so it is tested in Node; the drawing
// is done by price-chart-dom.mjs.

const HOUR_SECONDS = 3600;

/** A scale from 0 (or the lowest negative value) to above `max`, in round steps. */
export function niceScale(min, max, target = 4) {
  const low = Math.min(0, min);
  const high = Math.max(max, low + 1);
  const rough = (high - low) / target;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].find((factor) => factor * power >= rough) * power;
  const scaleMin = Math.floor(low / step) * step;
  const scaleMax = Math.ceil(high / step) * step;
  const ticks = [];
  for (let i = 0; scaleMin + i * step <= scaleMax + step / 1000; i += 1) {
    ticks.push(Number((scaleMin + i * step).toFixed(6)));
  }
  return { min: scaleMin, max: scaleMax, step, ticks };
}

/** An hour belongs to the run when at least half of it is inside. */
export function inRun(hourStart, run) {
  if (!run) return false;
  const overlap = Math.min(hourStart + HOUR_SECONDS, run.end) - Math.max(hourStart, run.start);
  return overlap >= HOUR_SECONDS / 2;
}

/**
 * `hours` is [{ start, value }] in time order. `slot` is the width one hour
 * gets and `pad` the empty room at each side, so the first and last hour
 * label are not cut. `now` and `window` ({ start, end }) are epoch seconds;
 * both may be left out. Returns sizes, grid ticks, bars and the band of the window.
 */
export function chartGeometry(hours, { slot = 14, pad = 0, plotHeight = 184, top = 46, bottom = 50, now, window } = {}) {
  const values = hours.map((hour) => hour.value);
  const scale = niceScale(Math.min(0, ...values), Math.max(0, ...values));
  const yAt = (value) => top + ((scale.max - value) / (scale.max - scale.min)) * plotHeight;
  const zeroY = yAt(0);
  // A position in time: inside the hour that holds it, by the minute.
  const xAt = (time) => {
    const index = hours.findIndex((hour) => time < hour.start + HOUR_SECONDS);
    if (index < 0) return pad + hours.length * slot;
    const into = Math.max(0, time - hours[index].start) / HOUR_SECONDS;
    return pad + (index + into) * slot;
  };
  const gap = Math.min(6, Math.max(2, Math.round(slot * 0.24)));

  const bars = hours.map((hour, index) => {
    const end = hour.start + HOUR_SECONDS;
    const y = yAt(hour.value);
    return {
      index,
      start: hour.start,
      value: hour.value,
      x: pad + index * slot + gap / 2,
      width: slot - gap,
      y: Math.min(y, zeroY),
      // A price of zero still gets a line, so the hour does not look empty.
      height: Math.max(1, Math.abs(zeroY - y)),
      state: now === undefined || now < hour.start ? "next" : now < end ? "now" : "past",
      best: inRun(hour.start, window),
    };
  });

  const band = window && hours.length > 0 && window.end > hours[0].start
    ? { x: xAt(window.start), width: Math.max(0, xAt(window.end) - xAt(window.start)) }
    : null;

  return {
    width: hours.length * slot + pad * 2,
    left: pad,
    height: top + plotHeight + bottom,
    plotTop: top,
    plotBottom: top + plotHeight,
    slot,
    zeroY,
    ticks: scale.ticks.map((value) => ({ value, y: yAt(value) })),
    bars,
    band,
  };
}

/** One day of hours, also the 25 of the day the clocks go back. */
const DAY_HOURS = 25;

/**
 * The width one hour gets: the room there is (without the side padding).
 * One day is squeezed to fit a phone, so today is seen at a glance; two days
 * keep bars wide enough to point at, and the plot scrolls instead.
 */
export function slotWidth(roomWidth, hourCount, minSlot = hourCount > DAY_HOURS ? 12 : 7) {
  if (hourCount < 1) return minSlot;
  return Math.max(minSlot, Math.floor(roomWidth / hourCount));
}
