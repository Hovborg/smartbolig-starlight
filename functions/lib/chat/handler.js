// The chat request handler: method, origin, rate limit and validation, then the
// answer as JSON or, when the request asks for it, as an event stream.

import { siteSearchFromAssets } from "../site-search/assets.js";
import { createWorkersAgent } from "./agent.js";
import { SEARCH_TIMEOUT_MS, STREAMING_ENABLED } from "./limits.js";
import { readBoundedBody, validateChatBody } from "./request.js";
import { ChatRequestError, jsonResponse } from "./responses.js";
import { safeErrorName } from "./runtime.js";
import { wantsEventStream } from "./sse.js";
import { streamTurn } from "./stream-response.js";
import { createTurn } from "./turn.js";

export function createChatHandler(dependencies = {}) {
  const agentRunner = dependencies.agentRunner || createWorkersAgent();
  const createRequestId = dependencies.createRequestId || (() => crypto.randomUUID());
  const logger = dependencies.logger || console;
  const searchTimeoutMs = dependencies.searchTimeoutMs ?? SEARCH_TIMEOUT_MS;
  // env → search(query, locale, limit), or undefined when there is no index to read.
  const siteSearch = dependencies.siteSearch || ((env) => siteSearchFromAssets(env?.ASSETS));
  const now = dependencies.now || Date.now;
  const streaming = dependencies.streaming ?? STREAMING_ENABLED;

  return async function handleChat(context) {
    const { request, env } = context;
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

    const turn = createTurn({
      agentRunner,
      chat,
      env,
      logger,
      now,
      requestId,
      requestStartedAt,
      search: siteSearch(env),
      searchTimeoutMs,
    });

    // Every refusal above is a plain JSON response with its status code, also
    // for a request that asked for a stream. Only an accepted question streams.
    if (streaming && wantsEventStream(request)) {
      const { response, finished } = streamTurn(turn, requestId);
      context.waitUntil?.(finished);
      return response;
    }

    try {
      return jsonResponse(await turn.run(), 200, requestId);
    } catch (error) {
      turn.reportFailure(error);
      return jsonResponse("assistant_unavailable", 502, requestId);
    }
  };
}
