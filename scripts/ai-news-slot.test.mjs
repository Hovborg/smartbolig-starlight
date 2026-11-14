// The stand-in runs of the news workflow: when a scheduled run writes, and
// that the workflow is wired to ask.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { SLOTS, decide, scheduleOf } from "./ai-news-slot.mjs";

const workflow = await readFile(new URL("../.github/workflows/ai-news.yml", import.meta.url), "utf8");
const run = (id, cron, conclusion = "success") => ({ id, conclusion, display_title: `AI News: ${cron}` });

test("every cron line of the workflow has a slot, and each slot has a run and a stand-in", () => {
  const crons = [...workflow.matchAll(/- cron: '([^']+)'/g)].map((match) => match[1]);

  assert.deepEqual(crons.sort(), Object.keys(SLOTS).sort());
  for (const slot of ["early", "late"]) {
    assert.equal(Object.values(SLOTS).filter((value) => value === slot).length, 2, slot);
  }
});

test("the cron line is read from the end of a run's title", () => {
  assert.equal(scheduleOf("AI News: 37 4 * * *"), "37 4 * * *");
  assert.equal(scheduleOf("AI News: 37 14 * * * "), "37 14 * * *");
  assert.equal(scheduleOf("AI News: manual"), "");
  assert.equal(scheduleOf(undefined), "");
});

test("the first scheduled run in a slot writes, also when the other slot has run", () => {
  assert.equal(decide({ event: "schedule", schedule: "37 4 * * *", runId: 10, runs: [] }).write, true);
  assert.equal(decide({ event: "schedule", schedule: "37 4 * * *", runId: 10, runs: [run(10, "37 4 * * *", null)] }).write, true);
  assert.equal(decide({ event: "schedule", schedule: "37 11 * * *", runId: 30, runs: [run(10, "37 4 * * *")] }).write, true);
  // The stand-in writes when its run was dropped.
  assert.equal(decide({ event: "schedule", schedule: "37 8 * * *", runId: 20, runs: [run(20, "37 8 * * *", null)] }).write, true);
});

test("a stand-in stays quiet when the run it stands in for has started today", () => {
  const early = [run(10, "37 4 * * *", "failure"), run(20, "37 8 * * *", null)];
  const late = [run(10, "37 4 * * *"), run(30, "37 11 * * *", null), run(40, "37 14 * * *", null)];

  assert.deepEqual(decide({ event: "schedule", schedule: "37 8 * * *", runId: 20, runs: early }), {
    write: false,
    reason: "run 10 already covered the early slot today",
  });
  assert.equal(decide({ event: "schedule", schedule: "37 14 * * *", runId: 40, runs: late }).write, false);
});

test("a run that was delayed past its stand-in stays quiet too, and a cancelled run covers nothing", () => {
  const delayed = [run(20, "37 8 * * *"), run(25, "37 4 * * *", null)];
  const cancelled = [run(10, "37 4 * * *", "cancelled"), run(20, "37 8 * * *", null)];

  assert.equal(decide({ event: "schedule", schedule: "37 4 * * *", runId: 25, runs: delayed }).write, false);
  assert.equal(decide({ event: "schedule", schedule: "37 8 * * *", runId: 20, runs: cancelled }).write, true);
});

test("anything that cannot be read means write: a missed day is worse than a second try", () => {
  assert.equal(decide({ event: "workflow_dispatch", schedule: "", runId: 5, runs: [run(1, "37 4 * * *")] }).write, true);
  assert.equal(decide({ event: "schedule", schedule: "37 8 * * *", runId: 20, runs: undefined }).write, true);
  assert.equal(decide({ event: "schedule", schedule: "0 0 * * *", runId: 20, runs: [run(10, "37 4 * * *")] }).write, true);
  assert.equal(decide({ event: "schedule", schedule: "37 8 * * *", runId: 20, runs: [null, { id: "x" }] }).write, true);
});

test("the script prints one output line and survives an empty or broken list", () => {
  const script = fileURLToPath(new URL("./ai-news-slot.mjs", import.meta.url));
  const call = (input, env) =>
    spawnSync(process.execPath, [script], { input, encoding: "utf8", env: { ...process.env, ...env } });
  const scheduled = { GITHUB_EVENT_NAME: "schedule", SCHEDULE: "37 8 * * *", GITHUB_RUN_ID: "20" };

  assert.equal(call(JSON.stringify([run(10, "37 4 * * *")]), scheduled).stdout, "write=false\n");
  assert.equal(call("", scheduled).stdout, "write=true\n");
  assert.equal(call("not json", scheduled).stdout, "write=true\n");
  assert.equal(call("[]", { GITHUB_EVENT_NAME: "workflow_dispatch", SCHEDULE: "", GITHUB_RUN_ID: "5" }).stdout, "write=true\n");
});

test("the script writes its reason to the run's Summary page, and survives a path it cannot write", () => {
  const script = fileURLToPath(new URL("./ai-news-slot.mjs", import.meta.url));
  const dir = mkdtempSync(join(tmpdir(), "slot-"));
  const summary = join(dir, "summary.md");
  const env = { GITHUB_EVENT_NAME: "schedule", SCHEDULE: "37 8 * * *", GITHUB_RUN_ID: "20" };
  const call = (input, extra) =>
    spawnSync(process.execPath, [script], { input, encoding: "utf8", env: { ...process.env, ...env, ...extra } });
  try {
    assert.equal(call(JSON.stringify([run(10, "37 4 * * *")]), { GITHUB_STEP_SUMMARY: summary }).stdout, "write=false\n");
    assert.equal(call("[]", { GITHUB_STEP_SUMMARY: summary }).stdout, "write=true\n");
    assert.equal(
      readFileSync(summary, "utf8"),
      "**Slot:** Not writing: run 10 already covered the early slot today.\n**Slot:** Writing: first run in the early slot today.\n",
    );
    const broken = call("[]", { GITHUB_STEP_SUMMARY: join(dir, "missing", "summary.md") });
    assert.equal(broken.stdout, "write=true\n");
    assert.equal(broken.status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the workflow names each run after its cron line and asks before it writes", () => {
  assert.match(workflow, /^run-name: "AI News: \$\{\{ github\.event\.schedule \|\| 'manual' \}\}"$/m);
  const slot = workflow.slice(workflow.indexOf("\n  slot:"), workflow.indexOf("\n  publish:"));
  assert.match(slot, /permissions:\s*\n\s+contents: read\s*\n\s+actions: read\s*\n/);
  assert.doesNotMatch(slot, /: write/);
  assert.match(slot, /persist-credentials: false/);
  assert.match(slot, /event=schedule&created=%3E%3D\$\(date -u \+%F\)/);
  // A failed list call still ends in a decision.
  assert.match(slot, /\|\| true; \} \| node scripts\/ai-news-slot\.mjs >> "\$GITHUB_OUTPUT"/);
  assert.match(workflow, /\n  publish:\n    needs: slot\n/);
  assert.ok(workflow.includes("if: ${{ !cancelled() && needs.slot.outputs.write != 'false' }}"));
});
