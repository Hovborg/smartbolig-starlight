// Rules that hold for every GitHub workflow in the repository.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

const DIR = new URL("../.github/workflows/", import.meta.url);
const files = (await readdir(DIR)).filter((name) => /\.ya?ml$/.test(name));
const workflows = await Promise.all(files.map(async (name) => ({ name, text: await readFile(new URL(name, DIR), "utf8") })));

test("every action in every workflow is pinned to a commit", () => {
  assert.ok(workflows.length >= 4, "the workflows were found");
  for (const { name, text } of workflows) {
    const uses = [...text.matchAll(/^\s*(?:- )?uses:\s*(\S+)/gm)].map((match) => match[1]);
    for (const target of uses) {
      // A workflow in this repository, or owner/repo(/path)@<40 hex digits>.
      assert.match(target, /^(\.\/\.github\/workflows\/[\w.-]+\.yml|[\w.-]+\/[\w.-]+(\/[\w./-]+)?@[0-9a-f]{40})$/, `${name}: ${target}`);
    }
  }
});

test("no job gets more than it asks for: no permissions by default, or every job names its own", () => {
  for (const { name, text } of workflows) {
    assert.ok(!/permissions:\s*write-all/.test(text), `${name} does not ask for everything`);
    if (/^permissions: \{\}$/m.test(text)) continue;
    const jobs = text.slice(text.search(/^jobs:$/m));
    const jobCount = (jobs.match(/^  [\w-]+:\s*$/gm) ?? []).length;
    const ownPermissions = (jobs.match(/^    permissions:/gm) ?? []).length;
    assert.ok(jobCount > 0 && ownPermissions === jobCount, `${name}: ${ownPermissions} of ${jobCount} jobs name their permissions`);
  }
});
