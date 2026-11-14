// When the house may show its first picture: once the shaders are compiled,
// but never later than the limit. A browser that never answers must not leave
// the still picture standing for good.

/** The longest the first picture waits for the shaders. */
export const COMPILE_LIMIT_MS = 2500;

const pause = (ms) => new Promise((done) => { setTimeout(done, ms); });

/**
 * Resolves when `compiled` settles (also when it fails) or when the limit
 * has passed, whichever comes first. Never rejects.
 */
export function firstFrameGate(compiled, limit = COMPILE_LIMIT_MS) {
  return Promise.race([Promise.resolve(compiled).catch(() => {}), pause(limit)]);
}
