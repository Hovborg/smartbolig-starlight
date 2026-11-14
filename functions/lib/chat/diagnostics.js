// The diagnostics a visitor may see: an allowlisted model and route, a bounded duration and the trace id.

import { CHAT_FALLBACK_MODEL_DIAGNOSTIC, CHAT_MODEL_DIAGNOSTIC, MAX_PUBLIC_DURATION_MS } from "./limits.js";

export function createPublicDiagnostics(candidate, durationMs, requestId) {
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
