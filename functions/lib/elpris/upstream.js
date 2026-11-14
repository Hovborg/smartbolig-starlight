// Fetches the day-ahead prices from Energinet's Energi Data Service and keeps
// only what is known to be right. Licence: CC BY 4.0, credit "Energinet".

import { AREAS } from "./area.js";

export const STEP_SECONDS = 900;
export const MIN_POINTS = 24;
export const UPSTREAM_TIMEOUT_MS = 8_000;

// One call fetches both price areas. Energinet allows an anonymous caller one
// call a minute (measured 2026-11-14), so a call per area would refuse the
// second one. Two areas, two days and a 25-hour day are 392 rows at most.
const query = new URLSearchParams({
  start: "StartOfDay",
  filter: JSON.stringify({ PriceArea: AREAS }),
  columns: "TimeUTC,PriceArea,DayAheadPriceDKK",
  sort: "TimeUTC asc",
  limit: "500",
});
export const UPSTREAM_URL = `https://api.energidataservice.dk/dataset/DayAheadPrices?${query}`;

// Day-ahead prices are capped far below this; a larger number is a fault.
const MAX_ABS_PRICE = 100_000;
// 392 rows are about 40,000 characters. A much longer answer is not the prices.
const MAX_BODY_CHARS = 500_000;

/**
 * The rows of one area as [[epoch seconds, DKK per MWh with 2 decimals], ...].
 * A row is dropped when its time does not parse, is not on a quarter, does not
 * come after the row before it, or when its price is not a sane number.
 */
export function shapePoints(records, area) {
  const points = [];
  if (!Array.isArray(records)) return points;
  for (const record of records) {
    if (record?.PriceArea !== area || typeof record.TimeUTC !== "string") continue;
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(record.TimeUTC)) continue;
    const time = Date.parse(`${record.TimeUTC}Z`) / 1000;
    const price = record.DayAheadPriceDKK;
    if (!Number.isInteger(time) || time % STEP_SECONDS !== 0) continue;
    if (typeof price !== "number" || !Number.isFinite(price) || Math.abs(price) > MAX_ABS_PRICE) continue;
    if (points.length > 0 && time <= points.at(-1)[0]) continue;
    points.push([time, Math.round(price * 100) / 100]);
  }
  return points;
}

/**
 * { DK1: points, DK2: points } from one upstream call. An area with too few
 * good rows is left out. Throws when the call fails or times out; the caller
 * must never pass the error text on to a visitor.
 */
export async function fetchPrices({ fetch: fetcher = fetch, timeoutMs = UPSTREAM_TIMEOUT_MS } = {}) {
  const response = await fetcher(UPSTREAM_URL, {
    headers: { accept: "application/json", "user-agent": "smartbolig.net elpris (+https://smartbolig.net)" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    await response.body?.cancel();
    const error = new Error("upstream status");
    error.name = `UpstreamStatus${response.status}`;
    throw error;
  }
  const text = await response.text();
  if (text.length > MAX_BODY_CHARS) throw Object.assign(new Error("upstream body"), { name: "UpstreamTooLarge" });
  const records = JSON.parse(text)?.records;
  const areas = {};
  for (const area of AREAS) {
    const points = shapePoints(records, area);
    if (points.length >= MIN_POINTS) areas[area] = points;
  }
  return areas;
}
