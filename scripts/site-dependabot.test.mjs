// The automatic merge of small dependency updates: what the workflow may do,
// and which updates its two rules let through. docs/opdateringer.md.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const workflow = (await read(".github/workflows/dependabot-automerge.yml")).replace(/\r\n/g, "\n");
const hasJq = spawnSync("jq", ["--version"]).status === 0;

/** The jq program in the workflow that starts right after `opening`. */
function programAfter(opening) {
  const start = workflow.indexOf(opening);
  assert.notEqual(start, -1, `the workflow no longer contains: ${opening}`);
  const from = start + opening.length;
  return workflow.slice(from, workflow.indexOf("\n          ' ", from));
}

/** Runs a jq program as the workflow does: any failure counts as "false". */
async function answer(program, input) {
  const folder = await mkdtemp(path.join(tmpdir(), "automerge-rule-"));
  try {
    const file = path.join(folder, "rule.jq");
    await writeFile(file, program);
    const run = spawnSync("jq", ["-r", "-f", file], { input, encoding: "utf8" });
    return run.status === 0 && run.stdout.trim() === "true";
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}

const update = (updateType, newVersion) => ({ updateType: `version-update:semver-${updateType}`, newVersion });

test("the auto-merge workflow gets no secrets and runs third-party code only where it cannot write", () => {
  assert.match(workflow, /^on: pull_request$/m);
  assert.doesNotMatch(workflow, /pull_request_target|secrets\.|actions\/checkout/);
  assert.match(workflow, /^permissions: \{\}$/m);

  const [metadata, automerge] = workflow.split(/^  automerge:$/m);
  assert.equal((workflow.match(/^\s+uses:/gm) || []).length, 1, "one action, in the read-only job");
  assert.match(metadata, /uses: dependabot\/fetch-metadata@[0-9a-f]{40} # v\d/);
  assert.match(metadata, /permissions:\n      pull-requests: read\n    outputs:/);
  assert.match(metadata, /user\.login == 'dependabot\[bot\]'/);
  assert.match(metadata, /head\.repo\.full_name == github\.repository/);
  assert.doesNotMatch(automerge, /uses:/);
  assert.match(automerge, /needs: metadata/);
});

test("the job that merges reads values from the pull request only through its environment", () => {
  const scripts = workflow.split(/^\s+run: /m).slice(1).join("\n");
  assert.doesNotMatch(scripts, /\$\{\{/, "an expression inside a script would run text from the pull request");
});

test("the merge takes only the checked commit and then starts the gates on main", () => {
  assert.match(workflow, /gh pr merge "\$PR_NUMBER" --repo "\$GITHUB_REPOSITORY" --squash --match-head-commit "\$HEAD_SHA"\n\s+echo "merged=true"/);
  assert.doesNotMatch(workflow, /--delete-branch/, "a failed branch delete would skip the run on main");
  assert.match(workflow, /if: steps\.merge\.outputs\.merged == 'true'\n\s+run: gh workflow run deploy\.yml --repo "\$GITHUB_REPOSITORY" --ref main/);
  assert.match(workflow, /case "\$HEAD_REF" in dependabot\/npm_and_yarn\/\*\) npm_branch=true ;; esac/);
  assert.match(workflow, /\[ "\$npm_branch" != "true" \] \|\| \[ "\$only_packages" != "true" \] \|\| \[ "\$small" != "true" \]/);
});

test("only patches and minors from version 1 count as small updates", { skip: hasJq ? false : "jq is not installed" }, async () => {
  const rule = programAfter(`small="$(jq -r '`);
  const small = (list) => answer(rule, typeof list === "string" ? list : JSON.stringify(list));

  assert.equal(await small([update("patch", "1.2.4")]), true);
  assert.equal(await small([update("minor", "7.5.0")]), true);
  assert.equal(await small([update("minor", "v2.3.0")]), true);
  assert.equal(await small([update("patch", "0.41.8")]), true, "a patch of a 0.x package is inside the range package.json allows");
  assert.equal(await small([update("minor", "4.6.0"), update("patch", "11.0.2")]), true);

  assert.equal(await small([update("minor", "0.42.8")]), false, "a minor of a 0.x package may break");
  assert.equal(await small([update("patch", "0.0.9")]), false, "a patch of a 0.0.x package may break");
  assert.equal(await small([update("major", "8.0.0")]), false);
  assert.equal(await small([update("patch", "1.2.4"), update("minor", "0.188.0")]), false);
  assert.equal(await small([update("patch", "1.2.4"), update("major", "8.0.0")]), false);
});

test("an update that cannot be read never counts as small", { skip: hasJq ? false : "jq is not installed" }, async () => {
  const rule = programAfter(`small="$(jq -r '`);
  const small = (list) => answer(rule, typeof list === "string" ? list : JSON.stringify(list));

  for (const version of ["", "abc123", null, undefined, "1", "1.2"]) {
    assert.equal(await small([update("patch", version)]), false, `patch with version ${JSON.stringify(version)}`);
    assert.equal(await small([update("minor", version)]), false, `minor with version ${JSON.stringify(version)}`);
  }
  assert.equal(await small([{ updateType: "", newVersion: "1.2.4" }]), false);
  assert.equal(await small([{ newVersion: "1.2.4" }]), false);
  assert.equal(await small([update("patch", "1.2.4"), "text"]), false);
  assert.equal(await small([]), false);
  assert.equal(await small({ a: update("patch", "1.2.4") }), false, "an object of updates is not a list");
  assert.equal(await small(""), false);
  assert.equal(await small("oops"), false);
  assert.equal(await small("[] []"), false);
});

test("a pull request that changes anything but the two package files is not merged", { skip: hasJq ? false : "jq is not installed" }, async () => {
  const rule = programAfter(`files?per_page=100" --jq '`);
  const onlyPackages = (names) => answer(rule, JSON.stringify(names.map((filename) => ({ filename }))));

  assert.equal(await onlyPackages(["package.json", "package-lock.json"]), true);
  assert.equal(await onlyPackages(["package-lock.json"]), true);
  assert.equal(await onlyPackages([]), false);
  assert.equal(await onlyPackages(["package-lock.json", ".github/workflows/dependabot-automerge.yml"]), false);
  assert.equal(await onlyPackages(["workers/news-llm/package.json"]), false);
  assert.equal(await answer(rule, "not json"), false);
});

test("every dependency below version 1 has its own pull request", async () => {
  const [config, manifest] = await Promise.all([read(".github/dependabot.yml"), read("package.json").then(JSON.parse)]);
  const excluded = config.slice(config.indexOf("exclude-patterns:"), config.indexOf("update-types:"));
  const young = Object.entries({ ...manifest.dependencies, ...manifest.devDependencies })
    .filter(([, range]) => /^[\^~]?0\./.test(range))
    .map(([name]) => name);

  assert.ok(young.length > 0);
  for (const name of young) {
    assert.ok(excluded.includes(`- "${name}"`), `${name} is below version 1: add it to exclude-patterns in .github/dependabot.yml`);
  }
});

test("Dependabot opens its pull requests away from the news runs", async () => {
  const [config, news] = await Promise.all([read(".github/dependabot.yml"), read(".github/workflows/ai-news.yml")]);
  const times = [...config.matchAll(/time: "(\d\d):(\d\d)"/g)].map(([, hours, minutes]) => Number(hours) * 60 + Number(minutes));
  const runs = [...news.matchAll(/cron: '(\d+) (\d+) \* \* \*'/g)].map(([, minutes, hours]) => Number(hours) * 60 + Number(minutes));

  assert.equal(times.length, 2, "both ecosystems have a fixed time");
  assert.ok(runs.length > 0);
  for (const time of times) {
    for (const run of runs) assert.ok(Math.abs(time - run) >= 90, "at least 90 minutes between an update and a news run");
  }
});
