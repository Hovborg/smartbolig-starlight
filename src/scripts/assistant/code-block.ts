// Copy buttons and the copyable code console, built from DOM nodes only.
import { safeLanguagePattern } from "./constants";
import type { AssistantContext } from "./context";

export function createCodeBlockRenderer({ root, setStatus }: AssistantContext) {
  function createCopyButton(content: string, options: { className?: string; label?: string } = {}) {
    const button = document.createElement("button");
    const defaultLabel = root.dataset.labelCopy || "Copy";
    button.className = options.className || "smartbolig-ai__message-action";
    button.type = "button";
    button.textContent = options.label || defaultLabel;
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(content);
        button.textContent = root.dataset.labelCopied || "Copied";
        setTimeout(() => {
          button.textContent = options.label || defaultLabel;
        }, 1600);
      } catch {
        setStatus(root.dataset.errorGeneric || "Could not copy.");
      }
    });
    return button;
  }

  function createSafeCodeBlock(code, language) {
    const normalizedLanguage = typeof language === "string" ? language.trim() : "";
    const safeLanguage = safeLanguagePattern.test(normalizedLanguage)
      ? normalizedLanguage.toUpperCase()
      : root.dataset.labelCode || "CODE";
    const shell = document.createElement("div");
    shell.className = "smartbolig-ai__code-shell";

    const head = document.createElement("div");
    head.className = "smartbolig-ai__code-head";
    const languageLabel = document.createElement("span");
    languageLabel.textContent = safeLanguage;
    const copyButton = createCopyButton(code, {
      className: "smartbolig-ai__code-copy",
      label: root.dataset.labelCopyCode || "Copy code",
    });
    head.append(languageLabel, copyButton);

    const pre = document.createElement("pre");
    const codeElement = document.createElement("code");
    codeElement.textContent = code;
    pre.append(codeElement);
    shell.append(head, pre);
    return shell;
  }

  return { createCopyButton, createSafeCodeBlock };
}
