// Opening and closing the dialog, focus restoration and the Escape key.
import type { AssistantContext } from "./context";

export function bindPanel(
  { root, panel, launcher, closeButton, input, messagesElement, state }: AssistantContext,
  { startLoadingTimer, stopLoadingTimer }: {
    startLoadingTimer: (article: Element | null) => void;
    stopLoadingTimer: () => void;
  },
) {
  function openAssistant() {
    panel.hidden = false;
    launcher.setAttribute("aria-expanded", "true");
    root.classList.add("is-open");
    if (state.isSending) {
      startLoadingTimer(messagesElement.querySelector(".smartbolig-ai__message--loading"));
    }
    requestAnimationFrame(() => input.focus());
  }

  // The element outside the widget that opened it, if any. Focus returns there.
  let opener: HTMLElement | null = null;

  function closeAssistant() {
    stopLoadingTimer();
    panel.hidden = true;
    launcher.setAttribute("aria-expanded", "false");
    root.classList.remove("is-open");
    if (opener?.isConnected) opener.focus();
    else launcher.focus();
    opener = null;
  }

  launcher.addEventListener("click", () => {
    opener = null;
    if (panel.hidden) openAssistant();
    else closeAssistant();
  });
  // Other parts of the page (the homepage's "Ask AI") open the assistant with
  // this event, so they need to know nothing about the widget's markup.
  document.addEventListener("smartbolig-ai:open", (event) => {
    const from = (event as CustomEvent).detail?.opener;
    opener = from instanceof HTMLElement ? from : null;
    if (panel.hidden) openAssistant();
    else input.focus();
  });
  closeButton.addEventListener("click", closeAssistant);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) closeAssistant();
  });
}
