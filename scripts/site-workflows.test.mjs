// Rules that hold for every GitHub workflow in the repository.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

const DIR = new URL("../.github/workflows/", import.meta.url);
const files = (await readdir(DIR)).filter((name) => /\.ya?ml$/.test(name));
const workflows = await Promise.all(files.map(async (name) => ({ name, text: await readFile(new URL(name, DIR), "utf8") })));

// A workflow in this repository, or owner/repo(/path)@<40 hex digits>.
const PINNED = /^(\.\/\.github\/workflows\/[\w.-]+\.yml|[\w.-]+\/[\w.-]+(\/[\w./-]+)?@[0-9a-f]{40})$/;

/** What every `uses` key in a workflow points at, however the key is written. Comment lines are skipped. */
export function usedActions(text) {
  const code = text.replace(/^\s*#.*$/gm, "");
  return [...code.matchAll(/(?:^|[\s{,])["']?uses["']?\s*:\s*["']?([^\s"'},#]+)/gm)].map((match) => match[1]);
}

/** How many jobs a workflow has, and how many of them name their own permissions. */
export function jobPermissions(text) {
  const jobs = text.slice(text.search(/^jobs:\s*(#.*)?$/m));
  return {
    jobs: (jobs.match(/^  [\w-]+:\s*(#.*)?$/gm) ?? []).length,
    own: (jobs.match(/^    permissions:/gm) ?? []).length,
  };
}

test("every action in every workflow is pinned to a commit", () => {
  assert.ok(workflows.length >= 4, "the workflows were found");
  for (const { name, text } of workflows) {
    const uses = usedActions(text);
    assert.ok(uses.length > 0, `${name} uses an action`);
    for (const target of uses) assert.match(target, PINNED, `${name}: ${target}`);
  }
});

test("the rule finds an action however the key is written", () => {
  const pin = `actions/checkout@${"a".repeat(40)}`;
  for (const line of ["      - uses: x/y@v6", "      - { uses: x/y@v6 }", '      "uses": x/y@v6', "      uses : x/y@v6", "      - uses: 'x/y@v6'"]) {
    assert.deepEqual(usedActions(line), ["x/y@v6"], line);
  }
  assert.deepEqual(usedActions(`      - uses: ${pin} # v6`), [pin]);
  assert.deepEqual(usedActions("      # uses: x/y@v6"), [], "a comment line is not an action");
  for (const target of ["x/y@v6", "x/y@main", "docker://alpine:3", "./.github/actions/x", `x/y@${"a".repeat(39)}`]) {
    assert.doesNotMatch(target, PINNED, target);
  }
  assert.match(pin, PINNED);
  assert.match("./.github/workflows/deploy.yml", PINNED);
});

test("no job gets more than it asks for: no permissions by default, or every job names its own", () => {
  for (const { name, text } of workflows) {
    assert.ok(!/permissions:\s*write-all/.test(text), `${name} does not ask for everything`);
    if (/^permissions: \{\}$/m.test(text)) continue;
    const { jobs, own } = jobPermissions(text);
    assert.ok(jobs > 0 && own === jobs, `${name}: ${own} of ${jobs} jobs name their permissions`);
  }
});

test("a job is counted also when a comment follows its name", () => {
  const text = "jobs:\n  one: # first\n    permissions:\n      contents: read\n  two:\n    runs-on: x\n";
  assert.deepEqual(jobPermissions(text), { jobs: 2, own: 1 });
});
