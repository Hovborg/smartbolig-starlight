// The composer: busy state, auto-growing textarea, Enter to send.
import type { AssistantContext } from "./context";

export function createComposer(ctx: AssistantContext, syncModeWithInput: () => void) {
  const { panel, input, sendButton, modeButtons, form, copy, state } = ctx;

  function setBusy(value: boolean) {
    state.isSending = value;
    panel.setAttribute("aria-busy", value ? "true" : "false");
    input.disabled = value;
    sendButton.disabled = value;
    for (const modeButton of modeButtons) {
      if (modeButton instanceof HTMLButtonElement) modeButton.disabled = value;
    }
    const sendLabel = sendButton.querySelector("span");
    if (sendLabel instanceof HTMLElement) {
      sendLabel.textContent = value ? copy.sending : copy.send;
    }
  }

  function bindComposer(sendQuestion: (content: string) => void) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      sendQuestion(input.value);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey && !event.isComposing && event.keyCode !== 229) {
        event.preventDefault();
        form.requestSubmit();
      }
    });
    input.addEventListener("input", () => {
      syncModeWithInput();
      input.style.height = "auto";
      input.style.height = `${Math.min(input.scrollHeight, 128)}px`;
    });
  }

  return { setBusy, bindComposer };
}
