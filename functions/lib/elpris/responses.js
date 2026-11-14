// The responses /api/elpris can give. Error bodies are fixed words: nothing
// from the upstream service is ever passed on.

export const SOURCE = "Energinet (www.energidataservice.dk)";
export const LICENSE = "CC BY 4.0";
export const FRESH_SECONDS = 600;

const BASE_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
};

function json(body, status, headers, method) {
  // A HEAD request gets the headers of the answer without its body.
  return new Response(method === "HEAD" ? null : JSON.stringify(body), {
    status,
    headers: { ...BASE_HEADERS, ...headers },
  });
}

/**
 * The prices of one area. `prices` is { area, fetched, points } as kept in the
 * cache. A guessed area depends on where the visitor is, so only the visitor's
 * own browser may keep that answer; a named area is the same for everyone.
 */
export function pricesResponse(prices, { guessed, stale = false, method = "GET" }) {
  const body = {
    area: prices.area,
    areaGuessed: guessed,
    source: SOURCE,
    license: LICENSE,
    fetched: prices.fetched,
    stepMinutes: 15,
    points: prices.points,
    // Only on an old copy served while Energinet cannot be reached.
    ...(stale ? { stale: true } : {}),
  };
  // An old copy is asked for again soon, so new prices show up when the source is back.
  const maxAge = stale ? 60 : FRESH_SECONDS;
  return json(body, 200, { "cache-control": `${guessed ? "private" : "public"}, max-age=${maxAge}` }, method);
}

export function errorResponse(code, status, headers = {}, method = "GET") {
  return json({ error: code }, status, { "cache-control": "no-store", ...headers }, method);
}
