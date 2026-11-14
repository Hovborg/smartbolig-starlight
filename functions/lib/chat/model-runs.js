// One model step: the primary model, then the fallback model when the primary
// fails, is cut off or fails the answer checks.
//
// With `live` (a streamed request) the answer text is passed on while it is
// written. Shown text is never continued by another model: a failure after the
// first shown text ends the request, and a finished draft that fails a check is
// announced as replaced ("revising") before the fallback writes a new one.

import {
  CHAT_FALLBACK_MODEL,
  CHAT_FALLBACK_MODEL_DIAGNOSTIC,
  CHAT_MODEL,
  CHAT_MODEL_DIAGNOSTIC,
  FALLBACK_MAX_MODEL_TOKENS,
  FALLBACK_MODEL_TIMEOUT_MS,
  MAX_ANSWER_CHARS,
  MAX_MODEL_TOKENS,
  PRIMARY_MODEL_TIMEOUT_MS,
} from "./limits.js";
import {
  extractModelAnswer,
  isAcceptableModelAnswer,
  isTruncatedModelResult,
  leaksPromptInternals,
} from "./answer.js";
import { isModelStream, readModelStream } from "./model-stream.js";
import { safeErrorName, withTimeout } from "./runtime.js";
import { selectSearchToolCall } from "./search-tool.js";

const RESPONSE_ERRORS = ["EmptyModelResponseError", "InvalidModelResponseError", "TruncatedModelResponseError"];

function responseError(name, message) {
  const error = new Error(message);
  error.name = name;
  return error;
}

export function createModelRunner({ aiRunImpl, binding, latestUserContent, live, onModelFallback }) {
  // True while the visitor is reading text from the model that is running now.
  let shown = false;
  const show = (text) => {
    if (!text) return;
    shown = true;
    live.text(text);
  };

  const runInference = (model, input, timeoutMs, streamed) =>
    withTimeout(
      async (signal) => {
        const result = await aiRunImpl(binding, model, { ...input, stream: streamed }, { signal });
        if (!streamed || !isModelStream(result)) return result;
        return readModelStream(result, {
          maxChars: MAX_ANSWER_CHARS,
          onText: show,
          signal,
          // A draft that names prompt internals is rejected anyway: stop it at once.
          stopWhen: leaksPromptInternals,
        });
      },
      timeoutMs,
      live?.signal,
    );

  const reportFallback = (details) => {
    try {
      onModelFallback?.(details);
    } catch {
      // Observability must never make a visitor-facing model request fail.
    }
  };

  const runFallback = async (inputMessages, reason, primaryErrorName) => {
    reportFallback({ event: "fallback_started", reason, error: primaryErrorName });

    try {
      const fallbackResult = await runInference(
        CHAT_FALLBACK_MODEL,
        { messages: inputMessages, max_tokens: FALLBACK_MAX_MODEL_TOKENS, temperature: 0.1 },
        FALLBACK_MODEL_TIMEOUT_MS,
        Boolean(live),
      );

      const fallbackAnswer = extractModelAnswer(fallbackResult);
      if (isTruncatedModelResult(fallbackResult, fallbackAnswer)) {
        reportFallback({ event: "fallback_failed", reason: "truncated_fallback_response", error: null });
        throw responseError("TruncatedModelResponseError", "TruncatedFallbackResponse");
      }
      if (!isAcceptableModelAnswer(fallbackAnswer, latestUserContent)) {
        reportFallback({
          event: "fallback_failed",
          reason: fallbackAnswer ? "invalid_fallback_response" : "empty_fallback_response",
          error: null,
        });
        throw fallbackAnswer
          ? responseError("InvalidModelResponseError", "InvalidFallbackResponse")
          : responseError("EmptyModelResponseError", "EmptyFallbackResponse");
      }
      // A model that answered without a stream is shown once it has passed the checks.
      if (live && !shown) show(fallbackAnswer);
      return {
        result: fallbackResult,
        diagnostics: { model: CHAT_FALLBACK_MODEL_DIAGNOSTIC, route: "fallback" },
      };
    } catch (error) {
      if (!RESPONSE_ERRORS.includes(error?.name) && !live?.signal?.aborted) {
        reportFallback({ event: "fallback_failed", reason: "fallback_error", error: safeErrorName(error) });
      }
      throw error;
    }
  };

  const replaceWithFallback = (inputMessages, reason) => {
    if (shown) {
      // The visitor has read a draft that is now rejected: say so before a new one is written.
      shown = false;
      live.stage("revising");
    }
    return runFallback(inputMessages, reason, null);
  };

  return async function runModel(inputMessages, inputTools, fallbackMessages = inputMessages) {
    // A step that may end in a tool call is not streamed: its output is not always an answer.
    const streamed = Boolean(live) && !inputTools;
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
        },
        PRIMARY_MODEL_TIMEOUT_MS,
        streamed,
      );
    } catch (error) {
      // No second model after a stopped request or a half-shown answer.
      if (live?.signal?.aborted || shown) throw error;
      return runFallback(fallbackMessages, "primary_error", safeErrorName(error));
    }

    const primaryAnswer = extractModelAnswer(primaryResult);
    if (isTruncatedModelResult(primaryResult, primaryAnswer)) {
      return replaceWithFallback(fallbackMessages, "truncated_primary_response");
    }
    const isToolCall = Boolean(inputTools && selectSearchToolCall(primaryResult));
    if (isAcceptableModelAnswer(primaryAnswer, latestUserContent) || isToolCall) {
      if (live && !shown && !isToolCall) show(primaryAnswer);
      return {
        result: primaryResult,
        diagnostics: { model: CHAT_MODEL_DIAGNOSTIC, route: "primary" },
      };
    }
    return replaceWithFallback(
      fallbackMessages,
      primaryAnswer ? "invalid_primary_response" : "empty_primary_response",
    );
  };
}
