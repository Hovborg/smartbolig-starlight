// Private relay between the daily news job (GitHub Actions) and Workers AI.
// It exposes one OpenAI-compatible route and nothing else. See ../README.md.
import { answerText, finishReason } from "./answer.js";
import { authorized } from "./auth.js";
import { dailyBudget, hasRoom, recordSpend, spentToday } from "./budget.js";
import { allowedModels, parseRequest } from "./request.js";

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

    let input;
    try {
      input = await parseRequest(request, allowedModels(env));
    } catch (error) {
      return json({ error: "bad_request", detail: String(error?.message || error).slice(0, 200) }, 400);
    }

    // No readable counter means no call: the ceiling must never fail open.
    const limit = dailyBudget(env);
    let spent;
    try {
      spent = await spentToday(env.BUDGET);
    } catch {
      return json({ error: "budget_unavailable" }, 503);
    }
    if (!hasRoom(spent, limit)) return json({ error: "daily_budget_exhausted", budget: { spent, limit } }, 429);

    const { model, ...options } = input;
    let result;
    let failure;
    try {
      result = await env.AI.run(model, { ...options, stream: false });
    } catch (error) {
      failure = String(error?.message || error).slice(0, 300);
    }

    // A failed call may still have used neurons, so it is charged as well.
    let total;
    try {
      total = await recordSpend(env.BUDGET, spent, result?.usage);
    } catch {
      return json({ error: "budget_unavailable" }, 503);
    }
    if (failure !== undefined) return json({ error: "upstream_failed", detail: failure }, 502);

    return json({
      model,
      choices: [{ index: 0, message: { role: "assistant", content: answerText(result) }, finish_reason: finishReason(result) }],
      usage: result?.usage ?? null,
      budget: { spent: total, limit },
    });
  },
};
