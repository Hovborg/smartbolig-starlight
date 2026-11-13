// Renders a failed request as an alert with a retry button.
import type { AssistantContext } from "./context";

export function createErrorRenderer({ root, messagesElement }: AssistantContext, onRetry: () => void) {
  function renderError(message: string) {
    const error = document.createElement("div");
    error.className = "smartbolig-ai__error";
    error.setAttribute("role", "alert");
    const text = document.createElement("p");
    text.textContent = message;
    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = root.dataset.labelRetry || "Try again";
    retry.addEventListener("click", onRetry);
    error.append(text, retry);
    messagesElement.append(error);
  }

  return renderError;
}
