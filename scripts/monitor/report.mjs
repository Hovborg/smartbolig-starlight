// Results to Markdown. Pure. The report is the body of a GitHub issue, so it
// holds only each check's name, expectation and short observation.

const cell = (text) => String(text).replace(/\s+/g, " ").replace(/\|/g, "\\|").slice(0, 240);

/**
 * @param {{name: string, expected: string, ok: boolean, seen: string}[]} results
 * @param {{base: string, at: Date, runUrl?: string}} meta
 */
export function renderReport(results, { base, at, runUrl }) {
  const failing = results.filter((result) => !result.ok);
  const lines = [
    failing.length
      ? `${failing.length} of ${results.length} checks fail on ${base}.`
      : `All ${results.length} checks pass on ${base}.`,
    "",
    `Checked at ${at.toISOString().slice(0, 16).replace("T", " ")} UTC.${runUrl ? ` Run: ${runUrl}` : ""}`,
    "",
    "| Result | Check | Expected | Seen |",
    "|---|---|---|---|",
    ...results.map((r) => `| ${r.ok ? "pass" : "**FAIL**"} | ${cell(r.name)} | ${cell(r.expected)} | ${cell(r.seen)} |`),
    "",
    "What to do: docs/overvaagning.md.",
    "",
  ];
  return lines.join("\n");
}
