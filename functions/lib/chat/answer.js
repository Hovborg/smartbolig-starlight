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

/** The text of a message's `content`: a string, or a list of parts of which the text parts count. */
export function contentText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => (part?.type === "text" && typeof part.text === "string" ? part.text : ""))
    .join("");
}

export function extractModelAnswer(result) {
  if (typeof result === "string") return result.trim();
  if (typeof result?.response === "string") return result.response.trim();
  return contentText(result?.choices?.[0]?.message?.content).trim();
}

const TOKEN_LIMIT_REASONS = new Set(["length", "max_tokens", "max_completion_tokens", "max_output_tokens", "token_limit"]);
const normalizeFinishReason = (reason) => reason.trim().toLowerCase().replace(/[\s-]+/g, "_");

/** Does this finish reason say that the token limit cut the answer off? */
export function isTokenLimitReason(reason) {
  return typeof reason === "string" && TOKEN_LIMIT_REASONS.has(normalizeFinishReason(reason));
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
    .map(normalizeFinishReason);
  if (normalizedFinishReasons.some((normalized) => TOKEN_LIMIT_REASONS.has(normalized))) return true;

  const trimmedAnswer = typeof answer === "string" ? answer.trim() : "";
  const fenceCount = trimmedAnswer.match(/```/g)?.length || 0;
  if (fenceCount % 2 !== 0) return true;

  if (normalizedFinishReasons.length > 0) return false;

  return /(?:^|\s)(?:og|eller|med|som|der|til|af|i|på|and|or|with|that|to|of|in|the|a|an|for)$/iu.test(
    trimmedAnswer,
  );
}

// The tool name and the reference-data tags belong to the prompt, never to an answer.
// Without the `u` flag only ASCII letters are matched in either case, which is
// exactly what heldBackLength below folds; with it "ſ" would count as "s" here only.
export function leaksPromptInternals(answer) {
  return /\bsearch_smartbolig\b|<\/?(?:smartbolig|official)_reference_data\b/i.test(answer);
}

// The same markers as plain text. A test keeps the two in step.
export const PROMPT_INTERNAL_MARKERS = [
  "search_smartbolig",
  "<smartbolig_reference_data",
  "</smartbolig_reference_data",
  "<official_reference_data",
  "</official_reference_data",
];
const LONGEST_MARKER = Math.max(...PROMPT_INTERNAL_MARKERS.map((marker) => marker.length));

/**
 * How many characters at the end of `text` may be the start of a prompt
 * internal. A streamed answer holds them back until the next piece decides,
 * so a marker that arrives in several pieces is never shown in part.
 */
export function heldBackLength(text) {
  const tail = text.slice(-LONGEST_MARKER).toLowerCase();
  for (let start = 0; start < tail.length; start += 1) {
    const end = tail.slice(start);
    if (PROMPT_INTERNAL_MARKERS.some((marker) => marker.startsWith(end))) return end.length;
  }
  return 0;
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
