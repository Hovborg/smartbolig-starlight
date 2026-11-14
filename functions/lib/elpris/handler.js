// GET /api/elpris: today's and tomorrow's electricity prices for one price
// area. The visitor's browser asks this Worker, never Energinet, so Energinet
// does not see the visitor's IP address.

import { safeErrorName } from "../chat/runtime.js";
import { resolveArea } from "./area.js";
import { createPriceCache } from "./cache.js";
import { errorResponse, FRESH_SECONDS, pricesResponse } from "./responses.js";
import { fetchPrices, STEP_SECONDS } from "./upstream.js";

const isFresh = (prices, now) => now - Date.parse(prices.fetched) < FRESH_SECONDS * 1000;
// An old copy is still worth showing while it holds the price of this moment.
const coversNow = (prices, now) => prices.points.length > 0 && (prices.points.at(-1)[0] + STEP_SECONDS) * 1000 > now;

export function createElprisHandler(dependencies = {}) {
  const fetcher = dependencies.fetch;
  const openCache = dependencies.openCache || (() => globalThis.caches?.default);
  const now = dependencies.now || Date.now;
  const logger = dependencies.logger || console;
  const timeoutMs = dependencies.timeoutMs;

  return async function handleElpris(context) {
    const { request } = context;
    const method = request.method;
    if (method !== "GET" && method !== "HEAD") {
      return errorResponse("method_not_allowed", 405, { allow: "GET, HEAD" });
    }

    const url = new URL(request.url);
    const resolved = resolveArea(url, request.cf);
    if (!resolved) return errorResponse("invalid_area", 400);
    const { area, guessed } = resolved;

    const cache = createPriceCache(openCache(), url.origin);
    // The cache is written after the answer is sent; a failed write only costs a call.
    const later = (promise) => context.waitUntil?.(promise.catch(() => {}));

    const cached = await cache.read(area);
    if (cached && isFresh(cached, now())) return pricesResponse(cached, { guessed, method });

    if (!(await cache.isBackingOff())) {
      try {
        const areas = await fetchPrices({ fetch: fetcher, timeoutMs });
        const fetched = new Date(now()).toISOString();
        const all = Object.entries(areas).map(([name, points]) => ({ area: name, fetched, points }));
        later(Promise.all(all.map((prices) => cache.write(prices))));
        const prices = all.find((entry) => entry.area === area);
        if (prices) return pricesResponse(prices, { guessed, method });
        throw Object.assign(new Error("area missing"), { name: "UpstreamAreaMissing" });
      } catch (error) {
        logger.error?.("SmartBolig elpris upstream failed", { area, error: safeErrorName(error) });
        later(cache.startBackoff());
      }
    }

    if (cached && coversNow(cached, now())) return pricesResponse(cached, { guessed, stale: true, method });
    return errorResponse("upstream", 502);
  };
}
