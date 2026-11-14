// The Workers AI agent: decides when the site is searched and which prompt each
// model step gets. The model steps themselves live in model-runs.js.

import { MAX_MODEL_RUNS, MAX_SEARCH_QUERY_CHARS } from "./limits.js";
import { extractModelAnswer } from "./answer.js";
import { createModelRunner } from "./model-runs.js";
import { buildSystemPrompt, withOfficialReference, withSmartboligReference } from "./prompt.js";
import { SEARCH_TOOLS, selectSearchToolCall, shouldRequireSmartboligSearch } from "./search-tool.js";
import { requestedHomeAssistantYamlShape } from "./yaml-request.js";

export function createWorkersAgent(dependencies = {}) {
  const aiRunImpl =
    dependencies.aiRunImpl ||
    ((binding, model, input, options) => binding.run(model, input, options));

  // `live` is set for a streamed request: live.stage(name) reports what happens
  // now ("reading", "searching", "writing", "revising"), live.text(chunk) gets
  // the answer while it is written and live.signal aborts when the visitor leaves.
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
    const requestedYamlShape = requestedHomeAssistantYamlShape(latestUserContent);
    const createModelMessages = (hasSearchTool, hasPreloadedSearch = false) => [
      {
        role: "system",
        content: buildSystemPrompt(
          locale,
          hasSearchTool,
          hasPreloadedSearch,
          requestedYamlShape,
        ),
      },
      ...messages,
    ];
    const modelMessages = createModelMessages(Boolean(searchSmartbolig));
    const searchUnavailableMessages = createModelMessages(false);
    const preloadedModelMessages = createModelMessages(false, true);
    const tools = searchSmartbolig ? SEARCH_TOOLS : undefined;
    const runModel = createModelRunner({
      aiRunImpl,
      binding: env.AI,
      latestUserContent,
      live,
      onModelFallback,
    });

    // The last step of every route: the model writes the answer from the search result.
    const answerFromSearch = (toolResult) => {
      live?.stage("writing");
      return runModel(
        withOfficialReference(withSmartboligReference(preloadedModelMessages, toolResult), officialEvidence),
      );
    };
    const finish = (execution) => {
      const answer = extractModelAnswer(execution.result);
      if (!answer) throw new Error("EmptyModelResponse");
      return { answer, diagnostics: execution.diagnostics };
    };

    if (searchSmartbolig && shouldRequireSmartboligSearch(messages)) {
      live?.stage("searching");
      const query = messages.at(-1).content.slice(0, MAX_SEARCH_QUERY_CHARS);
      return finish(await answerFromSearch(await searchSmartbolig(query)));
    }

    // Without a smart home word the model decides whether a search helps.
    let modelRuns = 1;
    live?.stage(tools ? "reading" : "writing");
    let execution = await runModel(
      withOfficialReference(modelMessages, officialEvidence),
      tools,
      withOfficialReference(searchUnavailableMessages, officialEvidence),
    );
    const selectedTool = searchSmartbolig ? selectSearchToolCall(execution.result) : null;

    if (selectedTool) {
      live?.stage("searching");
      const toolResult = await searchSmartbolig(selectedTool.query);
      modelRuns += 1;
      if (modelRuns > MAX_MODEL_RUNS) throw new Error("ModelRunLimitExceeded");

      execution = await answerFromSearch(toolResult);
    }

    return finish(execution);
  };
}
