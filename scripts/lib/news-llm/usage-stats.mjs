// Per-model usage for the run report: how many answers a model gave, the
// tokens it reported and what the relay charged. A missing number counts as
// zero. The relay's daily total is kept as last reported.
const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

export const emptyUsage = () => ({ byModel: {}, budget: null });

export function recordUsage(stats, model, usage, budget) {
  const row = (stats.byModel[model] ||= { answers: 0, inputTokens: 0, outputTokens: 0, neurons: 0 });
  row.answers += 1;
  row.inputTokens += number(usage?.prompt_tokens ?? usage?.input_tokens);
  row.outputTokens += number(usage?.completion_tokens ?? usage?.output_tokens);
  row.neurons += number(usage?.neurons);
  if (budget && Number.isFinite(Number(budget.spent))) {
    stats.budget = { spent: Number(budget.spent), limit: number(budget.limit) };
  }
}
