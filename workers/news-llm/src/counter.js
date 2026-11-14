// Durable Object that owns the daily neuron ledger. One instance for the whole
// relay; Cloudflare runs its requests one at a time. Only the relay Worker can
// reach it (it has no public route).
import { reserve, settle } from "./ledger.js";

const OPERATIONS = { reserve, settle };

export class BudgetCounter {
  constructor(state) {
    this.storage = state.storage;
  }

  async fetch(request) {
    try {
      const { op, ...args } = await request.json();
      if (!Object.hasOwn(OPERATIONS, op)) return Response.json({ error: "unknown_operation" }, { status: 400 });
      return Response.json(await OPERATIONS[op](this.storage, args));
    } catch (error) {
      return Response.json({ error: String(error?.message || error).slice(0, 200) }, { status: 500 });
    }
  }
}
