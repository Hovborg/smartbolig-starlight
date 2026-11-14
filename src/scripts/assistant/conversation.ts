// Sends a question to the same-origin chat endpoint and owns the request lifecycle.
import { MAX_HISTORY_MESSAGES, MAX_MESSAGE_CHARS, REQUEST_TIMEOUT_MS } from "./constants";
import type { AssistantContext } from "./context";
import { normalizeDiagnostics } from "./diagnostics";
import { createErrorRenderer } from "./error-view";
import type { HistoryStore } from "./history";
import type { createLoadingIndicator } from "./loading";

interface ConversationDeps {
  store: HistoryStore;
  renderHistory: () => void;
  loading: ReturnType<typeof createLoadingIndicator>;
  setBusy: (value: boolean) => void;
  clearActiveMode: () => void;
}

export function createConversation(ctx: AssistantContext, deps: ConversationDeps) {
  const { root, locale, copy, input, messagesElement, state, setStatus } = ctx;
  const { store, renderHistory, setBusy, clearActiveMode } = deps;
  const { renderLoading, startLoadingTimer, stopLoadingTimer, markLoadingStarted, clearLoadingStart } = deps.loading;
  const { saveHistory, createRequestMessages } = store;
  const renderError = createErrorRenderer(ctx, retryLastQuestion);

  let abortController: AbortController | null = null;
  let lastFailed = false;
  let requestSequence = 0;

  function retryLastQuestion() {
    const last = store.items.at(-1);
    if (last?.role === "user") sendQuestion(last.content, true);
  }

  function resetConversation() {
    requestSequence += 1;
    stopLoadingTimer();
    clearLoadingStart();
    const controllerToAbort = abortController;
    abortController = null;
    controllerToAbort?.abort();
    store.set([]);
    lastFailed = false;
    saveHistory();
    setBusy(false);
    renderHistory();
    setStatus(root.dataset.labelReset || "Conversation cleared.");
    input.value = "";
    clearActiveMode();
    input.focus();
  }

  function messageForFailure(code: string | undefined, statusCode: number | undefined, wasAborted: boolean) {
    if (wasAborted) return root.dataset.errorTimeout || "The response timed out.";
    if (statusCode === 429 || code === "rate_limited") {
      return root.dataset.errorRate || "Rate limited.";
    }
    if (statusCode === 503 || code === "service_unavailable") {
      return root.dataset.errorService || "Service unavailable.";
    }
    return root.dataset.errorGeneric || "The assistant could not answer.";
  }

  async function sendQuestion(content: string, reuseExistingUser = false) {
    const question = typeof content === "string" ? content.trim().slice(0, MAX_MESSAGE_CHARS) : "";
    if (!question || state.isSending) return;
    const requestId = ++requestSequence;

    if (!reuseExistingUser) {
      if (store.items.at(-1)?.role === "user") store.items.pop();
      while (store.items.length >= MAX_HISTORY_MESSAGES) store.items.splice(0, 2);
      store.items.push({ role: "user", content: question });
    }
    lastFailed = false;
    saveHistory();
    renderHistory();
    messagesElement.hidden = false;
    markLoadingStarted();
    const loadingArticle = renderLoading();
    startLoadingTimer(loadingArticle);
    setBusy(true);
    setStatus(copy.working);
    input.value = "";

    abortController?.abort();
    const requestController = new AbortController();
    abortController = requestController;
    const timeout = setTimeout(() => requestController.abort(), REQUEST_TIMEOUT_MS);
    let response;

    try {
      response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          locale,
          messages: createRequestMessages(),
        }),
        signal: requestController.signal,
      });
      const result = await response.json().catch(() => ({}));
      if (requestId !== requestSequence) return;
      if (!response.ok || typeof result.answer !== "string" || !result.answer.trim()) {
        const requestError: Error & { code?: string; statusCode?: number } = new Error("AssistantRequestFailed");
        requestError.code = result.code;
        requestError.statusCode = response.status;
        throw requestError;
      }

      const sources = Array.isArray(result.sources) ? result.sources.slice(0, 5) : [];
      store.items.push({
        role: "assistant",
        content: result.answer.trim().slice(0, 12_000),
        sourceMode:
          result.sourceMode === "official" ? "official" : result.sourceMode === "mixed" ? "mixed" : "general",
        sources,
        diagnostics: normalizeDiagnostics(result.diagnostics),
      });
      store.set(store.items.slice(-MAX_HISTORY_MESSAGES));
      saveHistory();
      renderHistory();
      setStatus(root.dataset.labelReady || "Ready.");
    } catch (error: any) {
      if (requestId !== requestSequence) return;
      lastFailed = true;
      renderHistory();
      const failureMessage = messageForFailure(
        error?.code,
        error?.statusCode,
        error?.name === "AbortError" || requestController.signal.aborted,
      );
      renderError(failureMessage);
      setStatus(failureMessage);
    } finally {
      clearTimeout(timeout);
      if (abortController === requestController) {
        stopLoadingTimer();
        clearLoadingStart();
        abortController = null;
        setBusy(false);
        if (!lastFailed) input.focus();
      }
    }
  }

  return { sendQuestion, resetConversation };
}
