// The browser's side of the /api/chat event stream: bytes in, typed events out,
// plus what part of a half-written answer is fit to show. No DOM, so Node tests it.
// The events are described in functions/lib/chat/stream-response.js.

import { createSseDecoder } from "../../functions/lib/chat/sse-decoder.js";

const STAGES = new Set(["reading", "searching", "writing", "revising"]);

function readEvent({ event, data }) {
  if (event === "message") return data.trim() === "[DONE]" ? { type: "end" } : null;
  let body;
  try {
    body = JSON.parse(data);
  } catch {
    return null;
  }
  if (!body || typeof body !== "object") return null;

  if (event === "status") return STAGES.has(body.stage) ? { type: "status", stage: body.stage } : null;
  if (event === "sources") return Array.isArray(body.sources) ? { type: "sources", sources: body.sources } : null;
  if (event === "delta") return typeof body.text === "string" && body.text ? { type: "delta", text: body.text } : null;
  if (event === "done") {
    return typeof body.answer === "string" && body.answer.trim() ? { type: "done", result: body } : null;
  }
  if (event === "error") return { type: "error", code: typeof body.code === "string" ? body.code : undefined };
  return null; // An event this version does not know: a newer server may send more.
}

export function createChatEventReader() {
  const decoder = createSseDecoder();
  const typed = (messages) => messages.map(readEvent).filter(Boolean);
  return {
    push: (chunk) => typed(decoder.push(chunk)),
    end: () => typed(decoder.end()),
  };
}

/**
 * Reads a streamed response body to its end. `onEvent` gets every status,
 * sources and delta event. Resolves to { result } for a finished answer and to
 * { failed: true, code } when the server reported an error or the stream ended
 * without an answer. A network failure or an abort rejects, as fetch does.
 */
export async function readChatStream(body, onEvent) {
  const reader = body.getReader();
  const events = createChatEventReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      for (const event of done ? events.end() : events.push(value)) {
        if (event.type === "done") return { result: event.result };
        if (event.type === "error") return { failed: true, code: event.code };
        if (event.type === "end") return { failed: true };
        onEvent(event);
      }
      if (done) return { failed: true };
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

// An opened **bold** or `code` span at the end of the last line is closed for
// display, so the reader never sees stray asterisks or backticks flash by.
function closeOpenSpan(line) {
  let shown = line.endsWith("*") && !line.endsWith("**") ? line.slice(0, -1) : line;
  if ((shown.match(/`/g) || []).length % 2 === 1) {
    return shown.endsWith("`") ? shown.slice(0, -1) : `${shown}\``;
  }
  if ((shown.match(/\*\*/g) || []).length % 2 === 1) {
    shown = shown.endsWith("**") ? shown.slice(0, -2) : `${shown}**`;
  }
  return shown;
}

/**
 * The part of a half-written answer to show now. With `wholeLinesOnly` (reduced
 * motion) the line that is still being written is held back, so text arrives a
 * line at a time instead of moving with every word.
 */
export function visibleDraft(text, wholeLinesOnly = false) {
  const draft = wholeLinesOnly ? text.slice(0, text.lastIndexOf("\n") + 1) : text;
  const lines = draft.split("\n");
  const insideCode = lines.filter((line) => /^\s*```/.test(line)).length % 2 === 1;
  if (insideCode) return draft;
  const last = lines.pop();
  // A fence or heading marker that is only half there would show as text.
  if (/^\s*(?:`{1,3}|#{1,4})$/.test(last)) return lines.join("\n");
  return [...lines, closeOpenSpan(last)].join("\n");
}
