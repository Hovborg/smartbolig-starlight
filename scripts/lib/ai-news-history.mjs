// Reads the published archive: recent issues for duplicate detection, and the
// list of issue dates for the index page.
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { canonicalizeUrl } from "./ai-news-discovery.mjs";
import { dateWindow } from "./ai-news-scoring.mjs";

const ISSUE_FILE = /^(\d{4}-\d{2}-\d{2})\.mdx$/;

function parseYamlString(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value.replace(/^['"]|['"]$/g, "");
  }
}

export async function loadRecentHistory({ newsDir, targetDate, days = 14 }) {
  if (!existsSync(newsDir)) return [];
  const { start, end } = dateWindow(targetDate, days);
  const history = [];

  for (const name of await readdir(newsDir)) {
    const match = name.match(ISSUE_FILE);
    if (!match || match[1] === targetDate) continue;
    const date = new Date(`${match[1]}T12:00:00Z`);
    if (date < start || date > end) continue;
    const content = await readFile(path.join(newsDir, name), "utf8");
    const frontmatter = content.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] || "";
    const title = parseYamlString(frontmatter.match(/^title:\s*(.+)$/m)?.[1] || "");
    const storyFingerprint = frontmatter.match(/^\s*storyFingerprint:\s*['"]?([a-f0-9]{64})/m)?.[1];
    const sourceSetFingerprint = frontmatter.match(/^\s*sourceSetFingerprint:\s*['"]?([a-f0-9]{64})/m)?.[1];
    const canonicalUrls = [...frontmatter.matchAll(/^\s*-\s*["']?(https?:\/\/[^\s"']+)/gm)]
      .map((sourceMatch) => canonicalizeUrl(sourceMatch[1]))
      .filter(Boolean);
    for (const canonicalUrl of canonicalUrls.length > 0 ? canonicalUrls : [""]) {
      history.push({ title, canonicalUrl, storyFingerprint, sourceSetFingerprint, date: match[1] });
    }
  }
  return history;
}

// Issue dates, newest first. One implementation, shared with the workflow.
export { issueDates as listIssueDates } from "./ai-news-issue-files.mjs";
