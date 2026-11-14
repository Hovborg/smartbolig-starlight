// Starter prompt buttons: clicking one fills the composer.
import type { AssistantContext } from "./context";

export function bindStarterPrompts({ input, promptButtons }: AssistantContext, clearActiveMode: () => void) {
  for (const button of promptButtons) {
    button.addEventListener("click", () => {
      if (!(button instanceof HTMLButtonElement)) return;
      clearActiveMode();
      input.value = button.dataset.prompt || "";
      input.focus();
      input.dispatchEvent(new Event("input"));
    });
  }
}
