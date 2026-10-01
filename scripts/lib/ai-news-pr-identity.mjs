import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

function sameRepositoryPr(pr, owner) {
  return pr?.isCrossRepository === false
    && typeof pr.headRepositoryOwner?.login === "string"
    && pr.headRepositoryOwner.login.toLowerCase() === owner.toLowerCase();
}

export function currentOwnedPr(prs, owner, branch, expectedHead = "") {
  if (!Array.isArray(prs)) throw new TypeError("GitHub PR response must be an array");
  const matches = prs.filter((pr) => sameRepositoryPr(pr, owner) && pr.headRefName === branch && pr.baseRefName === "main");
  if (matches.length > 1) throw new Error(`Multiple same-repository PRs found for ${branch}`);
  const pr = matches[0] || null;
  if (pr && expectedHead && pr.headRefOid !== expectedHead) {
    throw new Error(`Existing PR does not point to the pushed head commit for ${branch}`);
  }
  if (pr && (typeof pr.url !== "string" || !pr.url.startsWith("https://github.com/"))) {
    throw new Error("Existing PR has no valid GitHub URL");
  }
  return pr;
}

const OPENCLAW_BRANCH = /^ai-news\/(\d{4}-\d{2}-\d{2})-openclaw$/;

export function staleOwnedPrNumbers(prs, owner, currentBranch) {
  if (!Array.isArray(prs)) throw new TypeError("GitHub PR response must be an array");
  const currentDate = OPENCLAW_BRANCH.exec(currentBranch)?.[1];
  if (!currentDate) return [];
  return prs.filter((pr) => sameRepositoryPr(pr, owner)
    && typeof pr.headRefName === "string"
    && OPENCLAW_BRANCH.exec(pr.headRefName)?.[1] < currentDate
    && pr.baseRefName === "main"
    && Number.isSafeInteger(pr.number) && pr.number > 0)
    .map((pr) => pr.number);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [mode, owner, branch, expectedHead = ""] = process.argv.slice(2);
    if (!owner || !branch || !["current", "stale"].includes(mode)) throw new Error("Invalid PR identity arguments");
    const prs = JSON.parse(readFileSync(0, "utf8"));
    if (mode === "current") {
      const pr = currentOwnedPr(prs, owner, branch, expectedHead);
      if (pr) process.stdout.write(`${pr.url}\n`);
    } else {
      for (const number of staleOwnedPrNumbers(prs, owner, branch)) process.stdout.write(`${number}\n`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
