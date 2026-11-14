// Extracts model answers and decides whether an answer is complete and acceptable.

import { MAX_ANSWER_CHARS } from "./limits.js";
import {
  hasModeKeyValue,
  hasValidRequestedHomeAssistantYaml,
  hasYamlModeAtIndent,
} from "./yaml-checks.js";
import {
  requestedAutomationModes,
  requestedHomeAssistantYamlShape,
  requestsFencedYamlOutput,
} from "./yaml-request.js";

export function extractModelAnswer(result) {
  if (typeof result === "string") return result.trim();
  if (typeof result?.response === "string") return result.response.trim();

  const content = result?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => (part?.type === "text" && typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

export function isTruncatedModelResult(result, answer = "") {
  const finishReasons = [
    result?.finish_reason,
    result?.stop_reason,
    result?.choices?.[0]?.finish_reason,
    result?.response_metadata?.finish_reason,
  ];

  const normalizedFinishReasons = finishReasons
    .filter((reason) => typeof reason === "string" && reason.trim())
    .map((reason) => reason.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  const stoppedAtTokenLimit = normalizedFinishReasons.some((normalized) => {
    return new Set([
      "length",
      "max_tokens",
      "max_completion_tokens",
      "max_output_tokens",
      "token_limit",
    ]).has(normalized);
  });
  if (stoppedAtTokenLimit) return true;

  const trimmedAnswer = typeof answer === "string" ? answer.trim() : "";
  const fenceCount = trimmedAnswer.match(/```/g)?.length || 0;
  if (fenceCount % 2 !== 0) return true;

  if (normalizedFinishReasons.length > 0) return false;

  return /(?:^|\s)(?:og|eller|med|som|der|til|af|i|på|and|or|with|that|to|of|in|the|a|an|for)$/iu.test(
    trimmedAnswer,
  );
}

// The tool name and the reference-data tags belong to the prompt, never to an answer.
export function leaksPromptInternals(answer) {
  return /\bsearch_smartbolig\b|<\/?(?:smartbolig|official)_reference_data\b/iu.test(answer);
}

export function isAcceptableModelAnswer(answer, latestUserContent) {
  if (!answer) return false;
  if (answer.length > MAX_ANSWER_CHARS) return false;
  if (leaksPromptInternals(answer)) return false;

  const requestsFencedYaml = requestsFencedYamlOutput(latestUserContent);
  const requestedYamlShape = requestedHomeAssistantYamlShape(latestUserContent);
  const requestedModes = requestedAutomationModes(latestUserContent);
  if (
    requestedModes.some((mode) => !hasModeKeyValue(answer, mode))
  ) {
    return false;
  }

  const fencedYamlBlocks = [...answer.matchAll(/```ya?ml\s*\n([\s\S]+?)\n```/giu)];
  if (requestsFencedYaml && fencedYamlBlocks.length === 0) return false;
  const requestedModeIndent = {
    editor: 0,
    configuration: 4,
    automations: 2,
    blueprint: 0,
  }[requestedYamlShape];
  if (
    Number.isInteger(requestedModeIndent) &&
    requestedModes.some(
      (mode) =>
        !fencedYamlBlocks.some((match) =>
          hasYamlModeAtIndent(match[1], mode, requestedModeIndent),
        ),
    )
  ) {
    return false;
  }
  if (
    requestedYamlShape &&
    (fencedYamlBlocks.length !== 1 ||
      !hasValidRequestedHomeAssistantYaml(fencedYamlBlocks[0][1], requestedYamlShape))
  ) {
    return false;
  }

  return true;
}
