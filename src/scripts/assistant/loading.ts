// The "edge request active" console and its elapsed-time timer.
import { REQUEST_TIMEOUT_MS } from "./constants";
import type { AssistantContext } from "./context";

export function createLoadingIndicator({ root, messagesElement, copy }: AssistantContext) {
  let loadingTimer: ReturnType<typeof setInterval> | null = null;
  let loadingStartedAt = 0;

  function renderLoading() {
    const article = document.createElement("article");
    article.className = "smartbolig-ai__message smartbolig-ai__message--assistant smartbolig-ai__message--loading";
    article.setAttribute("aria-label", copy.thinkingLabel);

    const meta = document.createElement("div");
    meta.className = "smartbolig-ai__message-meta";
    meta.textContent = root.dataset.labelAssistant || "SmartBolig AI";

    const bubble = document.createElement("div");
    bubble.className = "smartbolig-ai__bubble";
    const consoleElement = document.createElement("div");
    consoleElement.className = "smartbolig-ai__loading-console";
    const consoleHead = document.createElement("div");
    consoleHead.className = "smartbolig-ai__loading-head";
    const activeLabel = document.createElement("span");
    activeLabel.textContent = root.dataset.labelEdgeActive || "EDGE REQUEST ACTIVE";
    const elapsed = document.createElement("strong");
    elapsed.setAttribute("aria-hidden", "true");
    elapsed.dataset.chatElapsed = "";
    elapsed.textContent = "0.0 S";
    consoleHead.append(activeLabel, elapsed);

    const signal = document.createElement("span");
    signal.className = "smartbolig-ai__loading-signal";
    signal.setAttribute("aria-hidden", "true");
    signal.append(document.createElement("i"));

    const pipeline = document.createElement("small");
    pipeline.textContent = root.dataset.labelEdgePipeline || "WORKER · CONTEXT · MODEL";
    const dots = document.createElement("span");
    dots.className = "smartbolig-ai__typing";
    dots.append(document.createElement("i"), document.createElement("i"), document.createElement("i"));
    consoleElement.append(consoleHead, signal, pipeline, dots);
    bubble.append(consoleElement);
    article.append(meta, bubble);
    messagesElement.append(article);
    return article;
  }

  function stopLoadingTimer() {
    if (loadingTimer !== null) {
      clearInterval(loadingTimer);
      loadingTimer = null;
    }
  }

  function startLoadingTimer(article: Element | null) {
    stopLoadingTimer();
    if (!(article instanceof HTMLElement)) return;
    const elapsed = article.querySelector("[data-chat-elapsed]");
    if (!(elapsed instanceof HTMLElement)) return;
    if (!loadingStartedAt) loadingStartedAt = performance.now();

    const updateElapsed = () => {
      const elapsedMs = Math.min(REQUEST_TIMEOUT_MS, Math.max(0, performance.now() - loadingStartedAt));
      elapsed.textContent = `${(elapsedMs / 1000).toFixed(1)} S`;
    };
    updateElapsed();
    loadingTimer = setInterval(updateElapsed, 100);
  }

  function markLoadingStarted() {
    loadingStartedAt = performance.now();
  }

  function clearLoadingStart() {
    loadingStartedAt = 0;
  }

  return { renderLoading, startLoadingTimer, stopLoadingTimer, markLoadingStarted, clearLoadingStart };
}
