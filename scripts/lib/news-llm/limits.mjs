// Shared limits for the news copy pipeline. Change a value here only.

// Upper word bounds per field and locale. The renderer escapes everything
// again, so these keep each story a brief; they are not a security control.
export const WORD_LIMITS = { lede: 90, what: 90, why: 70, verify: 60, uncertainty: 55 };
// The quality gate rejects fields under 8 words; ask the writer for a margin.
export const MIN_FIELD_WORDS = 12;

export const STORY_FIELDS = ["what", "why", "verify", "uncertainty"];
export const LOCALES = ["en", "da"];

// How much of each source the models see. A cut-off page is marked so neither
// the writer nor the reviewer treats the missing part as evidence.
export const SUMMARY_CHARS = 1500;
export const PAGE_TEXT_CHARS = 6000;
export const TRUNCATION_MARK = "[source text truncated]";

// Attempts per story: one draft plus this many corrections, each reviewed anew.
export const MAX_STORY_REPAIRS = 2;
export const MAX_LEDE_REPAIRS = 1;
// Reviewer reasons handed back to the writer as data.
export const MAX_FEEDBACK_REASONS = 6;
export const MAX_FEEDBACK_CHARS = 480;
// Hard ceiling on model calls in one run (cost and runaway guard).
export const MAX_CALLS_PER_RUN = 40;
// Neurons one run may spend. The relay enforces the daily ceiling; this keeps
// one run from using all of it. Measured cost per run: docs/nyhedsflow.md.
export const MAX_NEURONS_PER_RUN = 6000;

export function clip(value, maxChars) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > maxChars ? `${text.slice(0, maxChars)} ${TRUNCATION_MARK}` : text;
}

export function wordCount(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}
