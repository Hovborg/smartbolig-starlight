// The Workers AI agent: the site is searched first (a closing such as "Tak"
// aside), then one model run writes the answer. The model gets no tools. The run itself is model-runs.js.

import { extractModelAnswer } from "./answer.js";
import { createModelRunner } from "./model-runs.js";
import { buildSystemPrompt, withOfficialReference, withSmartboligReference } from "./prompt.js";
import { hasEarlierQuestion, hasSmartHomeWord, isClosing, latestQuestion } from "./search-need.js";
import { requestedHomeAssistantYamlShape } from "./yaml-request.js";

const UNAVAILABLE = { searchState: "unavailable", supplied: null };
const NOTHING = { searchState: "nothing", supplied: null };
const CONTINUED = { searchState: "continued", supplied: null };

// Decides what the model is told about the site, with one search at most. The
// rules about wording are in search-need.js.
// - A closing ("Tak for det", "Okay") is not searched for.
// - Every other message is searched for alone. A result that is good enough is
//   used; the pages of an earlier question are never used for a later message.
// Returns the state the prompt tells the model and the result to hand over:
// "supplied" (pages found), "nothing" (a first message without pages),
// "continued" (a later message without pages: the model has the conversation
// to build on) or "unavailable" (the search failed).
async function lookUpSite(searchSmartbolig, messages) {
  const latest = latestQuestion(messages);
  const withoutPages = hasEarlierQuestion(messages) ? CONTINUED : NOTHING;
  if (isClosing(latest)) return withoutPages;

  const found = await searchSmartbolig(latest, { always: hasSmartHomeWord(latest) });
  if (found.unavailable) return UNAVAILABLE;
  if (!found.results?.length) return withoutPages;
  return { searchState: "supplied", supplied: found };
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
