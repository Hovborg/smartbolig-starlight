// Renders chat messages (author, source mode, answer, sources, diagnostics) and the whole history.
import type { AssistantContext } from "./context";
import type { HistoryStore, StoredMessage } from "./history";
import { createSafeSourceLink } from "./sources";

interface MessageRenderers {
  createCopyButton: (content: string) => HTMLElement;
  createSafeRichText: (content: string) => HTMLElement;
  createDiagnostics: (message: StoredMessage, sourceCount: number) => HTMLElement;
}

export function createMessageView(
  { root, messagesElement, welcome, prompts }: AssistantContext,
  store: HistoryStore,
  { createCopyButton, createSafeRichText, createDiagnostics }: MessageRenderers,
) {
  function renderMessage(message: StoredMessage) {
    const article = document.createElement("article");
    article.className = `smartbolig-ai__message smartbolig-ai__message--${message.role}`;

    const meta = document.createElement("div");
    meta.className = "smartbolig-ai__message-meta";
    const author = document.createElement("span");
    author.textContent =
      message.role === "assistant" ? root.dataset.labelAssistant || "SmartBolig AI" : root.dataset.labelYou || "You";
    meta.append(author);

    if (message.role === "assistant") {
      const sourceMode = document.createElement("span");
      sourceMode.className = "smartbolig-ai__source-mode";
      const normalizedSourceMode =
        message.sourceMode === "official" ? "official" : message.sourceMode === "mixed" ? "mixed" : "general";
      sourceMode.dataset.sourceMode = normalizedSourceMode;
      sourceMode.textContent =
        normalizedSourceMode === "official"
          ? root.dataset.labelOfficial || "Official sources checked"
          : normalizedSourceMode === "mixed"
          ? root.dataset.labelMixed || "SmartBolig sources + broad AI knowledge"
          : root.dataset.labelGeneral || "General AI knowledge";
      meta.append(sourceMode);
    }

    const bubble = document.createElement("div");
    bubble.className = "smartbolig-ai__bubble";
    if (message.role === "assistant") {
      bubble.append(createSafeRichText(message.content));
    } else {
      const body = document.createElement("p");
      body.append(document.createTextNode(message.content));
      bubble.append(body);
    }

    if (message.role === "assistant") {
      const validSources = Array.isArray(message.sources)
        ? message.sources.map(createSafeSourceLink).filter(Boolean)
        : [];
      if (validSources.length > 0) {
        const sourceBlock = document.createElement("div");
        sourceBlock.className = "smartbolig-ai__sources";
        const sourceLabel = document.createElement("span");
        sourceLabel.textContent = root.dataset.labelSources || "SmartBolig sources";
        sourceBlock.append(sourceLabel, ...(validSources as HTMLElement[]));
        bubble.append(sourceBlock);
      }

      bubble.append(createDiagnostics(message, validSources.length));

      const actions = document.createElement("div");
      actions.className = "smartbolig-ai__message-actions";
      actions.append(createCopyButton(message.content));
      bubble.append(actions);
    }

    article.append(meta, bubble);
    return article;
  }

  function renderHistory() {
    messagesElement.replaceChildren();
    for (const message of store.items) {
      messagesElement.append(renderMessage(message));
    }
    const hasMessages = store.items.length > 0;
    welcome.hidden = hasMessages;
    prompts.hidden = hasMessages;
    messagesElement.hidden = !hasMessages;
    requestAnimationFrame(() => {
      const conversation = root.querySelector("[data-chat-conversation]");
      // A conversation shows its newest message; the welcome starts at the top.
      if (conversation instanceof HTMLElement) conversation.scrollTop = hasMessages ? conversation.scrollHeight : 0;
    });
  }

  return { renderMessage, renderHistory };
}
