// Looks up the assistant's elements once and carries the state the modules share.
import { assistantRuntimeCopy } from "../../lib/assistant-copy";
import type { AssistantRuntimeCopy } from "../../lib/assistant-copy";

export interface AssistantContext {
  root: HTMLElement;
  locale: "da" | "en";
  copy: AssistantRuntimeCopy;
  panel: HTMLElement;
  launcher: HTMLButtonElement;
  closeButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
  form: HTMLFormElement;
  input: HTMLTextAreaElement;
  sendButton: HTMLButtonElement;
  messagesElement: HTMLElement;
  welcome: HTMLElement;
  prompts: HTMLElement;
  status: HTMLElement;
  promptButtons: NodeListOf<Element>;
  modeButtons: NodeListOf<Element>;
  state: { isSending: boolean };
  setStatus: (message: string) => void;
}

export function createContext(root: HTMLElement): AssistantContext | null {
  const panel = root.querySelector("[data-chat-panel]");
  const launcher = root.querySelector("[data-chat-launcher]");
  const closeButton = root.querySelector("[data-chat-close]");
  const resetButton = root.querySelector("[data-chat-reset]");
  const form = root.querySelector("[data-chat-form]");
  const input = root.querySelector("[data-chat-input]");
  const sendButton = root.querySelector("[data-chat-send]");
  const messagesElement = root.querySelector("[data-chat-messages]");
  const welcome = root.querySelector("[data-chat-welcome]");
  const prompts = root.querySelector("[data-chat-prompts]");
  const status = root.querySelector("[data-chat-status]");

  if (
    !(panel instanceof HTMLElement) ||
    !(launcher instanceof HTMLButtonElement) ||
    !(closeButton instanceof HTMLButtonElement) ||
    !(resetButton instanceof HTMLButtonElement) ||
    !(form instanceof HTMLFormElement) ||
    !(input instanceof HTMLTextAreaElement) ||
    !(sendButton instanceof HTMLButtonElement) ||
    !(messagesElement instanceof HTMLElement) ||
    !(welcome instanceof HTMLElement) ||
    !(prompts instanceof HTMLElement) ||
    !(status instanceof HTMLElement)
  ) {
    return null;
  }

  const locale = root.dataset.locale === "en" ? "en" : "da";

  return {
    root,
    locale,
    copy: assistantRuntimeCopy[locale],
    panel,
    launcher,
    closeButton,
    resetButton,
    form,
    input,
    sendButton,
    messagesElement,
    welcome,
    prompts,
    status,
    promptButtons: root.querySelectorAll("[data-chat-prompt]"),
    modeButtons: root.querySelectorAll("[data-chat-mode]"),
    state: { isSending: false },
    setStatus(message) {
      status.textContent = message;
    },
  };
}
