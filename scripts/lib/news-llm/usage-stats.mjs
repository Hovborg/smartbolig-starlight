// Per-model usage for the run report: how many answers a model gave, the
// tokens it reported and what the relay charged. A number or a numeric string
// counts; anything else (missing, null, true, "", NaN) is no number. The
// relay's daily total is kept as last reported.
const parse = (value) => {
  const candidate = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : null;
};
export const finite = (value) => parse(value) ?? 0;

// No prototype, so a model id such as "__proto__" is an ordinary key.
export const emptyUsage = () => ({ byModel: Object.create(null), budget: null });

export function recordUsage(stats, model, usage, budget) {
  const row = (stats.byModel[model] ||= { answers: 0, inputTokens: 0, outputTokens: 0, neurons: 0 });
  row.answers += 1;
  row.inputTokens += finite(usage?.prompt_tokens ?? usage?.input_tokens);
  row.outputTokens += finite(usage?.completion_tokens ?? usage?.output_tokens);
  row.neurons += finite(usage?.neurons);
  const spent = parse(budget?.spent);
  if (spent !== null) stats.budget = { spent, limit: finite(budget.limit) };
}
