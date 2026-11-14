// Entry point: wires the assistant's modules together for each mounted widget.
import { createCodeBlockRenderer } from "./code-block";
import { createComposer } from "./composer";
import { createContext } from "./context";
import { createConversation } from "./conversation";
import { createDiagnosticsRenderer } from "./diagnostics-view";
import { createDraftView } from "./draft-view";
import { createFollowScroll } from "./follow-scroll";
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

  // The footer renders the widget inside Starlight's main pane, which is its
  // own stacking context. There the fixed table of contents covers the widget
  // on wide screens, so it moves to the end of <body>.
  if (root.parentElement !== document.body) document.body.append(root);

  const ctx = createContext(root);
  if (!ctx) return;

  const store = createHistoryStore(`smartbolig-ai:v1:${ctx.locale}`);
  const { createCopyButton, createSafeCodeBlock } = createCodeBlockRenderer(ctx);
  const createSafeRichText = createRichTextRenderer(createSafeCodeBlock);
  const createDiagnostics = createDiagnosticsRenderer(root);
  const { renderMessage, renderHistory } = createMessageView(ctx, store, {
    createCopyButton,
    createSafeRichText,
    createDiagnostics,
  });
  const loading = createLoadingIndicator(ctx);
  const startDraft = createDraftView(ctx, {
    loading,
    follow: createFollowScroll(ctx),
    createSafeRichText,
    renderMessage,
  });
  const modes = createModeController(ctx);
  const { setBusy, bindComposer } = createComposer(ctx, modes.syncWithInput);
  const { sendQuestion, resetConversation, stopAnswer } = createConversation(ctx, {
    store,
    renderHistory,
    startDraft,
    loading,
    setBusy,
    clearActiveMode: modes.clearActiveMode,
  });

  bindPanel(ctx, loading);
  ctx.resetButton.addEventListener("click", resetConversation);
  bindStarterPrompts(ctx, modes.clearActiveMode);
  modes.bindModeButtons();
  bindComposer(sendQuestion, stopAnswer);

  renderHistory();
}

function initSmartboligAssistants() {
  document.querySelectorAll("[data-smartbolig-ai]").forEach(setupAssistant);
}

initSmartboligAssistants();
document.addEventListener("astro:page-load", initSmartboligAssistants);
