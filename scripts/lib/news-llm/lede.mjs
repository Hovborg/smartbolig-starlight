// The issue lede: model-written and fact-checked against the passed stories,
// with a plain factual fallback so a failed lede never costs the whole issue.
import { CallBudgetExceeded } from "./errors.mjs";
import { ungroundedNumbers, storyText } from "./grounding.mjs";
import { extractJson } from "./json.mjs";
import { MAX_LEDE_REPAIRS } from "./limits.mjs";
import { buildLedePrompt, buildLedeReviewPrompt } from "./prompt-lede.mjs";
import { boundFeedback } from "./story.mjs";
import { validateLede, validateVerdict } from "./validate.mjs";

const providerName = (item) => String(item.sourceName || item.source?.name || "").replace(/\s+(?:releases|news)$/i, "").trim();

// Built only from metadata (count and publishers), so it needs no fact check.
export function fallbackLede(stories) {
  const names = [...new Set(stories.map(({ item }) => providerName(item)).filter(Boolean))];
  const list = (and) => (names.length > 1 ? `${names.slice(0, -1).join(", ")} ${and} ${names.at(-1)}` : names[0] || "");
  return {
    en: `Today's issue covers ${stories.length} updates from ${list("and")}. Each story separates what the source documents from what it leaves open.`,
    da: `Dagens udgave dækker ${stories.length} opdateringer fra ${list("og")}. Hver historie skelner mellem det, kilden dokumenterer, og det, den lader stå åbent.`,
  };
}

export async function produceLede({ stories, chat, log = () => {} }) {
  const evidence = stories.map(({ item, story }) => `${item.title}\n${storyText(story)}`).join("\n");
  let feedback = [];
  for (let attempt = 0; attempt <= MAX_LEDE_REPAIRS; attempt += 1) {
    let text;
    let model;
    try {
      ({ text, model } = await chat({ role: "writer", ...buildLedePrompt({ stories, feedback }) }));
    } catch (error) {
      // The stories are already fact-checked; a writer outage must not cost the issue.
      if (error instanceof CallBudgetExceeded) throw error;
      feedback = [`The writer was unavailable: ${error.message}`];
      break;
    }
    let lede;
    try {
      lede = extractJson(text);
    } catch (error) {
      feedback = [`Format error: ${error.message}`];
      continue;
    }
    const problems = [
      ...validateLede(lede),
      ...ungroundedNumbers(`${lede.en}\n${lede.da}`, evidence).map((number) => `The number ${number} is not in the stories.`),
    ];
    if (problems.length > 0) {
      feedback = boundFeedback(problems);
      continue;
    }
    try {
      const { text: verdictText } = await chat({ role: "reviewer", avoid: model, ...buildLedeReviewPrompt({ stories, lede }) });
      const verdict = validateVerdict(extractJson(verdictText));
      if (verdict.pass) return { lede: { en: lede.en, da: lede.da }, source: "llm" };
      feedback = boundFeedback(verdict.issues.map((issue) => `${issue.field}: "${issue.claim}" is ${issue.type}. Stories: ${issue.source}`));
    } catch (error) {
      if (error instanceof CallBudgetExceeded) throw error;
      feedback = ["The fact check gave no valid verdict."];
    }
  }
  log(`  lede not accepted (${feedback[0] || "no reason"}); using the factual fallback lede`);
  return { lede: fallbackLede(stories), source: "fallback" };
}
