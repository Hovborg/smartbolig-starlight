const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const GIT_DATE_MARKER = "__SMARTBOLIG_DATE__";
const DOCS_PREFIX = "src/content/docs/";

function validDate(value) {
  return DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function extractFrontmatterLastmod(source) {
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  const lastUpdated = frontmatter.match(/^lastUpdated:\s*"?(\d{4}-\d{2}-\d{2})"?\s*$/m)?.[1];
  const published = frontmatter.match(/^date:\s*"?(\d{4}-\d{2}-\d{2})"?\s*$/m)?.[1];
  const value = lastUpdated || published;
  return value && validDate(value) ? value : undefined;
}

export function parseGitLastmodLog(log) {
  const dates = new Map();
  let currentDate;

  for (const rawLine of log.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith(GIT_DATE_MARKER)) {
      const candidate = line.slice(GIT_DATE_MARKER.length);
      currentDate = validDate(candidate) ? candidate : undefined;
      continue;
    }

    if (
      currentDate
      && line.startsWith(DOCS_PREFIX)
      && line.endsWith(".mdx")
      && !dates.has(line)
    ) {
      dates.set(line, currentDate);
    }
  }

  return dates;
}

export function contentRelativePathToUrl(relative) {
  const slug = relative
    .replace(/\\/g, "/")
    .replace(/\.mdx$/, "")
    .replace(/\/index$/, "")
    .replace(/^index$/, "");
  return `https://smartbolig.net/${slug}${slug ? "/" : ""}`;
}

export const gitLastmodLogArgs = [
  "log",
  `--format=${GIT_DATE_MARKER}%cs`,
  "--name-only",
  "--",
  "src/content/docs",
];
