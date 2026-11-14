// Which price area a request is about: the one it names, or a guess from where
// Cloudflare places the visitor.

export const AREAS = ["DK1", "DK2"];
export const DEFAULT_AREA = "DK1";

// Denmark's regions (ISO 3166-2:DK). The Great Belt divides the price areas:
// Zealand, the islands around it and Bornholm are DK2; Jutland and Funen are DK1.
const WEST_REGIONS = new Set(["81", "82", "83"]); // Nordjylland, Midtjylland, Syddanmark
const EAST_REGIONS = new Set(["84", "85"]); // Hovedstaden (with Bornholm), Sjælland

// Hovedstaden and Sjælland are to become one region on 2027-01-01, and its
// code is not known yet. A Danish visitor with any other region code is
// therefore placed by the map: east of the Great Belt is DK2, except Anholt
// and Læsø, which lie north of Zealand and belong to Jutland.
const BELT_LONGITUDE = 11;
const NORTH_OF_ZEALAND_LATITUDE = 56.3;

/** The price area for a Cloudflare `request.cf` object. Unknown places get DK1. */
export function guessArea(cf) {
  if (cf?.country !== "DK") return DEFAULT_AREA;
  const region = String(cf.regionCode ?? "");
  if (EAST_REGIONS.has(region)) return "DK2";
  if (WEST_REGIONS.has(region)) return DEFAULT_AREA;
  const east = Number.parseFloat(cf.longitude) >= BELT_LONGITUDE && Number.parseFloat(cf.latitude) < NORTH_OF_ZEALAND_LATITUDE;
  return east ? "DK2" : DEFAULT_AREA;
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
