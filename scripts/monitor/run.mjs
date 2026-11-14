// Entry point: node scripts/monitor/run.mjs [--base URL] [--report FILE]
// Checks the live site, prints one line per check, writes a Markdown report
// and exits 1 when a check fails. Inside GitHub Actions it also writes
// `failing=<n>` to $GITHUB_OUTPUT for the issue step. No dependencies.

import { appendFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { SITE, buildChecks } from "./checks.mjs";
import { createGetter } from "./http.mjs";
import { renderReport } from "./report.mjs";
import { runChecks } from "./runner.mjs";

const { values } = parseArgs({ options: { base: { type: "string" }, report: { type: "string" } } });
// An empty value (a scheduled run passes one) means the live site.
const base = (values.base || process.env.MONITOR_BASE_URL || SITE).replace(/\/+$/, "");
const { GITHUB_SERVER_URL: server, GITHUB_REPOSITORY: repository, GITHUB_RUN_ID: runId } = process.env;
const runUrl = server && repository && runId ? `${server}/${repository}/actions/runs/${runId}` : undefined;
const now = new Date();

let results;
try {
  results = await runChecks(buildChecks({ get: createGetter(), base, now }));
} catch (error) {
  results = [{ name: "Monitor itself", expected: "runs to the end", ok: false, seen: `crashed: ${error?.message ?? error}` }];
}

for (const result of results) console.log(`${result.ok ? "PASS" : "FAIL"}  ${result.name}: ${result.seen}`);
const failing = results.filter((result) => !result.ok).length;
console.log(failing ? `${failing} of ${results.length} checks fail.` : `All ${results.length} checks pass.`);

if (values.report) writeFileSync(values.report, renderReport(results, { base, at: now, runUrl }));
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `failing=${failing}\n`);
process.exit(failing ? 1 : 0);
