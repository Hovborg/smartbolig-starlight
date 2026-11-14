// Which price area a request is about: the one it names, or a guess from where
// Cloudflare places the visitor.

export const AREAS = ["DK1", "DK2"];
export const DEFAULT_AREA = "DK1";

// Denmark's regions (ISO 3166-2:DK). The Great Belt divides the price areas:
// Zealand, the islands around it and Bornholm are DK2; Jutland and Funen are DK1.
const EAST_REGIONS = new Set(["84", "85"]); // Hovedstaden (with Bornholm), Sjælland

/** The price area for a Cloudflare `request.cf` object. Unknown places get DK1. */
export function guessArea(cf) {
  return cf?.country === "DK" && EAST_REGIONS.has(String(cf.regionCode)) ? "DK2" : DEFAULT_AREA;
}

/**
 * { area, guessed } for a request URL, or null when `area` is given but is not
 * exactly one price area. A wrong value is refused instead of guessed, so a
 * typing error never shows the other area's prices.
 */
export function resolveArea(url, cf) {
  const given = url.searchParams.getAll("area");
  if (given.length === 0) return { area: guessArea(cf), guessed: true };
  if (given.length === 1 && AREAS.includes(given[0])) return { area: given[0], guessed: false };
  return null;
}
