// The four work-mode buttons: each prefixes the prompt with a template and shows as pressed.
import { MAX_MESSAGE_CHARS } from "./constants";
import type { AssistantContext } from "./context";

export function createModeController({ root, input, modeButtons, setStatus }: AssistantContext) {
  let activeModeTemplate = "";

  function clearActiveMode() {
    activeModeTemplate = "";
    for (const modeButton of modeButtons) {
      if (modeButton instanceof HTMLButtonElement) modeButton.setAttribute("aria-pressed", "false");
    }
  }

  // Typing over the template ends the active mode.
  function syncWithInput() {
    if (activeModeTemplate && !input.value.startsWith(activeModeTemplate)) clearActiveMode();
  }

  function bindModeButtons() {
    for (const button of modeButtons) {
      button.addEventListener("click", () => {
        if (!(button instanceof HTMLButtonElement)) return;
        const template = button.dataset.template || "";
        const current = input.value;
        const remainder =
          activeModeTemplate && current.startsWith(activeModeTemplate)
            ? current.slice(activeModeTemplate.length).trimStart()
            : current.trim();
        const availableChars = Math.max(0, MAX_MESSAGE_CHARS - template.length);
        const boundedRemainder = remainder.slice(0, availableChars);
        input.value = boundedRemainder ? `${template}${boundedRemainder}` : template;
        if (boundedRemainder.length < remainder.length) {
          setStatus(root.dataset.labelModeTruncated || "The prompt was shortened to 2,000 characters.");
        }
        activeModeTemplate = template;
        for (const modeButton of modeButtons) {
          if (modeButton instanceof HTMLButtonElement) {
            modeButton.setAttribute("aria-pressed", modeButton === button ? "true" : "false");
          }
        }
        input.focus();
        input.dispatchEvent(new Event("input"));
      });
    }
  }

  return { clearActiveMode, syncWithInput, bindModeButtons };
}
