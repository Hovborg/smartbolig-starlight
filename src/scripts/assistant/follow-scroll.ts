// Keeps the place where the answer is being written in view, but only while the
// reader stays there. Scrolling up to read hands the scroll position to the reader.
import type { AssistantContext } from "./context";

// How far above the writing position the reader may be and still count as following it.
const SLACK_PX = 48;
// Space kept below the writing position.
const MARGIN_PX = 12;

export function createFollowScroll({ root }: AssistantContext) {
  const conversation = root.querySelector("[data-chat-conversation]");
  let anchor: HTMLElement | null = null;
  let following = true;

  // The bottom edge of the anchor, measured from the top of the scrolled content.
  function anchorBottom(scroller: HTMLElement) {
    if (!anchor?.isConnected) return scroller.scrollHeight;
    return anchor.getBoundingClientRect().bottom - scroller.getBoundingClientRect().top + scroller.scrollTop;
  }

  if (conversation instanceof HTMLElement) {
    conversation.addEventListener(
      "scroll",
      () => {
        following = conversation.scrollTop + conversation.clientHeight >= anchorBottom(conversation) - SLACK_PX;
      },
      { passive: true },
    );
  }

  return {
    // A new answer starts: follow it until the reader scrolls away.
    start() {
      following = true;
    },
    // Brings the bottom of `element` into view. It only ever scrolls down, so a
    // reader who went further down to the sources is left where they are.
    follow(element: HTMLElement) {
      anchor = element;
      if (!following || !(conversation instanceof HTMLElement)) return;
      const top = anchorBottom(conversation) + MARGIN_PX - conversation.clientHeight;
      if (top > conversation.scrollTop) conversation.scrollTop = top;
    },
    // Scrolls up to the top of `element` when it is hidden above the visible
    // part. Used when the first words arrive: on a phone the view was on the
    // sources below them.
    reveal(element: HTMLElement) {
      if (!following || !(conversation instanceof HTMLElement)) return;
      const top =
        element.getBoundingClientRect().top - conversation.getBoundingClientRect().top + conversation.scrollTop - MARGIN_PX;
      if (top < conversation.scrollTop) conversation.scrollTop = Math.max(0, top);
    },
    // The newest message as a whole, for an answer that arrived in one piece.
    toBottom() {
      anchor = null;
      if (following && conversation instanceof HTMLElement) conversation.scrollTop = conversation.scrollHeight;
    },
  };
}

export type FollowScroll = ReturnType<typeof createFollowScroll>;
