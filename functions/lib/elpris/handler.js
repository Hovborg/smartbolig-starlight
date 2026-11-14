// GET /api/elpris: today's and tomorrow's electricity prices for one price
// area. The visitor's browser asks this Worker, never Energinet, so Energinet
// does not see the visitor's IP address.

import { safeErrorName } from "../chat/runtime.js";
import { resolveArea } from "./area.js";
import { createPriceCache } from "./cache.js";
import { createMemory } from "./memory.js";
import { errorResponse, FRESH_SECONDS, pricesResponse } from "./responses.js";
import { fetchPrices, STEP_SECONDS } from "./upstream.js";

// How long a request with nothing to show waits for another request's call.
const WAIT_MS = 3_000;
const WAIT_STEP_MS = 100;

const isFresh = (prices, now) => now - Date.parse(prices.fetched) < FRESH_SECONDS * 1000;
// An old copy is still worth showing while it holds the price of this moment.
const coversNow = (prices, now) => prices.points.length > 0 && (prices.points.at(-1)[0] + STEP_SECONDS) * 1000 > now;
const newest = (a, b) => (!a ? b : !b ? a : Date.parse(b.fetched) > Date.parse(a.fetched) ? b : a);

export function createElprisHandler(dependencies = {}) {
  const fetcher = dependencies.fetch;
  const openCache = dependencies.openCache || (() => globalThis.caches?.default);
  const now = dependencies.now || Date.now;
  const logger = dependencies.logger || console;
  const timeoutMs = dependencies.timeoutMs;
  const sleep = dependencies.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  // The Cache API is shared by the isolates of one data centre; the memory is
  // this isolate's own, and is what holds where there is no Cache API.
  const memory = createMemory(now);

  /** One call to Energinet for both areas. The prices of `area`, or null when the call fails. */
  async function ask(area, cache, later) {
    memory.asking();
    try {
      const areas = await fetchPrices({ fetch: fetcher, timeoutMs });
      const fetched = new Date(now()).toISOString();
      const all = Object.entries(areas).map(([name, points]) => ({ area: name, fetched, points }));
      memory.answered(all);
      // The cache is written after the answer is sent; a failed write only costs a call.
      later(Promise.all(all.map((prices) => cache.write(prices))));
      const prices = all.find((entry) => entry.area === area);
      if (!prices) throw Object.assign(new Error("area missing"), { name: "UpstreamAreaMissing" });
      return prices;
    } catch (error) {
      memory.failed();
      // Only the name of the fault: not Energinet's text, and not the visitor's area.
      logger.error?.("SmartBolig elpris upstream failed", { error: safeErrorName(error) });
      later(cache.startBackoff());
      return null;
    }
  }

  return async function handleElpris(context) {
    const { request } = context;
    const method = request.method;
    if (method !== "GET" && method !== "HEAD") {
      return errorResponse("method_not_allowed", 405, { allow: "GET, HEAD" });
    }

    const url = new URL(request.url);
    const resolved = resolveArea(url, request.cf);
    if (!resolved) return errorResponse("invalid_area", 400, {}, method);
    const { area, guessed } = resolved;

    const cache = createPriceCache(openCache(), url.origin);
    const later = (promise) => context.waitUntil?.(promise.catch(() => {}));
    const respond = (prices) => pricesResponse(prices, { guessed, method, stale: !isFresh(prices, now()) });

    let known = newest(await cache.read(area), memory.read(area));
    if (known && isFresh(known, now())) return respond(known);

    const backingOff = await cache.isBackingOff();
    // No await between the question and ask(): two requests cannot both get a yes.
    if (!backingOff && memory.mayAsk()) {
      const prices = await ask(area, cache, later);
      if (prices) return respond(prices);
    } else if (memory.isAsking() && !(known && coversNow(known, now()))) {
      // Another request is asking right now, and there is nothing to show meanwhile.
      for (let waited = 0; waited < WAIT_MS && memory.isAsking(); waited += WAIT_STEP_MS) await sleep(WAIT_STEP_MS);
      known = newest(known, memory.read(area));
    }

    if (known && coversNow(known, now())) return respond(known);
    return errorResponse("upstream", 502, {}, method);
  };
}
