import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { changedPaths, unexpectedPaths } from "./ai-news-ci-stage.mjs";
import { outcome, plain, renderReport } from "./ai-news-run-report.mjs";
import { staleness } from "./ai-news-staleness.mjs";
import { daysBetween, issuePaths } from "./lib/ai-news-issue-files.mjs";

const workflow = await readFile(new URL("../.github/workflows/ai-news.yml", import.meta.url), "utf8");
const step = (name) => {
  const index = workflow.indexOf(`- name: ${name}`);
  assert.notEqual(index, -1, `missing step: ${name}`);
  return index;
};

test("the news workflow grants nothing by default and pins every action", () => {
  assert.match(workflow, /^permissions: \{\}$/m);
  const uses = [...workflow.matchAll(/uses: (\S+)/g)].map((match) => match[1]);
  assert.ok(uses.length >= 4);
  for (const target of uses) assert.match(target, /^(\.\/\.github\/workflows\/deploy\.yml|[\w-]+\/[\w-]+@[0-9a-f]{40})$/);
  assert.equal((workflow.match(/persist-credentials: false/g) || []).length, 2);
});

test("the model key is only visible to the writing step", () => {
  assert.equal((workflow.match(/secrets\.AI_NEWS_LLM_KEY/g) || []).length, 1);
  assert.equal((workflow.match(/secrets\.AI_NEWS_LLM_URL/g) || []).length, 1);
  const write = step("Write and fact-check the issue");
  assert.ok(workflow.indexOf("secrets.AI_NEWS_LLM_KEY") > write);
  assert.ok(workflow.indexOf("secrets.AI_NEWS_LLM_KEY") < step("Report the outcome"));
});

test("every gate runs before the commit, and the commit is limited to main", () => {
  const push = step("Commit and push the issue");
  for (const gate of [
    "npm run ai-news:test",
    "npm run ai-news:validate",
    'npm run ai-news:quality -- --date "$AI_NEWS_DATE"',
    'npm run ai-news:pending-images -- --date "$AI_NEWS_DATE" --fail-on-pending',
    "npm run site:test",
    "npm run build",
    "npm run seo:validate",
  ]) {
    const index = workflow.indexOf(gate);
    assert.ok(index !== -1 && index < push, `gate must run before the commit: ${gate}`);
  }
  assert.ok(workflow.includes("if: steps.report.outputs.status == 'publish' && env.DRY_RUN != 'true' && github.ref == 'refs/heads/main'"));
  assert.ok(workflow.indexOf("node scripts/ai-news-ci-stage.mjs") > push);
  assert.doesNotMatch(workflow, /git add /);
  assert.doesNotMatch(workflow, /push[^\n]*--force/);
});

test("a failed day does not fail the workflow, and only the watch job notifies", () => {
  assert.match(workflow, /publish:\s*\n\s+runs-on: ubuntu-latest\s*\n\s+timeout-minutes: \d+\s*\n(?:\s+#[^\n]*\n)+\s+continue-on-error: true/);
  assert.equal((workflow.match(/issues: write/g) || []).length, 1);
  assert.ok(workflow.indexOf("issues: write") > workflow.indexOf("\n  watch:"));
  assert.match(workflow, /uses: \.\/\.github\/workflows\/deploy\.yml\s*\n\s+with:\s*\n\s+ref: \$\{\{ needs\.publish\.outputs\.ref \}\}/);
});

test("only the files of one issue may be staged", () => {
  const allowed = issuePaths("2026-11-13");
  assert.equal(allowed.length, 9);
  const status = " M src/content/docs/da/ai/nyheder/index.mdx\n?? src/content/docs/da/ai/nyheder/2026-11-13.mdx\n?? scripts/evil.mjs\nR  old.mdx -> src/content/docs/en/ai/nyheder/2026-11-13.mdx\n";
  const changed = changedPaths(status);
  assert.deepEqual(unexpectedPaths(changed, allowed), ["scripts/evil.mjs", "old.mdx"]);
  assert.deepEqual(unexpectedPaths(changedPaths("?? public/images/ai-news/2026-11-13-thumb.webp\n"), allowed), []);
  assert.deepEqual(unexpectedPaths(changedPaths("?? public/images/ai-news/2026-11-12.jpg\n"), allowed), ["public/images/ai-news/2026-11-12.jpg"]);
});

test("publishing counts as stalled on the third day without an issue", () => {
  assert.equal(daysBetween("2026-10-30", "2026-11-02"), 3);
  assert.deepEqual(staleness({ latest: "2026-11-13", today: "2026-11-13" }), { latest: "2026-11-13", days: 0, stale: false });
  assert.equal(staleness({ latest: "2026-11-11", today: "2026-11-13" }).stale, false);
  assert.equal(staleness({ latest: "2026-11-10", today: "2026-11-13" }).stale, true);
  assert.deepEqual(staleness({ latest: undefined, today: "2026-11-13" }), { latest: "", days: -1, stale: true });
});

test("the run report states the outcome and shows external text as plain text", () => {
  assert.equal(outcome({ status: "publish" }, "success"), "publish");
  assert.equal(outcome({ status: "skip" }, "success"), "skip");
  assert.equal(outcome({ status: "publish" }, "failure"), "failed");
  assert.equal(outcome(null, "success"), "failed");
  assert.equal(plain("[click](https://evil.example) <img> `x` | y"), "click https://evil.example img x y");

  const published = renderReport({ date: "2026-11-13", status: "publish", stories: 4, ledeSource: "llm", calls: 16, neurons: 4200, dropped: [] }, "publish");
  assert.match(published, /\*\*Published\*\* 4 fact-checked stories/);
  assert.match(published, /Model calls: 16\. Neurons: 4200\./);

  const skipped = renderReport({
    date: "2026-11-13",
    status: "skip",
    reason: "2 of 5 stories passed the fact check; 3 are required.",
    dropped: [{ title: "Evil [link](https://evil.example)", reasons: ["why.da: \"x\" is unsupported"] }],
  }, "skip");
  assert.match(skipped, /\*\*Nothing published\.\*\* 2 of 5 stories passed/);
  assert.doesNotMatch(skipped, /\]\(/);
  assert.match(renderReport(null, "failed"), /\*\*Failed\.\*\*/);
});
