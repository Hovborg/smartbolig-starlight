// What one Worker isolate remembers between requests: the last good answer,
// and when it last asked Energinet. Plain values only. A promise is never
// shared between requests: the runtime may cancel the request that owns it,
// and the others would wait for ever. For the same reason "a call is under
// way" is a point in time that runs out, not a flag someone has to clear.

import { BACKOFF_SECONDS } from "./cache.js";
import { UPSTREAM_TIMEOUT_MS } from "./upstream.js";

/** While a call may still be on its way, no second one is started. */
export const ASK_GAP_MS = UPSTREAM_TIMEOUT_MS + 2_000;

export function createMemory(now = Date.now) {
  let askedAt = Number.NEGATIVE_INFINITY;
  let failedAt = Number.NEGATIVE_INFINITY;
  let latest = [];
  return {
    /** May this request call Energinet? Not while a call is under way or has just failed. */
    mayAsk() {
      const time = now();
      return time - askedAt >= ASK_GAP_MS && time - failedAt >= BACKOFF_SECONDS * 1000;
    },
    /** Is a call from another request under way right now? */
    isAsking() {
      return now() - askedAt < ASK_GAP_MS;
    },
    asking() {
      askedAt = now();
    },
    /** `all` is [{ area, fetched, points }]. An area the answer lacks keeps its older copy. */
    answered(all) {
      askedAt = Number.NEGATIVE_INFINITY;
      latest = [...all, ...latest.filter((old) => !all.some((fresh) => fresh.area === old.area))];
    },
    failed() {
      askedAt = Number.NEGATIVE_INFINITY;
      failedAt = now();
    },
    /** { area, fetched, points } from the last good call, or null. */
    read(area) {
      return latest.find((prices) => prices.area === area) ?? null;
    },
  };
}
