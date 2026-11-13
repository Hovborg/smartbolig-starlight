// The day's neuron ledger. Runs inside the BudgetCounter Durable Object, which
// handles one request at a time, so a reservation is read, checked and written
// without another call getting in between.
const KEEP_DAYS = 3;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const amount = (value) => (Number.isFinite(value) && value >= 0 ? Math.ceil(value) : null);

async function spentOn(storage, day) {
  const value = Number(await storage.get(day));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

async function dropOldDays(storage, today) {
  const cutoff = new Date(`${today}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - KEEP_DAYS);
  const oldest = cutoff.toISOString().slice(0, 10);
  const keys = [...(await storage.list()).keys()].filter((key) => DAY.test(key) && key < oldest);
  if (keys.length > 0) await storage.delete(keys);
}

// Books `cost` against the day before the model is called. Refuses when it
// would pass the limit.
export async function reserve(storage, { day, cost, limit }) {
  const booked = amount(cost);
  if (!DAY.test(day) || booked === null || amount(limit) === null) throw new Error("invalid reservation");
  const spent = await spentOn(storage, day);
  if (spent + booked > limit) return { ok: false, spent };
  await storage.put(day, spent + booked);
  await dropOldDays(storage, day);
  return { ok: true, spent: spent + booked };
}

// Replaces a reservation with what the call really cost, whether that is
// less or (should a model ever report more than the worst case) more.
export async function settle(storage, { day, reserved, actual }) {
  const booked = amount(reserved);
  const used = amount(actual);
  if (!DAY.test(day) || booked === null || used === null) throw new Error("invalid settlement");
  const spent = await spentOn(storage, day);
  const next = Math.max(0, spent - booked + used);
  await storage.put(day, next);
  return { spent: next };
}
