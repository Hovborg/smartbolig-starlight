#!/usr/bin/env node
// Stages exactly the files one news issue may create. Anything else changed
// in the working tree stops the run before a commit exists.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { issuePaths } from "./lib/ai-news-issue-files.mjs";

// `git status --porcelain` lines: two status characters, a space, the path.
// A rename is "old -> new"; both sides count as changed.
export function changedPaths(porcelain) {
  return String(porcelain)
    .split("\n")
    .filter((line) => line.length > 3)
    .flatMap((line) => line.slice(3).split(" -> "))
    .map((file) => file.replace(/^"|"$/g, "").replaceAll("\\", "/"));
}

export function unexpectedPaths(changed, allowed) {
  const allow = new Set(allowed);
  return changed.filter((file) => !allow.has(file));
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

function main() {
  const dateIndex = process.argv.indexOf("--date");
  const date = dateIndex >= 0 ? String(process.argv[dateIndex + 1] || "") : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error("Usage: ai-news-ci-stage.mjs --date YYYY-MM-DD");
    process.exit(1);
  }

  const allowed = issuePaths(date);
  const changed = changedPaths(git(["status", "--porcelain", "--untracked-files=all"]));
  const unexpected = unexpectedPaths(changed, allowed);
  if (unexpected.length > 0) {
    console.error(`Unexpected changed paths, nothing staged: ${unexpected.join(", ")}`);
    process.exit(1);
  }
  const toStage = allowed.filter((file) => changed.includes(file));
  if (toStage.length === 0) {
    console.error("Nothing to stage.");
    process.exit(1);
  }

  git(["add", "--", ...toStage]);
  const staged = git(["diff", "--cached", "--name-only"]).split("\n").filter(Boolean);
  if (staged.length === 0 || unexpectedPaths(staged, allowed).length > 0) {
    console.error("Staged paths do not match the allowlist.");
    process.exit(1);
  }
  console.log(`Staged ${staged.length} file(s) for ${date}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
