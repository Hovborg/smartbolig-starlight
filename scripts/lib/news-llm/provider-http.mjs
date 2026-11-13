// Chat provider for any OpenAI-compatible endpoint. In production this is the
// site's private Workers AI relay (workers/news-llm). The key is read from the
// environment by the caller and never logged.
// Reasoning models spend output tokens on thinking before they answer; with a
// small budget the answer comes back empty.
import { DailyBudgetExhausted } from "./errors.mjs";

const DEFAULT_MAX_TOKENS = 7000;
const RETRY_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [2_000, 8_000];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function errorCode(response) {
  try {
    return (await response.json())?.error;
  } catch {
    return "";
  }
}

// `onAttempt` runs before every HTTP attempt, retries included, so the caller
// can count and cap real requests. Whatever it throws (a call ceiling) ends the
// call at once; it is never retried.
export function createHttpChat({ url, key, fetchImpl = fetch, wait = sleep, onAttempt }) {
  if (!url || !key) throw new Error("AI_NEWS_LLM_URL and AI_NEWS_LLM_KEY are required for the http provider");

  return async function chat({ model, system, user, maxTokens = DEFAULT_MAX_TOKENS, temperature = 0.2, timeoutMs = 180_000, reasoningEffort }) {
    const body = JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      max_tokens: maxTokens,
      temperature,
      ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
    });
    let lastError;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      if (attempt > 0) await wait(RETRY_DELAYS_MS[attempt - 1]);
      if (onAttempt) onAttempt();
      let response;
      try {
        response = await fetchImpl(url, {
          method: "POST",
          headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
          body,
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        // Network failure or timeout: worth another attempt.
        lastError = new Error(`LLM endpoint unreachable: ${error.name}`);
        continue;
      }
      if (response.status === 429 && (await errorCode(response)) === "daily_budget_exhausted") {
        throw new DailyBudgetExhausted("The relay's daily model budget is used up");
      }
      if (RETRY_STATUS.has(response.status)) {
        lastError = new Error(`LLM endpoint answered ${response.status}`);
        continue;
      }
      if (!response.ok) throw new Error(`LLM endpoint answered ${response.status}`);
      const data = await response.json();
      const choice = data?.choices?.[0];
      const text = choice?.message?.content;
      if (typeof text !== "string" || !text.trim()) throw new Error("LLM endpoint returned no text");
      if (choice.finish_reason === "length") throw new Error("LLM answer was cut off at the token limit");
      return { text, usage: data.usage || null };
    }
    throw lastError;
  };
}
