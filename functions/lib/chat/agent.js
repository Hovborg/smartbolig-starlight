// The Workers AI agent: the site is searched first, every time, then one model
// run writes the answer. The model gets no tools. The run itself is model-runs.js.

import { extractModelAnswer } from "./answer.js";
import { createModelRunner } from "./model-runs.js";
import { buildSystemPrompt, withOfficialReference, withSmartboligReference } from "./prompt.js";
import { followUpQuery, hasSmartHomeWord, latestQuestion } from "./search-need.js";
import { requestedHomeAssistantYamlShape } from "./yaml-request.js";

// Searches the site for the latest question alone. Only when that finds nothing
// and the question points back ("Hvad koster den?") is it searched once more
// together with the user message before it. A change of topic is never mixed
// with the old one. Returns the state the prompt tells the model and the result
// to hand over: "supplied" (pages found), "nothing" (the search ran and found
// nothing about this question) or "unavailable" (the search failed).
async function lookUpSite(searchSmartbolig, messages) {
  const latest = latestQuestion(messages);
  const always = hasSmartHomeWord(latest);
  let found = await searchSmartbolig(latest, { always });
  if (!found.unavailable && found.weak) {
    const joined = followUpQuery(messages);
    const second = joined ? await searchSmartbolig(joined, { always: false }) : null;
    if (second && !second.unavailable && !second.weak) found = second;
  }
  if (found.unavailable) return { searchState: "unavailable", supplied: null };
  if (found.weak || !found.results?.length) return { searchState: "nothing", supplied: null };
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
