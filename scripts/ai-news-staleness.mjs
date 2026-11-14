#!/usr/bin/env node
// Reports how many days ago the newest issue was published. The workflow
// opens one GitHub issue when publishing has been stalled for several days
// and closes it when publishing resumes. `--latest` prints only the date.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { copenhagenDate, daysBetween, issueDates, NEWS_DIR } from "./lib/ai-news-issue-files.mjs";

// "Several days": the third day without an issue.
export const STALE_AFTER_DAYS = 3;

export function staleness({ latest, today, staleAfter = STALE_AFTER_DAYS }) {
  if (!latest) return { latest: "", days: -1, stale: true };
  const days = Math.max(0, daysBetween(latest, today));
  return { latest, days, stale: days >= staleAfter };
}

async function main() {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const [latest] = await issueDates(path.join(rootDir, NEWS_DIR));
  if (process.argv.includes("--latest")) {
    console.log(latest || "");
    return;
  }
  const result = staleness({ latest, today: copenhagenDate() });
  console.log(`latest=${result.latest}`);
  console.log(`days=${result.days}`);
  console.log(`stale=${result.stale}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
