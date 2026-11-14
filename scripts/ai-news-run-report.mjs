#!/usr/bin/env node
// Reports the outcome of one news run: Markdown for the GitHub job summary
// and a `status` output for the following steps. This summary is the one
// place to see why a day was published, skipped or failed.
// Troubleshooting: docs/nyhedsflow.md.
import { existsSync } from "node:fs";
import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Titles and reasons come from external sources and model output. They are
// shown as plain text: no links, markup or table breaks. GitHub also turns bare
// URLs, `www.` hosts and e-mail addresses into links, so a zero-width space is
// inserted after `://`, `www.` and `@` to break the autolinking.
const ZERO_WIDTH_SPACE = "\u200B";

export function plain(value, maxChars = 200) {
  return String(value ?? "")
    .replace(/[<>[\]()`|*_#!\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars)
    .replace(/:\/\//g, `://${ZERO_WIDTH_SPACE}`)
    .replace(/\bwww\./gi, (match) => `${match}${ZERO_WIDTH_SPACE}`)
    .replace(/@/g, `@${ZERO_WIDTH_SPACE}`);
}

export function outcome(result, writeOutcome) {
  if (writeOutcome && writeOutcome !== "success") return "failed";
  if (!result) return "failed";
  return result.status === "publish" ? "publish" : "skip";
}

// What each model answered and cost, and the relay's total for the day.
function usageLines(result) {
  const lines = [];
  const models = Object.entries(result?.byModel || {});
  if (models.length > 0) {
    lines.push("", "| Model | Answers | Input tokens | Output tokens | Neurons |", "|---|---|---|---|---|");
    for (const [model, row] of models) {
      const cells = [row?.answers, row?.inputTokens, row?.outputTokens, row?.neurons].map((value) => Math.round(Number(value) || 0));
      lines.push(`| ${plain(model, 80)} | ${cells.join(" | ")} |`);
    }
  }
  if (result?.budget) {
    lines.push("", `Relay budget today: ${Math.round(Number(result.budget.spent) || 0)} of ${Math.round(Number(result.budget.limit) || 0)} neurons used.`);
  }
  return lines;
}

export function renderReport(result, status, { dryRun = false } = {}) {
  const lines = [`## AI News ${plain(result?.date || "", 10)}`.trim(), ""];
  if (status === "failed") {
    lines.push("**Failed.** The writing step did not finish. Open that step's log for the error, then see `docs/nyhedsflow.md`.");
  } else if (status === "publish") {
    const stories = `${Number(result.stories) || 0} fact-checked stories (lede: ${plain(result.ledeSource, 20)})`;
    lines.push(dryRun ? `**Dry run: written, not published.** ${stories}. Nothing is committed or deployed.` : `**Published** ${stories}.`);
  } else {
    lines.push(`**Nothing published.** ${plain(result.reason, 300)}`);
  }
  if (result?.calls !== undefined) {
    lines.push("", `Model calls: ${Number(result.calls) || 0}. Neurons: ${Number(result.neurons) || 0}.`);
  }
  lines.push(...usageLines(result));
  const dropped = Array.isArray(result?.dropped) ? result.dropped : [];
  if (dropped.length > 0) {
    lines.push("", "### Dropped by the fact check", "");
    for (const story of dropped) {
      lines.push(`- ${plain(story.title, 120)}`);
      for (const reason of (story.reasons || []).slice(0, 3)) lines.push(`  - ${plain(reason, 300)}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

async function main() {
  const resultPath = process.env.AI_NEWS_RESULT_PATH || "";
  const result = resultPath && existsSync(resultPath) ? JSON.parse(await readFile(resultPath, "utf8")) : null;
  const status = outcome(result, process.env.WRITE_OUTCOME);
  const report = renderReport(result, status, { dryRun: process.env.DRY_RUN === "true" });
  // The same text goes to the step log, so it can be read with `gh run view --log`.
  process.stdout.write(report);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, report, "utf8");
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `status=${status}\n`, "utf8");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
