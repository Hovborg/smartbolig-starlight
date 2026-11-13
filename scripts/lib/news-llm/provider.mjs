// One entry point for model calls: picks the provider, walks the model
// fallback chain, keeps the reviewer on a different model than the writer
// when it can, and enforces the per-run ceilings on calls and neurons.
import { CallBudgetExceeded } from "./errors.mjs";
import { MAX_CALLS_PER_RUN, MAX_NEURONS_PER_RUN } from "./limits.mjs";
import { modelsFor } from "./models.mjs";
import { createClaudeChat } from "./provider-claude.mjs";
import { createHttpChat } from "./provider-http.mjs";

export { CallBudgetExceeded };

export function createChat({ env = process.env, call, log = console.log } = {}) {
  const kind = env.AI_NEWS_LLM_PROVIDER || (env.AI_NEWS_LLM_URL ? "http" : "claude");
  const models = modelsFor(kind, env);
  const send = call || (kind === "http"
    ? createHttpChat({ url: env.AI_NEWS_LLM_URL, key: env.AI_NEWS_LLM_KEY })
    : createClaudeChat({ bin: env.AI_NEWS_LLM_BIN || "claude" }));
  const stats = { calls: 0, neurons: 0, failures: [] };

  function assertWithinBudget() {
    if (stats.calls >= MAX_CALLS_PER_RUN) throw new CallBudgetExceeded(`Model call ceiling reached (${MAX_CALLS_PER_RUN})`);
    if (stats.neurons >= MAX_NEURONS_PER_RUN) throw new CallBudgetExceeded(`Neuron ceiling for one run reached (${MAX_NEURONS_PER_RUN})`);
  }

  // role: "writer" | "reviewer". `avoid` is the model that wrote the text under
  // review; it is only used for the review when no other model is configured.
  async function chat({ role, system, user, avoid, maxTokens }) {
    const preferred = models[role].filter((model) => model !== avoid);
    const chain = preferred.length > 0 ? preferred : models[role];
    let lastError;
    for (const model of chain) {
      assertWithinBudget();
      stats.calls += 1;
      try {
        const { text, usage } = await send({ model, system, user, maxTokens });
        stats.neurons += Number(usage?.neurons || 0);
        return { text, model };
      } catch (error) {
        // A used-up budget applies to every model; trying the next one is pointless.
        if (error instanceof CallBudgetExceeded) throw error;
        lastError = error;
        stats.failures.push(`${role} ${model}: ${error.message}`);
        log(`Model ${model} failed as ${role} (${error.message}); trying the next model.`);
      }
    }
    throw new Error(`Every ${role} model failed: ${lastError?.message}`);
  }

  return { chat, stats, kind, models };
}
