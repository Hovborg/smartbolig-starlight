// Renders one source as delimited, untrusted data. Writer and reviewer get the
// exact same block, so the reviewer never lacks evidence the writer had.
import { clip, PAGE_TEXT_CHARS, SUMMARY_CHARS } from "./limits.mjs";

// Angle brackets are removed so source text cannot close the delimiter.
const inert = (value) => String(value || "").replace(/[<>]/g, " ");

export function publishedDate(item) {
  if (item.published instanceof Date) return item.published.toISOString().slice(0, 10);
  return String(item.published || "").slice(0, 10);
}

export function evidenceText(item) {
  return `${item.title || ""}\n${item.summary || ""}\n${item.bodyText || ""}`;
}

export function sourceBlock(item) {
  const provider = item.sourceName || item.source?.name || "Unknown";
  return [
    "<source_material>",
    `provider: ${clip(inert(provider), 80)}`,
    `title: ${clip(inert(item.title), 200)}`,
    `published: ${publishedDate(item)}`,
    `summary: ${clip(inert(item.summary), SUMMARY_CHARS)}`,
    `page_text: ${clip(inert(item.bodyText), PAGE_TEXT_CHARS)}`,
    "</source_material>",
  ].join("\n");
}
