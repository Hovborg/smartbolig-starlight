import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { currentOwnedPr, staleOwnedPrNumbers } from "./lib/ai-news-pr-identity.mjs";

const commit = "a".repeat(40);
const own = {
  url: "https://github.com/Hovborg/smartbolig-starlight/pull/10",
  number: 10,
  headRefName: "ai-news/2026-10-02-openclaw",
  baseRefName: "main",
  headRefOid: commit,
  isCrossRepository: false,
  headRepositoryOwner: { login: "Hovborg" },
};
const fork = {
  ...own,
  url: "https://github.com/Hovborg/smartbolig-starlight/pull/11",
  number: 11,
  isCrossRepository: true,
  headRepositoryOwner: { login: "attacker" },
};

test("same-name fork PR cannot be selected as the publisher's PR", () => {
  assert.equal(currentOwnedPr([fork, own], "Hovborg", own.headRefName, commit)?.url, own.url);
  assert.equal(currentOwnedPr([fork], "Hovborg", own.headRefName, commit), null);
  const wrongBase = { ...own, baseRefName: "release" };
  assert.equal(currentOwnedPr([wrongBase], "Hovborg", own.headRefName, commit), null);
  assert.equal(currentOwnedPr([wrongBase, own], "Hovborg", own.headRefName, commit)?.url, own.url);
  assert.throws(() => currentOwnedPr([{ ...own, headRefOid: "b".repeat(40) }], "Hovborg", own.headRefName, commit), /head commit/);
});

test("stale cleanup only selects owned OpenClaw drafts, leaving Windows PRs alone", () => {
  const stale = { ...own, number: 12, headRefName: "ai-news/2026-10-01-openclaw" };
  const windowsPublisher = { ...own, number: 14, headRefName: "ai-news/2026-10-01-deadbeefcafe" };
  const wrongBase = { ...stale, number: 15, baseRefName: "release" };
  const future = { ...stale, number: 16, headRefName: "ai-news/2026-10-03-openclaw" };
  const manual = { ...stale, number: 17, headRefName: "ai-news/editorial-project" };
  assert.deepEqual(staleOwnedPrNumbers([fork, own, stale, windowsPublisher, wrongBase, future, manual, { ...fork, number: 13, headRefName: stale.headRefName }], "Hovborg", own.headRefName), [12]);
  assert.deepEqual(staleOwnedPrNumbers([stale], "Hovborg", "ai-news/manual-draft"), []);
});

test("CLI ignores a fork collision and returns only the owned URL", () => {
  const command = new URL("./lib/ai-news-pr-identity.mjs", import.meta.url);
  const result = spawnSync(process.execPath, [fileURLToPath(command), "current", "Hovborg", own.headRefName, commit], {
    input: JSON.stringify([fork, own]), encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), own.url);
});
