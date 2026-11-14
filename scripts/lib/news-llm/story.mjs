// One story, start to finish: draft, number grounding, independent fact check,
// targeted correction. A story that cannot be corrected is dropped; it never
// takes the other stories down with it.
import { extractJson } from "./json.mjs";
import { ungroundedNumbers, storyText } from "./grounding.mjs";
import { MAX_FEEDBACK_CHARS, MAX_FEEDBACK_REASONS, MAX_STORY_REPAIRS } from "./limits.mjs";
import { buildStoryReviewPrompt } from "./prompt-review.mjs";
import { buildStoryPrompt } from "./prompt-write.mjs";
import { sourceBlock } from "./source-block.mjs";
import { validateStory, validateVerdict } from "./validate.mjs";

// Feedback travels back to the writer as data: bounded, and without angle
// brackets so a reason cannot close the delimiter around it.
export function boundFeedback(reasons) {
  return reasons
    .map((reason) => String(reason || "").replace(/[<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_FEEDBACK_CHARS))
    .filter(Boolean)
    .slice(0, MAX_FEEDBACK_REASONS);
}

const issueLine = (issue) => `${issue.field}: "${issue.claim}" is ${issue.type}. Source: ${issue.source}`;

// Drafts the story. A format problem (word cap, markdown, bad JSON) buys one
// retry; a second failure drops the story.
async function draftStory({ date, item, chat, feedback }) {
  let formatFeedback = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const prompt = buildStoryPrompt({ date, item, feedback: boundFeedback([...(feedback || []), ...formatFeedback]) });
    const { text, model } = await chat({ role: "writer", ...prompt });
    let problems;
    try {
      const story = extractJson(text);
      problems = validateStory(story);
      if (problems.length === 0) return { story, model };
    } catch (error) {
      problems = [error.message];
    }
    formatFeedback = problems.map((problem) => `Format error in your reply: ${problem}. Return only the JSON object and respect every word cap.`);
  }
  return { problems: formatFeedback };
}

// A malformed verdict is not a pass. It buys one fresh review, then counts as
// a rejection.
async function reviewStory({ date, item, story, chat, writerModel }) {
  const prompt = buildStoryReviewPrompt({ date, item, story });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { text } = await chat({ role: "reviewer", avoid: writerModel, ...prompt });
    try {
      return validateVerdict(extractJson(text));
    } catch {
      // try once more
    }
  }
  return { pass: false, issues: [{ field: "story", claim: "(fact check gave no valid verdict)", type: "unsupported", source: "not in source" }] };
}

export async function produceStory({ date, item, chat, log = () => {} }) {
  let feedback = [];
  for (let attempt = 0; attempt <= MAX_STORY_REPAIRS; attempt += 1) {
    const draft = await draftStory({ date, item, chat, feedback });
    if (!draft.story) return { status: "dropped", reasons: draft.problems, attempts: attempt + 1 };

    const missing = ungroundedNumbers(storyText(draft.story), sourceBlock(item));
    if (missing.length > 0) {
      feedback = missing.map((number) => `The number ${number} does not occur in the source. Remove it or use the exact number the source gives.`);
      log(`  number check: ${missing.join(", ")} not in the source`);
      continue;
    }

    const verdict = await reviewStory({ date, item, story: draft.story, chat, writerModel: draft.model });
    if (verdict.pass) return { status: "passed", story: draft.story, attempts: attempt + 1 };
    feedback = verdict.issues.map(issueLine);
    log(`  fact check: ${verdict.issues.length} issue(s), e.g. ${boundFeedback(feedback)[0]}`);
  }
  return { status: "dropped", reasons: boundFeedback(feedback), attempts: MAX_STORY_REPAIRS + 1 };
}
