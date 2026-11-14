// Reads a streamed Workers AI answer into the shape a non-streamed call returns.
//
// Cloudflare documents the stream as text/event-stream, but not the chunk shape
// of the two chat models. Both shapes in use are therefore read: the OpenAI one
// (`choices[0].delta.content`) and the older one (`response`). Reasoning deltas
// are never passed on: they are not part of the answer.

import { createSseDecoder } from "./sse-decoder.js";

export function isModelStream(result) {
  return typeof result?.getReader === "function";
}

function textOf(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => (part?.type === "text" && typeof part.text === "string" ? part.text : ""))
    .join("");
}

function readChunk(payload) {
  const choice = payload?.choices?.[0];
  const text =
    textOf(choice?.delta?.content) ||
    (typeof choice?.text === "string" ? choice.text : "") ||
    (typeof payload?.response === "string" ? payload.response : "");
  const finishReason = [choice?.finish_reason, payload?.finish_reason, payload?.stop_reason].find(
    (reason) => typeof reason === "string" && reason,
  );
  return { text, finishReason };
}

/**
 * Resolves to { response, finish_reason? } when the stream has ended.
 * `onText` gets each piece of answer text as it arrives. Reading stops early
 * when the answer passes `maxChars`, when `stopWhen(textSoFar)` is true (that
 * piece is not passed on), or when `signal` aborts; the model is then told to
 * stop writing.
 */
export async function readModelStream(stream, { maxChars = Infinity, onText, signal, stopWhen } = {}) {
  const reader = stream.getReader();
  const decoder = createSseDecoder();
  const cancel = () => {
    reader.cancel().catch(() => {});
  };
  let text = "";
  let finishReason;

  // True when nothing more should be read.
  const take = (messages) => {
    for (const message of messages) {
      if (message.data.trim() === "[DONE]") return true;
      let payload;
      try {
        payload = JSON.parse(message.data);
      } catch {
        continue;
      }
      const chunk = readChunk(payload);
      if (chunk.finishReason) finishReason = chunk.finishReason;
      if (!chunk.text) continue;
      text += chunk.text;
      // Cut at the size limit: mark it as cut off so the answer checks reject it.
      if (text.length > maxChars) {
        finishReason = "length";
        return true;
      }
      if (stopWhen?.(text)) return true;
      onText?.(chunk.text);
    }
    return false;
  };

  signal?.addEventListener("abort", cancel, { once: true });
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (signal?.aborted) break;
      if (done) {
        take(decoder.end());
        break;
      }
      if (take(decoder.push(value))) {
        cancel();
        break;
      }
    }
  } finally {
    signal?.removeEventListener("abort", cancel);
  }

  return { response: text, ...(finishReason ? { finish_reason: finishReason } : {}) };
}
