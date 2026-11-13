// The diagnostics rail under each answer: model, route, edge time, trace and source count.
import { normalizeDiagnostics } from "./diagnostics";

function createDiagnosticItem(label: string, value: string) {
  const item = document.createElement("span");
  item.className = "smartbolig-ai__diagnostic";
  const key = document.createElement("small");
  key.textContent = label;
  const content = document.createElement("strong");
  content.textContent = value;
  item.append(key, content);
  return item;
}

function formatDiagnosticDuration(durationMs: number) {
  if (durationMs < 1000) return `${durationMs} MS`;
  return `${(durationMs / 1000).toFixed(1)} S`;
}

export function createDiagnosticsRenderer(root: HTMLElement) {
  function modelDiagnosticLabel(model: string) {
    if (model === "gemma-4-26b-a4b-it") return "GEMMA 4 · 26B";
    if (model === "qwen3-30b-a3b-fp8") return "QWEN 3 · 30B A3B";
    return root.dataset.labelModelUnknown || "UNKNOWN";
  }

  function routeDiagnosticLabel(route: string) {
    if (route === "primary") return root.dataset.labelRoutePrimary || "PRIMARY";
    if (route === "fallback") return root.dataset.labelRouteFallback || "FALLBACK";
    return root.dataset.labelRouteUnknown || "UNKNOWN";
  }

  function createDiagnostics(message: { diagnostics?: unknown }, sourceCount: number) {
    const diagnostics = normalizeDiagnostics(message.diagnostics);
    const rail = document.createElement("div");
    rail.className = "smartbolig-ai__diagnostics";
    rail.dataset.diagnosticRoute = diagnostics.route;
    const trace = diagnostics.trace ? diagnostics.trace.slice(0, 8).toUpperCase() : "—";
    const safeSourceCount = Math.min(5, Math.max(0, Number.isInteger(sourceCount) ? sourceCount : 0));

    rail.append(
      createDiagnosticItem(root.dataset.labelDiagnosticModel || "MODEL", modelDiagnosticLabel(diagnostics.model)),
      createDiagnosticItem(root.dataset.labelDiagnosticRoute || "ROUTE", routeDiagnosticLabel(diagnostics.route)),
      createDiagnosticItem(root.dataset.labelDiagnosticEdge || "EDGE", formatDiagnosticDuration(diagnostics.durationMs)),
      createDiagnosticItem(root.dataset.labelDiagnosticTrace || "TRACE", trace),
      createDiagnosticItem(root.dataset.labelDiagnosticSources || "SOURCES", String(safeSourceCount)),
    );
    rail.setAttribute(
      "aria-label",
      `${root.dataset.labelDiagnosticModel || "MODEL"}: ${modelDiagnosticLabel(diagnostics.model)}; ` +
        `${root.dataset.labelDiagnosticRoute || "ROUTE"}: ${routeDiagnosticLabel(diagnostics.route)}; ` +
        `${root.dataset.labelDiagnosticEdge || "EDGE"}: ${formatDiagnosticDuration(diagnostics.durationMs)}; ` +
        `${root.dataset.labelDiagnosticTrace || "TRACE"}: ${trace}; ` +
        `${root.dataset.labelDiagnosticSources || "SOURCES"}: ${safeSourceCount}`,
    );
    return rail;
  }

  return createDiagnostics;
}
