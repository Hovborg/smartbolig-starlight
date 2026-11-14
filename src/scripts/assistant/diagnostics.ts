// Allowlists the diagnostics the Worker reports before anything is rendered or stored.
import {
  ALLOWED_DIAGNOSTIC_MODELS,
  ALLOWED_DIAGNOSTIC_ROUTES,
  SAFE_DIAGNOSTIC_TRACE,
} from "./constants";

export interface NormalizedDiagnostics {
  model: string;
  route: string;
  durationMs: number;
  trace: string;
}

// `diagnostics` is untrusted JSON, so it is deliberately loosely typed.
export function normalizeDiagnostics(diagnostics): NormalizedDiagnostics {
  const candidateModel =
    typeof diagnostics?.model === "string" && ALLOWED_DIAGNOSTIC_MODELS.has(diagnostics.model)
      ? diagnostics.model
      : "unknown";
  const candidateRoute =
    typeof diagnostics?.route === "string" && ALLOWED_DIAGNOSTIC_ROUTES.has(diagnostics.route)
      ? diagnostics.route
      : "unknown";
  const hasKnownPair =
    (candidateModel === "gemma-4-26b-a4b-it" && candidateRoute === "primary") ||
    (candidateModel === "qwen3-30b-a3b-fp8" && candidateRoute === "fallback");
  const durationCandidate = Number.isFinite(diagnostics?.durationMs)
    ? Math.round(diagnostics.durationMs)
    : 0;
  const trace = typeof diagnostics?.trace === "string" ? diagnostics.trace.slice(0, 64) : "";

  return {
    model: hasKnownPair ? candidateModel : "unknown",
    route: hasKnownPair ? candidateRoute : "unknown",
    durationMs: Math.min(180_000, Math.max(0, durationCandidate)),
    trace: SAFE_DIAGNOSTIC_TRACE.test(trace) ? trace : "",
  };
}
