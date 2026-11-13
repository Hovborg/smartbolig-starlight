// Builds the copy for one issue from a ranked candidate pool. Candidates are
// processed in order until `target` stories have passed; the rest of the pool
// are reserves for stories that are dropped.
import { CallBudgetExceeded } from "./errors.mjs";
import { fallbackLede, produceLede } from "./lede.mjs";
import { produceStory } from "./story.mjs";

// One story that the models cannot handle is dropped like any other. Two in a
// row means the provider itself is down, and the run fails loudly.
const MAX_CONSECUTIVE_MODEL_ERRORS = 2;

export async function produceIssue({ date, candidates, target, minimum, chat, log = console.log }) {
  const passed = [];
  const dropped = [];
  let modelErrors = 0;

  for (const item of candidates) {
    if (passed.length >= target) break;
    log(`Story: ${item.title}`);
    let result;
    try {
      result = await produceStory({ date, item, chat, log });
      modelErrors = 0;
    } catch (error) {
      if (error instanceof CallBudgetExceeded) {
        log(`  ${error.message}; no further stories are attempted`);
        break;
      }
      modelErrors += 1;
      if (modelErrors >= MAX_CONSECUTIVE_MODEL_ERRORS) throw error;
      result = { status: "dropped", reasons: [`Model error: ${error.message}`], attempts: 1 };
    }
    if (result.status === "passed") {
      passed.push({ item, story: result.story });
      log(`  passed the fact check after ${result.attempts} attempt(s)`);
    } else {
      dropped.push({ title: item.title, url: item.canonicalUrl || item.url, reasons: result.reasons });
      log(`  dropped after ${result.attempts} attempt(s)`);
    }
  }

  if (passed.length < minimum) {
    return {
      status: "skip",
      reason: `${passed.length} of ${passed.length + dropped.length} stories passed the fact check; ${minimum} are required.`,
      dropped,
    };
  }

  let lede;
  try {
    lede = await produceLede({ stories: passed, chat, log });
  } catch (error) {
    // The stories are already fact-checked; a lede the models cannot deliver
    // must not cost the issue.
    log(`  lede not produced (${error.message}); using the factual fallback lede`);
    lede = { lede: fallbackLede(passed), source: "fallback" };
  }

  return {
    status: "publish",
    items: passed.map(({ item }) => item),
    // Only the fact check may set this marker; the renderer copies it to frontmatter.
    copy: { lede: lede.lede, stories: passed.map(({ story }) => story), semanticReview: "passed" },
    ledeSource: lede.source,
    dropped,
  };
}
