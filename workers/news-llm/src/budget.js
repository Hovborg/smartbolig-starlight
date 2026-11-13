// Hard daily ceiling on Workers AI spend. The account gets 10,000 neurons per
// UTC day for free and pays for everything above, so the relay refuses calls
// before that line. The site's chat shares the same allowance; the default
// leaves room for it.
const DEFAULT_DAILY_NEURONS = 8000;
// Room one call needs. The largest call measured on the allowed models was
// about 650 neurons.
const CALL_RESERVE = 700;
// Charged when a call reports no usage, for example when it failed midway.
const UNKNOWN_CALL_NEURONS = 700;
const KEEP_SECONDS = 3 * 86_400;

export const dayKey = (now = new Date()) => `neurons:${now.toISOString().slice(0, 10)}`;

export function dailyBudget(env) {
  const value = Number(env.DAILY_NEURON_BUDGET);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_DAILY_NEURONS;
}

// Throws when the counter cannot be read; the caller then refuses the call.
export async function spentToday(kv, now = new Date()) {
  const value = Number(await kv.get(dayKey(now)));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export const hasRoom = (spent, budget) => spent + CALL_RESERVE <= budget;

export async function recordSpend(kv, spent, usage, now = new Date()) {
  const neurons = Number(usage?.neurons);
  const total = Math.ceil(spent + (Number.isFinite(neurons) && neurons > 0 ? neurons : UNKNOWN_CALL_NEURONS));
  await kv.put(dayKey(now), String(total), { expirationTtl: KEEP_SECONDS });
  return total;
}
