// The Workers AI agent: the site is searched first, every time, then one model
// run writes the answer. The model gets no tools. The run itself is model-runs.js.

import { extractModelAnswer } from "./answer.js";
import { createModelRunner } from "./model-runs.js";
import { buildSystemPrompt, withOfficialReference, withSmartboligReference } from "./prompt.js";
import { searchQuery, shouldRequireSmartboligSearch } from "./search-need.js";
import { requestedHomeAssistantYamlShape } from "./yaml-request.js";

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
    const latestUserContent = [...messages]
      .reverse()
      .find((message) => message.role === "user")?.content || "";
    const runModel = createModelRunner({
      aiRunImpl,
      binding: env.AI,
      latestUserContent,
      live,
      onModelFallback,
    });

    // "supplied": the search result goes to the model. "nothing": the search ran
    // and found nothing about this question. "unavailable": there is no result.
    let searchState = "unavailable";
    let supplied = null;
    if (searchSmartbolig) {
      live?.stage("searching");
      const always = shouldRequireSmartboligSearch(messages);
      const found = await searchSmartbolig(searchQuery(messages), { always });
      if (found.weak) {
        searchState = "nothing";
      } else if (!found.unavailable || always) {
        // A search that failed is still reported to the model when a smart home word asked for it.
        searchState = "supplied";
        supplied = found;
      }
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
