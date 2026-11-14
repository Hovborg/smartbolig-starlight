// Renders a failed or stopped request as a notice with a retry button.
import type { AssistantContext } from "./context";

export function createErrorRenderer({ root, messagesElement, stopButton }: AssistantContext, onRetry: () => void) {
  // `quiet` is for something the reader did themselves (Stop): no alert and no
  // warning colours, and the status line already says it aloud.
  function renderError(message: string, { quiet = false } = {}) {
    const error = document.createElement("div");
    error.className = quiet ? "smartbolig-ai__error smartbolig-ai__error--quiet" : "smartbolig-ai__error";
    if (quiet) error.setAttribute("aria-live", "off");
    else error.setAttribute("role", "alert");
    const text = document.createElement("p");
    text.textContent = message;
    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = root.dataset.labelRetry || "Try again";
    retry.addEventListener("click", onRetry);
    error.append(text, retry);
    messagesElement.append(error);
    // Stop is about to disappear. A keyboard that was on it lands on the next
    // step, not at the top of the page. After a stop, focus returns to the field.
    if (!quiet && document.activeElement === stopButton) retry.focus();
  }

  return renderError;
}
