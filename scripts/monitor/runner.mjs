// Runs the checks one after another (the site gets one request at a time) and
// turns a check that throws into a failing result instead of a crash.

export async function runChecks(checks) {
  const results = [];
  for (const { name, expected, run } of checks) {
    let outcome;
    try {
      outcome = await run();
    } catch (error) {
      outcome = { ok: false, seen: `check crashed: ${error?.message ?? error}` };
    }
    results.push({ name, expected, ok: outcome.ok === true, seen: outcome.seen });
  }
  return results;
}
