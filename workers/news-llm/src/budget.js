// Hard daily ceiling on Workers AI spend. The account gets 10,000 neurons per
// UTC day for free and pays for everything above, so the relay books every
// call's worst-case cost before the model runs and refuses a call that would
// pass the ceiling. The site's chat shares the allowance; the default leaves
// room for it. The ledger itself lives in the BudgetCounter Durable Object.
const DEFAULT_DAILY_NEURONS = 8000;

export const dayKey = (now = new Date()) => now.toISOString().slice(0, 10);

export function dailyBudget(env) {
  const value = Number(env.DAILY_NEURON_BUDGET);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_DAILY_NEURONS;
}

// Throws when the counter cannot be reached or answers with an error; the
// caller then refuses the call, so the ceiling never fails open.
async function ask(namespace, body) {
  const counter = namespace.get(namespace.idFromName("global"));
  const response = await counter.fetch("https://budget.internal/", { method: "POST", body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`budget counter answered ${response.status}`);
  return response.json();
}

export const reserveSpend = (namespace, day, cost, limit) => ask(namespace, { op: "reserve", day, cost, limit });

export const settleSpend = (namespace, day, reserved, actual) => ask(namespace, { op: "settle", day, reserved, actual });
