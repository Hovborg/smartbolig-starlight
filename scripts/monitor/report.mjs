// Results to Markdown. Pure. The report is the body of a GitHub issue, so it
// holds only each check's name, expectation and short observation.

const MAX_CELL = 240;
const oneLine = (text) => String(text).replace(/\s+/g, " ").slice(0, MAX_CELL);
const cell = (text) => oneLine(text).replace(/\|/g, "\\|");
// What the site sent goes in a code span, so it stays text: "<h1>" is shown
// as written, and a "@name", a link or "#1" in a header or an address cannot
// become a mention, a link or an issue reference.
const quoted = (text) => `\`${cell(oneLine(text).replace(/`/g, "'")) || "-"}\``;

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
    ...results.map((r) => `| ${r.ok ? "pass" : "**FAIL**"} | ${cell(r.name)} | ${quoted(r.expected)} | ${quoted(r.seen)} |`),
    "",
    "What to do: docs/overvaagning.md.",
    "",
  ];
  return lines.join("\n");
}
