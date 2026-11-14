// One GET with a timeout and a single retry. A network error or a 5xx is tried
// once more after a pause, so one blip does not open an issue; a 4xx is an
// answer and is never retried. `fetch` and `sleep` are injected for tests.

export const USER_AGENT = "smartbolig-monitor (GitHub Actions)";
const MAX_BODY_CHARS = 2_000_000;

function describe(error) {
  if (error?.name === "TimeoutError" || error?.name === "AbortError") return "timed out";
  const code = error?.cause?.code ? ` (${error.cause.code})` : "";
  return `${error?.name ?? "Error"}: ${error?.message ?? error}${code}`;
}

export function createGetter({
  fetchImpl = fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  timeoutMs = 15_000,
  retryDelayMs = 5_000,
} = {}) {
  /** @returns {Promise<{status?: number, headers?: Headers, body?: string, error?: string}>} */
  return async function get(url, { redirect = "follow" } = {}) {
    for (let attempt = 0; ; attempt += 1) {
      let result;
      try {
        const response = await fetchImpl(url, {
          redirect,
          headers: { "user-agent": USER_AGENT },
          signal: AbortSignal.timeout(timeoutMs),
        });
        result = { status: response.status, headers: response.headers, body: (await response.text()).slice(0, MAX_BODY_CHARS) };
      } catch (error) {
        result = { error: describe(error) };
      }
      const retryable = result.error !== undefined || result.status >= 500;
      if (!retryable || attempt === 1) return result;
      await sleep(retryDelayMs);
    }
  };
}
