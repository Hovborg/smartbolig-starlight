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

  function closeAssistant() {
    stopLoadingTimer();
    panel.hidden = true;
    launcher.setAttribute("aria-expanded", "false");
    root.classList.remove("is-open");
    launcher.focus();
  }

  launcher.addEventListener("click", () => {
    if (panel.hidden) openAssistant();
    else closeAssistant();
  });
  closeButton.addEventListener("click", closeAssistant);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) closeAssistant();
  });
}
