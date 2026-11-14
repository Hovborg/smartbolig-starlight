// Decides whether a scheduled news run should write, or whether an earlier run
// today already covered its slot.
//
// GitHub can drop a scheduled run. Each of the two daily runs therefore has a
// stand-in a few hours later. A stand-in must not cost a second try on a day
// with nothing to publish, so a run stays quiet when another scheduled run in
// the same slot has started today. A manual run always writes.
//
//   gh api …/runs?event=schedule&created=>=<today> --jq '[.workflow_runs[] | {id, conclusion, display_title}]' \
//     | node scripts/ai-news-slot.mjs >> "$GITHUB_OUTPUT"

import { pathToFileURL } from "node:url";

/** Which slot each cron line in ai-news.yml belongs to. */
export const SLOTS = {
  "37 4 * * *": "early",
  "37 8 * * *": "early",
  "37 11 * * *": "late",
  "37 14 * * *": "late",
};

/** The cron line at the end of a run's title ("AI News: 37 4 * * *"), or "". */
export function scheduleOf(title) {
  return /(\d+ \d+ \* \* \*)\s*$/.exec(String(title ?? ""))?.[1] ?? "";
}

/**
 * { write, reason } for this run. `runs` is today's scheduled runs of the
 * workflow: [{ id, conclusion, display_title }]. Anything that cannot be read
 * means "write": a missed day is worse than a second try.
 */
export function decide({ event, schedule, runId, runs }) {
  if (event !== "schedule") return { write: true, reason: "not a scheduled run" };
  const slot = SLOTS[schedule];
  if (!slot) return { write: true, reason: "unknown schedule" };
  if (!Array.isArray(runs)) return { write: true, reason: "the list of runs could not be read" };
  const own = Number(runId);
  const earlier = runs.find(
    (run) => Number(run?.id) < own && run?.conclusion !== "cancelled" && SLOTS[scheduleOf(run?.display_title)] === slot,
  );
  if (!earlier) return { write: true, reason: `first run in the ${slot} slot today` };
  return { write: false, reason: `run ${Number(earlier.id)} already covered the ${slot} slot today` };
}

async function readStdin() {
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let runs;
  try {
    runs = JSON.parse(await readStdin());
  } catch {
    runs = undefined;
  }
  const { write, reason } = decide({
    event: process.env.GITHUB_EVENT_NAME,
    schedule: process.env.SCHEDULE,
    runId: process.env.GITHUB_RUN_ID,
    runs,
  });
  console.error(`${write ? "Writing" : "Not writing"}: ${reason}.`);
  console.log(`write=${write}`);
}
