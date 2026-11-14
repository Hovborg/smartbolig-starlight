// The Workers AI agent: primary model, fallback model and the search tool loop.

import {
  CHAT_FALLBACK_MODEL,
  CHAT_FALLBACK_MODEL_DIAGNOSTIC,
  CHAT_MODEL,
  CHAT_MODEL_DIAGNOSTIC,
  FALLBACK_MAX_MODEL_TOKENS,
  FALLBACK_MODEL_TIMEOUT_MS,
  MAX_MODEL_RUNS,
  MAX_MODEL_TOKENS,
  MAX_SEARCH_QUERY_CHARS,
  PRIMARY_MODEL_TIMEOUT_MS,
} from "./limits.js";
import { extractModelAnswer, isAcceptableModelAnswer, isTruncatedModelResult } from "./answer.js";
import { buildSystemPrompt, withOfficialReference, withSmartboligReference } from "./prompt.js";
import { safeErrorName, withTimeout } from "./runtime.js";
import { selectSearchToolCall, shouldRequireSmartboligSearch } from "./search-tool.js";
import { requestedHomeAssistantYamlShape } from "./yaml-request.js";

export function createWorkersAgent(dependencies = {}) {
  const aiRunImpl =
    dependencies.aiRunImpl ||
    ((binding, model, input, options) => binding.run(model, input, options));

  return async function runWorkersAgent({
    env,
    messages,
    locale,
    searchSmartbolig,
    officialEvidence,
    onModelFallback,
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
    const tools = searchSmartbolig
      ? [
          {
            type: "function",
            function: {
              name: "search_smartbolig",
              description:
                "Search SmartBolig.net for a relevant first-party guide or site-specific fact. Use only when it improves the answer.",
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    minLength: 2,
                    maxLength: MAX_SEARCH_QUERY_CHARS,
                    description: "A focused search query for SmartBolig.net",
                  },
                },
                required: ["query"],
                additionalProperties: false,
              },
            },
          },
        ]
      : undefined;

    const runInference = (model, input, timeoutMs) =>
      withTimeout(
        (signal) =>
          aiRunImpl(
            env.AI,
            model,
            input,
            { signal },
          ),
        timeoutMs,
      );

    const reportFallback = (details) => {
      try {
        onModelFallback?.(details);
      } catch {
        // Observability must never make a visitor-facing model request fail.
      }
    };

    const runFallback = async (inputMessages, reason, primaryErrorName) => {
      reportFallback({
        event: "fallback_started",
        reason,
        error: primaryErrorName,
      });

      try {
        const fallbackResult = await runInference(
          CHAT_FALLBACK_MODEL,
          {
            messages: inputMessages,
            max_tokens: FALLBACK_MAX_MODEL_TOKENS,
            temperature: 0.1,
            stream: false,
          },
          FALLBACK_MODEL_TIMEOUT_MS,
        );

        const fallbackAnswer = extractModelAnswer(fallbackResult);
        if (isTruncatedModelResult(fallbackResult, fallbackAnswer)) {
          reportFallback({
            event: "fallback_failed",
            reason: "truncated_fallback_response",
            error: null,
          });
          const responseError = new Error("TruncatedFallbackResponse");
          responseError.name = "TruncatedModelResponseError";
          throw responseError;
        }
        if (!isAcceptableModelAnswer(fallbackAnswer, latestUserContent)) {
          reportFallback({
            event: "fallback_failed",
            reason: fallbackAnswer ? "invalid_fallback_response" : "empty_fallback_response",
            error: null,
          });
          const responseError = new Error(fallbackAnswer ? "InvalidFallbackResponse" : "EmptyFallbackResponse");
          responseError.name = fallbackAnswer ? "InvalidModelResponseError" : "EmptyModelResponseError";
          throw responseError;
        }
        return {
          result: fallbackResult,
          diagnostics: {
            model: CHAT_FALLBACK_MODEL_DIAGNOSTIC,
            route: "fallback",
          },
        };
      } catch (error) {
        if (![
          "EmptyModelResponseError",
          "InvalidModelResponseError",
          "TruncatedModelResponseError",
        ].includes(error?.name)) {
          reportFallback({
            event: "fallback_failed",
            reason: "fallback_error",
            error: safeErrorName(error),
          });
        }
        throw error;
      }
    };

    const runModel = async (inputMessages, inputTools, fallbackMessages = inputMessages) => {
      let primaryResult;
      try {
        primaryResult = await runInference(
          CHAT_MODEL,
          {
            messages: inputMessages,
            ...(inputTools ? { tools: inputTools } : {}),
            max_completion_tokens: MAX_MODEL_TOKENS,
            reasoning_effort: "low",
            temperature: 0.1,
            stream: false,
          },
          PRIMARY_MODEL_TIMEOUT_MS,
        );
      } catch (error) {
        return runFallback(fallbackMessages, "primary_error", safeErrorName(error));
      }

      const primaryAnswer = extractModelAnswer(primaryResult);
      if (isTruncatedModelResult(primaryResult, primaryAnswer)) {
        return runFallback(fallbackMessages, "truncated_primary_response", null);
      }
      if (isAcceptableModelAnswer(primaryAnswer, latestUserContent) || (inputTools && selectSearchToolCall(primaryResult))) {
        return {
          result: primaryResult,
          diagnostics: {
            model: CHAT_MODEL_DIAGNOSTIC,
            route: "primary",
          },
        };
      }
      return runFallback(
        fallbackMessages,
        primaryAnswer ? "invalid_primary_response" : "empty_primary_response",
        null,
      );
    };

    if (searchSmartbolig && shouldRequireSmartboligSearch(messages)) {
      const query = messages.at(-1).content.slice(0, MAX_SEARCH_QUERY_CHARS);
      const toolResult = await searchSmartbolig(query);
      const execution = await runModel(
        withOfficialReference(withSmartboligReference(preloadedModelMessages, toolResult), officialEvidence),
      );
      const answer = extractModelAnswer(execution.result);
      if (!answer) throw new Error("EmptyModelResponse");
      return {
        answer,
        diagnostics: execution.diagnostics,
      };
    }

    let modelRuns = 1;
    let execution = await runModel(
      withOfficialReference(modelMessages, officialEvidence),
      tools,
      withOfficialReference(searchUnavailableMessages, officialEvidence),
    );
    const selectedTool = searchSmartbolig ? selectSearchToolCall(execution.result) : null;

    if (selectedTool) {
      const toolResult = await searchSmartbolig(selectedTool.query);
      modelRuns += 1;
      if (modelRuns > MAX_MODEL_RUNS) throw new Error("ModelRunLimitExceeded");

      execution = await runModel(
        withOfficialReference(withSmartboligReference(preloadedModelMessages, toolResult), officialEvidence),
      );
    }

    const answer = extractModelAnswer(execution.result);
    if (!answer) throw new Error("EmptyModelResponse");
    return {
      answer,
      diagnostics: execution.diagnostics,
    };
  };
}
