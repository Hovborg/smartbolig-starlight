// The chat request handler: method, origin, rate limit, validation, search and response.

import { selectOfficialEvidence } from "../official-evidence.js";
import { createWorkersAgent } from "./agent.js";
import {
  CHAT_FALLBACK_MODEL_DIAGNOSTIC,
  CHAT_MODEL_DIAGNOSTIC,
  MAX_ANSWER_CHARS,
  MAX_PUBLIC_DURATION_MS,
  MAX_SEARCH_QUERY_CHARS,
  MAX_SEARCH_RESULTS,
  SEARCH_TIMEOUT_MS,
} from "./limits.js";
import { readBoundedBody, validateChatBody } from "./request.js";
import { ChatRequestError, jsonResponse } from "./responses.js";
import { safeErrorName, withTimeout } from "./runtime.js";
import { normalizeSearchChunks } from "./sources.js";

function createPublicDiagnostics(candidate, durationMs, requestId) {
  const hasPrimaryRoute =
    candidate?.model === CHAT_MODEL_DIAGNOSTIC && candidate?.route === "primary";
  const hasFallbackRoute =
    candidate?.model === CHAT_FALLBACK_MODEL_DIAGNOSTIC && candidate?.route === "fallback";
  const hasKnownRoute = hasPrimaryRoute || hasFallbackRoute;
  const numericDuration = Number.isFinite(durationMs) ? Math.round(durationMs) : 0;

  return {
    model: hasKnownRoute ? candidate.model : "unknown",
    route: hasKnownRoute ? candidate.route : "unknown",
    durationMs: Math.min(MAX_PUBLIC_DURATION_MS, Math.max(0, numericDuration)),
    trace: typeof requestId === "string" ? requestId.slice(0, 64) : "",
  };
}

export function createChatHandler(dependencies = {}) {
  const agentRunner = dependencies.agentRunner || createWorkersAgent();
  const createRequestId = dependencies.createRequestId || (() => crypto.randomUUID());
  const logger = dependencies.logger || console;
  const searchTimeoutMs = dependencies.searchTimeoutMs ?? SEARCH_TIMEOUT_MS;
  const now = dependencies.now || Date.now;

  return async function handleChat({ request, env }) {
    const requestId = createRequestId();
    const requestStartedAt = now();

    if (request.method !== "POST") {
      return jsonResponse("method_not_allowed", 405, requestId, { allow: "POST" });
    }

    const requestOrigin = new URL(request.url).origin;
    const browserOrigin = request.headers.get("origin");
    if (browserOrigin && browserOrigin !== requestOrigin) {
      return jsonResponse("forbidden", 403, requestId);
    }

    const contentType = request.headers.get("content-type") || "";
    if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
      return jsonResponse("unsupported_media_type", 415, requestId);
    }

    if (!env?.AI || !env?.CHAT_RATE_LIMITER?.limit) {
      return jsonResponse("service_unavailable", 503, requestId);
    }

    const clientIp = request.headers.get("cf-connecting-ip") || "anonymous";
    let rateLimitResult;
    try {
      rateLimitResult = await env.CHAT_RATE_LIMITER.limit({ key: `chat:${clientIp}` });
    } catch (error) {
      logger.error?.("SmartBolig chat rate limiter unavailable", {
        requestId,
        error: safeErrorName(error),
      });
      return jsonResponse("service_unavailable", 503, requestId);
    }
    if (!rateLimitResult?.success) {
      return jsonResponse("rate_limited", 429, requestId, { "retry-after": "60" });
    }

    let rawBody;
    try {
      rawBody = await readBoundedBody(request);
    } catch (error) {
      if (error instanceof ChatRequestError) {
        return jsonResponse(error.code, error.status, requestId);
      }
      return jsonResponse("invalid_request", 400, requestId);
    }

    let parsedBody;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return jsonResponse("invalid_request", 400, requestId);
    }

    const chat = validateChatBody(parsedBody);
    if (!chat) {
      return jsonResponse("invalid_request", 400, requestId);
    }

    const officialEvidence = selectOfficialEvidence(chat.messages.at(-1).content, chat.locale);
    const sourceMap = new Map(officialEvidence.sources.map((source) => [source.url, source]));
    const searchSmartbolig = env.SMARTBOLIG_SEARCH?.search
      ? async (query) => {
          const safeQuery = typeof query === "string" ? query.trim().slice(0, MAX_SEARCH_QUERY_CHARS) : "";
          if (safeQuery.length < 2) return { results: [] };

          try {
            const searchResult = await withTimeout(
              () =>
                env.SMARTBOLIG_SEARCH.search({
                  query: safeQuery,
                  ai_search_options: { retrieval: { max_num_results: MAX_SEARCH_RESULTS } },
                }),
              searchTimeoutMs,
            );
            const normalized = normalizeSearchChunks(searchResult?.chunks);
            for (const source of normalized.sources) {
              if (!sourceMap.has(source.url)) sourceMap.set(source.url, source);
            }
            return { results: normalized.results };
          } catch (error) {
            logger.error?.("SmartBolig AI Search unavailable", {
              requestId,
              error: safeErrorName(error),
            });
            return { results: [], unavailable: true };
          }
        }
      : undefined;

    try {
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
      });
      const answer = typeof result?.answer === "string" ? result.answer.trim() : "";
      if (!answer) throw new Error("EmptyAssistantAnswer");
      if (answer.length > MAX_ANSWER_CHARS) throw new Error("OversizedAssistantAnswer");

      const sources = [...sourceMap.values()];
      const diagnostics = createPublicDiagnostics(
        result?.diagnostics,
        now() - requestStartedAt,
        requestId,
      );
      return jsonResponse(
        {
          answer,
          sources,
          officialVerifiedAt: officialEvidence.verifiedAt,
          sourceMode:
            officialEvidence.evidenceIds.length > 0
              ? "official"
              : sources.length > 0
                ? "mixed"
                : "general",
          requestId,
          diagnostics,
        },
        200,
        requestId,
      );
    } catch (error) {
      logger.error?.("SmartBolig chat generation failed", {
        requestId,
        error: safeErrorName(error),
      });
      return jsonResponse("assistant_unavailable", 502, requestId);
    }
  };
}
