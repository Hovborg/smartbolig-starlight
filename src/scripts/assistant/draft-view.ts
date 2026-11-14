// The answer while it is on its way: what happens now, the sources as soon as
// they are known and the text as it is written. Nothing here is stored.
import { visibleDraft } from "../../lib/assistant-stream.mjs";
import type { AssistantContext } from "./context";
import type { FollowScroll } from "./follow-scroll";
import type { StoredMessage } from "./history";
import type { createLoadingIndicator } from "./loading";
import { createSafeSourceLink } from "./sources";

interface DraftDeps {
  loading: ReturnType<typeof createLoadingIndicator>;
  follow: FollowScroll;
  createSafeRichText: (content: string) => HTMLElement;
  renderMessage: (message: StoredMessage) => HTMLElement;
}

// Replaces only what changed, from the first block that differs. The blocks the
// reader has already seen stay the same nodes, so a text selection survives.
function syncBlocks(target: HTMLElement, next: HTMLElement) {
  const fresh = [...next.childNodes];
  let same = 0;
  while (same < fresh.length && target.childNodes[same]?.isEqualNode(fresh[same])) same += 1;
  while (target.childNodes.length > same) target.lastChild?.remove();
  target.append(...fresh.slice(same));
}

export function createDraftView({ root, copy }: AssistantContext, deps: DraftDeps) {
  const { loading, follow, createSafeRichText, renderMessage } = deps;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  return function startDraft() {
    const article = loading.renderLoading();
    loading.startLoadingTimer(article);
    const bubble = article.querySelector(".smartbolig-ai__bubble") as HTMLElement;
    const consoleElement = article.querySelector(".smartbolig-ai__loading-console") as HTMLElement;
    const stageLine = article.querySelector("[data-chat-stage]") as HTMLElement;
    const richText = createSafeRichText("");
    richText.hidden = true;
    bubble.prepend(richText);
    let text = "";
    let frame = 0;
    let sourceBlock: HTMLElement | null = null;
    follow.start();

    // At most one repaint per frame, however fast the words arrive.
    function paint() {
      frame = 0;
      syncBlocks(richText, createSafeRichText(visibleDraft(text, reducedMotion.matches)));
      const hasText = richText.childNodes.length > 0;
      const firstWords = hasText && richText.hidden;
      richText.hidden = !hasText;
      article.toggleAttribute("data-has-text", hasText);
      if (firstWords) follow.reveal(bubble);
      follow.follow(hasText ? consoleElement : article);
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(paint);
    }

    return {
      setStage(label: string) {
        stageLine.textContent = label;
      },
      setSources(sources: unknown) {
        const links = Array.isArray(sources) ? sources.slice(0, 5).map(createSafeSourceLink).filter(Boolean) : [];
        sourceBlock?.remove();
        sourceBlock = null;
        if (links.length === 0) return;
        sourceBlock = document.createElement("div");
        sourceBlock.className = "smartbolig-ai__sources";
        const label = document.createElement("span");
        label.textContent = root.dataset.labelSources || "SmartBolig sources";
        sourceBlock.append(label, ...(links as HTMLElement[]));
        bubble.append(sourceBlock);
        schedule();
      },
      addText(chunk: string) {
        text += chunk;
        schedule();
      },
      // The text so far was withdrawn: by the server (a check rejected it) or
      // because the question is asked again without a stream.
      clearText() {
        text = "";
        schedule();
      },
      restart() {
        text = "";
        sourceBlock?.remove();
        sourceBlock = null;
        stageLine.textContent = copy.working;
        schedule();
      },
      // Puts the finished answer where the draft was. A reader of a streamed
      // answer is left exactly where they are; an answer that arrived in one
      // piece is scrolled into view as before.
      finish(message: StoredMessage) {
        if (frame) cancelAnimationFrame(frame);
        const streamed = text.length > 0;
        article.replaceWith(renderMessage(message));
        if (!streamed) follow.toBottom();
      },
    };
  };
}

export type Draft = ReturnType<ReturnType<typeof createDraftView>>;
