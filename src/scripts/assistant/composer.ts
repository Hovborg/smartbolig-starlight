// The composer: busy state, the Stop button, auto-growing textarea, Enter to send.
import type { AssistantContext } from "./context";

// Stop takes the place of Send. A double click on Send must not land on it.
const STOP_GRACE_MS = 400;

export function createComposer(ctx: AssistantContext, syncModeWithInput: () => void) {
  const { panel, input, sendButton, stopButton, modeButtons, form, state } = ctx;
  let busySince = 0;

  function setBusy(value: boolean) {
    // The field and Send are switched off while an answer is on its way. Focus
    // that was in the composer moves to Stop, so the keyboard does not lose its
    // place. The same when it is nowhere: the retry button just pressed is gone.
    const active = document.activeElement;
    const focusInComposer = form.contains(active) || active === document.body;
    state.isSending = value;
    busySince = value ? performance.now() : 0;
    panel.setAttribute("aria-busy", value ? "true" : "false");
    input.disabled = value;
    sendButton.disabled = value;
    sendButton.hidden = value;
    stopButton.hidden = !value;
    if (value && focusInComposer) stopButton.focus();
    for (const modeButton of modeButtons) {
      if (modeButton instanceof HTMLButtonElement) modeButton.disabled = value;
    }
  }

  function bindComposer(sendQuestion: (content: string) => void, stopAnswer: () => void) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      sendQuestion(input.value);
    });
    stopButton.addEventListener("click", () => {
      if (state.isSending && performance.now() - busySince >= STOP_GRACE_MS) stopAnswer();
    });
    // The Enter that sent the question, held down, must not press Stop as well.
    stopButton.addEventListener("keydown", (event) => {
      if (event.repeat) event.preventDefault();
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
