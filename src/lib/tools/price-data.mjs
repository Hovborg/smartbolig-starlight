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

/**
 * The prices of `area`, or of the area the endpoint guesses when none is
 * given. Throws when the answer is not prices, whatever the reason.
 */
export async function fetchPrices(area, signal) {
  const response = await fetch(area ? `${ENDPOINT}?area=${area}` : ENDPOINT, { signal });
  const data = response.ok ? await response.json() : null;
  if (!isPrices(data)) throw new Error("no prices");
  return data;
}
