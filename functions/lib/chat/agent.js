// The Workers AI agent: the site is searched first, every time, then one model
// run writes the answer. The model gets no tools. The run itself is model-runs.js.

import { extractModelAnswer } from "./answer.js";
import { createModelRunner } from "./model-runs.js";
import { buildSystemPrompt, withOfficialReference, withSmartboligReference } from "./prompt.js";
import { hasSmartHomeWord, isFollowUp, isThanks, joinedQuery, latestQuestion, standsForAThing } from "./search-need.js";
import { requestedHomeAssistantYamlShape } from "./yaml-request.js";

const UNAVAILABLE = { searchState: "unavailable", supplied: null };
const NOTHING = { searchState: "nothing", supplied: null };
const stateOf = (found) => {
  if (found.unavailable) return UNAVAILABLE;
  if (found.weak || !found.results?.length) return NOTHING;
  return { searchState: "supplied", supplied: found };
};

// Decides what the site is searched for, at most twice per question. The rules
// about wording are in search-need.js.
// - A question is searched alone first, so one the site answers on its own
//   never gets the old topic's pages.
// - When that finds nothing and the message leans on the one before it, the two
//   are searched together; the pages are then the earlier question's.
// - A message about a thing only the conversation has named ("Virker den med
//   Home Assistant?") is searched together with the message before it first.
// - Thanks and goodbyes are not searched for.
// Returns the state the prompt tells the model and the result to hand over:
// "supplied" (pages found), "nothing" (the search ran and found nothing) or
// "unavailable" (a search failed).
async function lookUpSite(searchSmartbolig, messages) {
  const latest = latestQuestion(messages);
  if (isThanks(latest)) return NOTHING;
  const joined = joinedQuery(messages);
  const searchAlone = () => searchSmartbolig(latest, { always: hasSmartHomeWord(latest) });

  if (joined && standsForAThing(latest)) {
    const together = await searchSmartbolig(joined);
    return together.unavailable || !together.weak ? stateOf(together) : stateOf(await searchAlone());
  }

  const alone = await searchAlone();
  if (alone.unavailable || !alone.weak) return stateOf(alone);
  if (!joined || !isFollowUp(latest, alone.unknownTerms)) return NOTHING;
  return stateOf(await searchSmartbolig(joined));
}

export function createWorkersAgent(dependencies = {}) {
  const aiRunImpl =
    dependencies.aiRunImpl ||
    ((binding, model, input, options) => binding.run(model, input, options));

  // `live` is set for a streamed request: live.stage(name) reports what happens
  // now ("searching", "writing", "revising"), live.text(chunk) gets the answer
  // while it is written and live.signal aborts when the visitor leaves.
  return async function runWorkersAgent({
    env,
    messages,
    locale,
    searchSmartbolig,
    officialEvidence,
    onModelFallback,
    live,
  }) {
    const latestUserContent = latestQuestion(messages);
    const runModel = createModelRunner({
      aiRunImpl,
      binding: env.AI,
      latestUserContent,
      live,
      onModelFallback,
    });

    let searchState = "unavailable";
    let supplied = null;
    if (searchSmartbolig) {
      live?.stage("searching");
      ({ searchState, supplied } = await lookUpSite(searchSmartbolig, messages));
    }

    live?.stage("writing");
    const system = {
      role: "system",
      content: buildSystemPrompt(locale, searchState, requestedHomeAssistantYamlShape(latestUserContent)),
    };
    const modelMessages = [system, ...messages];
    const execution = await runModel(
      withOfficialReference(supplied ? withSmartboligReference(modelMessages, supplied) : modelMessages, officialEvidence),
    );

    const answer = extractModelAnswer(execution.result);
    if (!answer) throw new Error("EmptyModelResponse");
    return { answer, diagnostics: execution.diagnostics };
  };
}
