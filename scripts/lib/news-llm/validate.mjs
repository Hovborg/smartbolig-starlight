// Shape and format checks for model output. These run before any fact check.
import { LOCALES, STORY_FIELDS, WORD_LIMITS, wordCount } from "./limits.mjs";
import { FAILURE_TYPES } from "./prompt-review.mjs";

function fieldProblems(value, limit, label) {
  if (typeof value !== "string" || value.trim().length === 0) return [`${label}: missing or empty`];
  const problems = [];
  if (wordCount(value) > limit) problems.push(`${label}: exceeds ${limit} words`);
  if (wordCount(value) < 8) problems.push(`${label}: under 8 words`);
  if (/https?:\/\//i.test(value)) problems.push(`${label}: contains a URL`);
  if (/\]\(|\[[^\]]*\]|^#|\n#|\*\*/m.test(value)) problems.push(`${label}: contains markdown syntax`);
  if (/<\/?[a-z][^>]*>/i.test(value)) problems.push(`${label}: contains an HTML tag`);
  return problems;
}

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export function validateStory(story) {
  if (!isRecord(story)) return ["story is not an object"];
  const problems = Object.keys(story)
    .filter((key) => !STORY_FIELDS.includes(key))
    .map((key) => `unexpected field: ${key}`);
  for (const field of STORY_FIELDS) {
    for (const locale of LOCALES) {
      problems.push(...fieldProblems(story[field]?.[locale], WORD_LIMITS[field], `${field}.${locale}`));
    }
  }
  return problems;
}

export function validateLede(lede) {
  if (!isRecord(lede)) return ["lede is not an object"];
  return LOCALES.flatMap((locale) => fieldProblems(lede[locale], WORD_LIMITS.lede, `lede.${locale}`));
}

// A verdict must be explicit: a pass has no issues, a rejection explains itself.
export function validateVerdict(verdict) {
  if (!isRecord(verdict) || typeof verdict.pass !== "boolean" || !Array.isArray(verdict.issues)) {
    throw new Error("Fact check returned an invalid verdict");
  }
  const issues = verdict.issues.map((issue) => {
    if (!isRecord(issue) || typeof issue.claim !== "string" || !issue.claim.trim()) {
      throw new Error("Fact check issue does not quote a claim");
    }
    return {
      field: String(issue.field || "story").slice(0, 40),
      claim: issue.claim.trim(),
      type: FAILURE_TYPES.includes(issue.type) ? issue.type : "unsupported",
      source: String(issue.source || "not in source").trim(),
    };
  });
  if (verdict.pass && issues.length > 0) throw new Error("Fact check cannot pass with outstanding issues");
  if (!verdict.pass && issues.length === 0) throw new Error("Fact check rejection did not explain its issues");
  return { pass: verdict.pass, issues };
}
