// Fetches the day-ahead prices from Energinet's Energi Data Service and keeps
// only what is known to be right. Licence: CC BY 4.0, credit "Energinet".

import { AREAS } from "./area.js";

export const STEP_SECONDS = 900;
export const MIN_POINTS = 24;
export const UPSTREAM_TIMEOUT_MS = 8_000;

// One call fetches both price areas. Two areas, two days and a 25-hour day
// are 392 rows at most.
const query = {
  start: "StartOfDay",
  filter: JSON.stringify({ PriceArea: AREAS }),
  columns: "TimeUTC,PriceArea,DayAheadPriceDKK",
  sort: "TimeUTC asc",
  limit: "500",
};
const DATASET = "https://api.energidataservice.dk/dataset/DayAheadPrices";

// Energinet has two addresses for the same rows, each with its own limit.
// The dataset address allows an anonymous caller one call a minute per IP
// address, and a Worker shares its address with every other Worker: measured
// from Cloudflare 2026-11-14 it answered 429 every time (14 of 14), while the
// download address answered 200 every time (15 of 15). The download address
// is asked first; the dataset address is the reserve. A call per area would
// double the calls, so both areas come in one.
export const UPSTREAM_URLS = [
  `${DATASET}/download?${new URLSearchParams({ format: "json", ...query })}`,
  `${DATASET}?${new URLSearchParams(query)}`,
];
/** The address asked first. */
export const UPSTREAM_URL = UPSTREAM_URLS[0];

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

/** One address's answer as { DK1: points, DK2: points }. Throws when it holds no area. */
async function readOne(url, fetcher, signal) {
  const response = await fetcher(url, {
    headers: { accept: "application/json", "user-agent": "smartbolig.net elpris (+https://smartbolig.net)" },
    signal,
  });
  if (!response.ok) {
    await response.body?.cancel();
    const error = new Error("upstream status");
    error.name = `UpstreamStatus${response.status}`;
    throw error;
  }
  const text = await response.text();
  if (text.length > MAX_BODY_CHARS) throw Object.assign(new Error("upstream body"), { name: "UpstreamTooLarge" });
  // The download address answers with the rows themselves, the dataset address with { records }.
  const parsed = JSON.parse(text);
  const records = Array.isArray(parsed) ? parsed : parsed?.records;
  const areas = {};
  for (const area of AREAS) {
    const points = shapePoints(records, area);
    if (points.length >= MIN_POINTS) areas[area] = points;
  }
  if (Object.keys(areas).length === 0) throw Object.assign(new Error("upstream rows"), { name: "UpstreamEmpty" });
  return areas;
}

/**
 * The first address that answers with prices. When none does, the fault of
 * the first address is the one thrown: it is the address that should work.
 */
async function readAreas(fetcher, signal) {
  let fault;
  for (const url of UPSTREAM_URLS) {
    try {
      return await readOne(url, fetcher, signal);
    } catch (error) {
      fault ??= error;
      // When the time is up there is none left for the reserve.
      if (signal.aborted) break;
    }
  }
  throw fault;
}

/**
 * { DK1: points, DK2: points } from one upstream call. An area with too few
 * good rows is left out. Throws when the call fails or times out; the caller
 * must never pass the error text on to a visitor.
 */
export async function fetchPrices({ fetch: fetcher = fetch, timeoutMs = UPSTREAM_TIMEOUT_MS } = {}) {
  const abort = new AbortController();
  let timer;
  // The call ends when the time is up, also when a fetch does not answer its signal.
  const timeUp = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new DOMException("upstream timeout", "TimeoutError");
      abort.abort(error);
      reject(error);
    }, timeoutMs);
  });
  const reading = readAreas(fetcher, abort.signal);
  // When the time runs out first, no one waits for a later fault of the call itself.
  reading.catch(() => {});
  try {
    return await Promise.race([reading, timeUp]);
  } finally {
    clearTimeout(timer);
  }
}
