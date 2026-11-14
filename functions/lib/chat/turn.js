// One validated question: its sources, its search, the agent run and the final body.
// The JSON response and the event stream are two ways to deliver the same turn.

import { selectOfficialEvidence } from "../official-evidence.js";
import { USEFUL_SCORE } from "../site-search/search.js";
import { createPublicDiagnostics } from "./diagnostics.js";
import { MAX_ANSWER_CHARS, MAX_SEARCH_QUERY_CHARS, MAX_SEARCH_RESULTS } from "./limits.js";
import { safeErrorName, withTimeout } from "./runtime.js";
import { normalizeSearchResults } from "./sources.js";

export function createTurn({
  agentRunner,
  chat,
  env,
  logger,
  now,
  requestId,
  requestStartedAt,
  search,
  searchTimeoutMs,
}) {
  const officialEvidence = selectOfficialEvidence(chat.messages.at(-1).content, chat.locale);
  const sourceMap = new Map(officialEvidence.sources.map((source) => [source.url, source]));
  // Searches the site. A result is used, and its pages become sources, when a smart
  // home word asked for the search (`always`) or its best score is at least USEFUL_SCORE.
  // Otherwise nothing from it is kept: { results: [], weak: true }.
  const searchSmartbolig = search
    ? async (query, { always = false } = {}) => {
        const safeQuery = typeof query === "string" ? query.trim().slice(0, MAX_SEARCH_QUERY_CHARS) : "";
        if (safeQuery.length < 2) return { results: [], weak: !always };

        try {
          const found = await withTimeout(() => search(safeQuery, chat.locale, MAX_SEARCH_RESULTS), searchTimeoutMs);
          const normalized = normalizeSearchResults(found);
          const best = Math.max(...normalized.results.map((result) => result.score ?? -Infinity));
          if (!always && !(best >= USEFUL_SCORE)) return { results: [], weak: true };

          for (const source of normalized.sources) {
            if (!sourceMap.has(source.url)) sourceMap.set(source.url, source);
          }
          return { results: normalized.results };
        } catch (error) {
          logger.error?.("SmartBolig site search unavailable", {
            requestId,
            error: safeErrorName(error),
          });
          return { results: [], unavailable: true };
        }
      }
    : undefined;

  // The sources known so far: the official ones at once, the site's own after a search.
  const sources = () => [...sourceMap.values()];

  // Resolves to the response body. `live` is only passed for a streamed request.
  async function run(live) {
    const result = await agentRunner({
      env,
      locale: chat.locale,
      messages: chat.messages,
      searchSmartbolig,
      officialEvidence,
      onModelFallback: (details) => {
        logger.warn?.("SmartBolig chat model fallback", {
          requestId,
          event: details.event,
          reason: details.reason,
          error: details.error,
        });
      },
      ...(live ? { live } : {}),
    });
    const answer = typeof result?.answer === "string" ? result.answer.trim() : "";
    if (!answer) throw new Error("EmptyAssistantAnswer");
    if (answer.length > MAX_ANSWER_CHARS) throw new Error("OversizedAssistantAnswer");

    const finalSources = sources();
    return {
      answer,
      sources: finalSources,
      officialVerifiedAt: officialEvidence.verifiedAt,
      sourceMode:
        officialEvidence.evidenceIds.length > 0
          ? "official"
          : finalSources.length > 0
            ? "mixed"
            : "general",
      requestId,
      diagnostics: createPublicDiagnostics(result?.diagnostics, now() - requestStartedAt, requestId),
    };
  }

  function reportFailure(error) {
    logger.error?.("SmartBolig chat generation failed", {
      requestId,
      error: safeErrorName(error),
    });
  }

  return { run, sources, reportFailure };
}
