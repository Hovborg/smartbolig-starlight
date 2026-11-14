// Private relay between the daily news job (GitHub Actions) and Workers AI.
// It exposes one OpenAI-compatible route and nothing else. See ../README.md.
import { answerText, finishReason } from "./answer.js";
import { authorized } from "./auth.js";
import { dailyBudget, dayKey, reserveSpend, settleSpend } from "./budget.js";
import { actualCost, worstCase } from "./prices.js";
import { allowedModels, parseRequest } from "./request.js";

export { BudgetCounter } from "./counter.js";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (request.method !== "POST" || pathname !== "/v1/chat/completions") return json({ error: "not_found" }, 404);
    if (!(await authorized(request, env.NEWS_LLM_SECRET))) return json({ error: "unauthorized" }, 401);

    const { success } = await env.CALL_LIMITER.limit({ key: "news" });
    if (!success) return json({ error: "rate_limited" }, 429);

    let parsed;
    try {
      parsed = await parseRequest(request, allowedModels(env));
    } catch (error) {
      return json({ error: "bad_request", detail: String(error?.message || error).slice(0, 200) }, 400);
    }
    const { bodyBytes, input } = parsed;
    const { model, ...options } = input;

    // Book the worst case before the model runs. A call that is cut off, a
    // second call at the same moment and a failed call are all counted. No
    // reachable counter means no call: the ceiling must never fail open.
    const limit = dailyBudget(env);
    const day = dayKey();
    const reserved = worstCase(model, bodyBytes, options.max_tokens);
    let booking;
    try {
      booking = await reserveSpend(env.BUDGET_COUNTER, day, reserved, limit);
    } catch {
      return json({ error: "budget_unavailable" }, 503);
    }
    if (!booking.ok) return json({ error: "daily_budget_exhausted", budget: { spent: booking.spent, limit } }, 429);

    let result;
    try {
      result = await env.AI.run(model, { ...options, stream: false });
    } catch (error) {
      // The failed call keeps its full reservation: it may have used neurons.
      const detail = String(error?.message || error).slice(0, 300);
      return json({ error: "upstream_failed", detail, budget: { spent: booking.spent, limit } }, 502);
    }

    // Swap the reservation for the real cost. An answer without token counts
    // keeps the worst case. If the swap cannot be written, the reservation
    // stays, which is the higher number in every normal case.
    const neurons = actualCost(model, result?.usage) ?? reserved;
    let spent = booking.spent;
    if (neurons !== reserved) {
      try {
        ({ spent } = await settleSpend(env.BUDGET_COUNTER, day, reserved, neurons));
      } catch {
        // Keep the reservation.
      }
    }

    return json({
      model,
      choices: [{ index: 0, message: { role: "assistant", content: answerText(result) }, finish_reason: finishReason(result) }],
      usage: { ...(result?.usage ?? {}), neurons },
      budget: { spent, limit },
    });
  },
};
