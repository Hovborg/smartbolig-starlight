// The Worker's own cache (the Cache API) around the upstream prices: one copy
// per price area, and a mark that says "the last call failed, wait".

// A copy is kept long after it stops being fresh, so it can be served when
// Energinet is down. Prices reach at most a day and a half ahead.
const KEEP_SECONDS = 172_800;
// Energinet asks a refused caller to wait up to a minute.
export const BACKOFF_SECONDS = 60;

const stored = (body, maxAge) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", "cache-control": `public, max-age=${maxAge}` },
  });

/**
 * `cache` is caches.default (or nothing, where there is no Cache API: then
 * every call goes upstream). The keys hold the area and nothing from the
 * visitor's request, so a query string can never get past the cache.
 */
export function createPriceCache(cache, origin) {
  const key = (name) => new Request(new URL(`/api/elpris/cache/${name}`, origin).href);
  return {
    /** { area, fetched, points } or null. A copy that cannot be read counts as missing. */
    async read(area) {
      try {
        const hit = await cache?.match(key(area));
        const prices = hit ? await hit.json() : null;
        const valid = prices?.area === area && typeof prices.fetched === "string" && Array.isArray(prices.points);
        return valid ? prices : null;
      } catch {
        return null;
      }
    },
    async write(prices) {
      await cache?.put(key(prices.area), stored(prices, KEEP_SECONDS));
    },
    async isBackingOff() {
      try {
        return Boolean(await cache?.match(key("backoff")));
      } catch {
        return false;
      }
    },
    async startBackoff() {
      await cache?.put(key("backoff"), stored({ backoff: true }, BACKOFF_SECONDS));
    },
  };
}
