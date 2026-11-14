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
 * Returns read(dateHeader, deviceNowMs): the seconds to add to the device
 * clock to get the real time, read from the answers' Date headers. A device
 * whose clock is an hour off would otherwise show the price of the wrong
 * quarter as "right now". An answer from the browser's cache carries an old
 * Date, which only makes the difference smaller, so the largest difference
 * seen is the one closest to the truth. 0 when the clocks agree to within a
 * quarter of an hour, or when no header could be read.
 */
export function createClockReader() {
  let largest = Number.NEGATIVE_INFINITY;
  return (dateHeader, deviceNowMs) => {
    const server = Date.parse(dateHeader ?? "");
    if (Number.isFinite(server)) largest = Math.max(largest, (server - deviceNowMs) / 1000);
    return Number.isFinite(largest) && Math.abs(largest) > CLOCK_TOLERANCE_SECONDS ? largest : 0;
  };
}

/** The same for one answer on its own. */
export const clockOffset = (dateHeader, deviceNowMs) => createClockReader()(dateHeader, deviceNowMs);

// One reader for the page: the homepage card and the tool never run together.
const readClock = createClockReader();

/**
 * The prices of `area`, or of the area the endpoint guesses when none is
 * given, with `clockOffset` added. Throws when the answer is not prices,
 * whatever the reason.
 */
export async function fetchPrices(area, signal) {
  const response = await fetch(area ? `${ENDPOINT}?area=${area}` : ENDPOINT, { signal });
  const data = response.ok ? await response.json() : null;
  if (!isPrices(data)) throw new Error("no prices");
  return { ...data, clockOffset: readClock(response.headers.get("date"), Date.now()) };
}
