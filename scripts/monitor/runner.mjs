// Runs the checks one after another (the site gets one request at a time) and
// turns a check that throws into a failing result instead of a crash.

const MAX_SEEN = 240;
// What a check saw comes from the live site. One short line of it is kept, so
// neither the log nor the report can be filled or steered by a page.
const brief = (seen) => String(seen ?? "").replace(/\s+/g, " ").slice(0, MAX_SEEN);

export async function runChecks(checks) {
  const results = [];
  for (const { name, expected, run } of checks) {
    let outcome;
    try {
      outcome = await run();
    } catch (error) {
      outcome = { ok: false, seen: `check crashed: ${error?.message ?? error}` };
    }
    results.push({ name, expected, ok: outcome.ok === true, seen: brief(outcome.seen) });
  }
  return results;
}
