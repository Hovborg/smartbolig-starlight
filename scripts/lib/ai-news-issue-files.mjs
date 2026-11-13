// The files one news issue consists of, and the dates that already have one.
// Only node built-ins: the workflow's watch job runs this without npm ci.
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

const DATE_FILE = /^(\d{4}-\d{2}-\d{2})\.mdx$/;
export const NEWS_DIR = "src/content/docs/da/ai/nyheder";

// Everything a publishing run may add or change, as repo-relative paths.
export function issuePaths(date) {
  return [
    `src/content/docs/da/ai/nyheder/${date}.mdx`,
    `src/content/docs/en/ai/nyheder/${date}.mdx`,
    "src/content/docs/da/ai/nyheder/index.mdx",
    "src/content/docs/en/ai/nyheder/index.mdx",
    `public/images/ai-news/${date}.jpg`,
    `public/images/ai-news/${date}-16x9.jpg`,
    `public/images/ai-news/${date}-4x3.jpg`,
    `public/images/ai-news/${date}-1x1.jpg`,
    `public/images/ai-news/${date}-thumb.webp`,
  ];
}

// Issue dates, newest first.
export async function issueDates(newsDir) {
  if (!existsSync(newsDir)) return [];
  return (await readdir(newsDir))
    .map((name) => name.match(DATE_FILE)?.[1])
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a));
}

export function daysBetween(fromDate, toDate) {
  return Math.round((Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86_400_000);
}

export function copenhagenDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Copenhagen" }).format(now);
}
