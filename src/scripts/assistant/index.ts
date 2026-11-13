// Entry point: wires the assistant's modules together for each mounted widget.
import { createCodeBlockRenderer } from "./code-block";
import { createComposer } from "./composer";
import { createContext } from "./context";
import { createConversation } from "./conversation";
import { createDiagnosticsRenderer } from "./diagnostics-view";
import { createHistoryStore } from "./history";
import { createLoadingIndicator } from "./loading";
import { createMessageView } from "./message-view";
import { createModeController } from "./modes";
import { bindPanel } from "./panel";
import { bindStarterPrompts } from "./prompts";
import { createRichTextRenderer } from "./rich-text";

function setupAssistant(root: Element) {
  if (!(root instanceof HTMLElement) || root.dataset.chatReady === "true") return;
  root.dataset.chatReady = "true";

  const ctx = createContext(root);
  if (!ctx) return;

  const store = createHistoryStore(`smartbolig-ai:v1:${ctx.locale}`);
  const { createCopyButton, createSafeCodeBlock } = createCodeBlockRenderer(ctx);
  const createSafeRichText = createRichTextRenderer(createSafeCodeBlock);
  const createDiagnostics = createDiagnosticsRenderer(root);
  const { renderHistory } = createMessageView(ctx, store, { createCopyButton, createSafeRichText, createDiagnostics });
  const loading = createLoadingIndicator(ctx);
  const modes = createModeController(ctx);
  const { setBusy, bindComposer } = createComposer(ctx, modes.syncWithInput);
  const { sendQuestion, resetConversation } = createConversation(ctx, {
    store,
    renderHistory,
    loading,
    setBusy,
    clearActiveMode: modes.clearActiveMode,
  });

  bindPanel(ctx, loading);
  ctx.resetButton.addEventListener("click", resetConversation);
  bindStarterPrompts(ctx, modes.clearActiveMode);
  modes.bindModeButtons();
  bindComposer(sendQuestion);

  renderHistory();
}

function initSmartboligAssistants() {
  document.querySelectorAll("[data-smartbolig-ai]").forEach(setupAssistant);
}

initSmartboligAssistants();
document.addEventListener("astro:page-load", initSmartboligAssistants);
