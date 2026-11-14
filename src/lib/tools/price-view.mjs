// Everything the electricity price tool shows, as plain values and finished
// sentences. No DOM: price-ui.mjs only writes these into the page, so the
// wording and the numbers can be tested in Node.

import { dayKey, fill, formatDay, formatOre, formatPercent, formatTime, hourOfDay } from "./format.mjs";
import { cheapestWindow, currentPoint, hourly, level, STEP_SECONDS, toOre, windowAverage } from "./price-window.mjs";

const HOUR_SECONDS = 3600;
// The lowest and the highest of some hours. Of equal prices, the earliest hour.
const lowest = (hours) => hours.reduce((best, hour) => (hour.value < best.value ? hour : best));
const highest = (hours) => hours.reduce((best, hour) => (hour.value > best.value ? hour : best));
const hourSpan = (start) => ({ from: formatTime(start).slice(0, 2), to: formatTime(start + HOUR_SECONDS).slice(0, 2) });

/** "i nat", "i aften", "i dag" or "i morgen" for a start time, seen from now. */
export function dayWord(start, now, words) {
  const hour = hourOfDay(start);
  if (hour < 6) return words.tonight;
  if (dayKey(start) !== dayKey(now)) return words.tomorrow;
  return hour >= 18 ? words.evening : words.today;
}

/** The cheapest run and the sentence about it. `price` turns DKK/MWh into the øre shown. */
export function windowText({ points, now, minutes, price, lang, copy }) {
  const hours = fill(minutes === 60 ? copy.window.one : copy.window.other, { n: minutes / 60 });
  const best = cheapestWindow(points, now, minutes);
  if (!best) return { window: null, text: fill(copy.window.none, { hours }) };

  const average = formatOre(price(best.average), lang);
  const current = currentPoint(points, now);
  if (current && best.start === current[0]) {
    return { window: best, text: fill(copy.window.startNow, { price: average, time: formatTime(best.end) }) };
  }
  const parts = [
    fill(copy.window.start, { time: formatTime(best.start), day: dayWord(best.start, now, copy.days) }),
    fill(copy.window.end, { time: formatTime(best.end) }),
    fill(copy.window.average, { price: average }),
  ];
  // Compared with starting now, when the known prices reach that far.
  const fromNow = current ? windowAverage(points, current[0], minutes) : null;
  if (fromNow !== null) {
    const [cheapest, startingNow] = [price(best.average), price(fromNow)];
    // A share only says something between two prices above zero: against a
    // negative price it passes 100 %. Otherwise the difference is given in øre.
    if (cheapest > 0 && startingNow > 0) {
      const share = 1 - cheapest / startingNow;
      if (share >= 0.005) parts.push(fill(copy.window.saving, { share: formatPercent(share, lang) }));
    } else if (startingNow - cheapest >= 0.05) {
      parts.push(fill(copy.window.savingOre, { amount: formatOre(startingNow - cheapest, lang) }));
    }
  }
  return { window: best, text: parts.join(" ") };
}

/** The hours of the chart, grouped by Danish calendar day. */
function daysOf(hours, now, lang, copy) {
  const today = dayKey(now);
  const days = [];
  hours.forEach((hour, index) => {
    const key = dayKey(hour.start);
    if (days.at(-1)?.key === key) return;
    const word = key === today ? copy.chart.today : days.at(-1)?.key === today ? copy.chart.tomorrow : null;
    const date = formatDay(hour.start, lang);
    days.push({ key, word, date, name: word ? `${word}, ${date}` : date, firstIndex: index });
  });
  return days;
}

/**
 * `points` are the quarters from /api/elpris, `now` is epoch seconds.
 * `vat` and `addOn` are the visitor's settings, `runHours` the length of the
 * run to find.
 */
export function priceView({ points, area, now, vat = true, addOn = 0, runHours = 3, lang = "da", copy }) {
  const price = (raw) => toOre(raw, { vat, addOn });
  const hours = hourly(points).map((hour) => ({ start: hour.start, value: price(hour.value), ...hourSpan(hour.start) }));
  const days = daysOf(hours, now, lang, copy);
  const today = hours.filter((hour) => dayKey(hour.start) === dayKey(now));
  const values = hours.map((hour) => hour.value);

  const current = currentPoint(points, now);
  const nowValue = current ? price(current[1]) : null;
  const span = current ? { from: formatTime(current[0]), to: formatTime(current[0] + STEP_SECONDS) } : null;

  const stat = (label, hour) => ({ label, value: formatOre(hour.value, lang), at: fill(copy.stats.at, hour) });
  const stats = today.length === 0 ? [] : [
    stat(copy.stats.min, lowest(today)),
    stat(copy.stats.max, highest(today)),
    { label: copy.stats.mean, value: formatOre(today.reduce((sum, hour) => sum + hour.value, 0) / today.length, lang), at: "" },
  ];

  const run = windowText({ points, now, minutes: runHours * 60, price, lang, copy });
  const summary = hours.length === 0 ? "" : fill(copy.chart.summary, {
    area,
    days: days.map((day) => day.date).join(", "),
    min: formatOre(lowest(hours).value, lang),
    minAt: fill(copy.stats.at, lowest(hours)),
    max: formatOre(highest(hours).value, lang),
    maxAt: fill(copy.stats.at, highest(hours)),
  });

  return {
    now: nowValue === null ? null : {
      value: nowValue,
      period: fill(copy.now.period, span),
      level: level(nowValue, values),
    },
    stats,
    hours,
    days,
    window: run.window,
    windowText: run.text,
    // Tomorrow's prices are published between 13:00 and 14:00; before that only today is known.
    pending: !days.some((day) => day.key > dayKey(now)),
    summary,
  };
}
