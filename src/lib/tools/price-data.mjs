// Fetching the prices from the site's own endpoint, for the electricity price
// tool and the homepage. The browser never asks Energinet.

export const ENDPOINT = "/api/elpris";
/** Prices older than this are fetched again. The endpoint keeps its copy as long. */
export const REFRESH_SECONDS = 600;

/** Is this an answer the code can draw: a known area and a list of [time, price]? */
export const isPrices = (data) =>
  (data?.area === "DK1" || data?.area === "DK2") &&
  Array.isArray(data.points) &&
  data.points.length > 0 &&
  data.points.every((point) => Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1]));

// A browser may hand back an answer that is up to REFRESH_SECONDS old, so a
// smaller difference between the two clocks says nothing.
const CLOCK_TOLERANCE_SECONDS = 900;

/**
 * Seconds to add to the device clock to get the real time, read from the
 * answer's Date header. A device whose clock is an hour off would otherwise
 * show the price of the wrong quarter as "right now". 0 when the clocks agree
 * to within a quarter of an hour, or when the header cannot be read.
 */
export function clockOffset(dateHeader, deviceNowMs) {
  const server = Date.parse(dateHeader ?? "");
  if (!Number.isFinite(server)) return 0;
  const offset = (server - deviceNowMs) / 1000;
  return Math.abs(offset) > CLOCK_TOLERANCE_SECONDS ? offset : 0;
}

/**
 * The prices of `area`, or of the area the endpoint guesses when none is
 * given, with `clockOffset` added. Throws when the answer is not prices,
 * whatever the reason.
 */
export async function fetchPrices(area, signal) {
  const response = await fetch(area ? `${ENDPOINT}?area=${area}` : ENDPOINT, { signal });
  const data = response.ok ? await response.json() : null;
  if (!isPrices(data)) throw new Error("no prices");
  return { ...data, clockOffset: clockOffset(response.headers.get("date"), Date.now()) };
}
