// Reads a streamed Workers AI answer into the shape a non-streamed call returns.
//
// Cloudflare documents the stream as text/event-stream, but not the chunk shape.
// Both chat models were read on 2026-11-14: the answer is in
// `choices[0].delta.content`, reasoning is in `delta.reasoning_content` (never
// passed on), a chunk with `finish_reason` ends the answer, and `[DONE]` ends
// the stream. Older models send the text in `response` and the finish reason
// beside it; that is read too.

import { contentText, isTokenLimitReason } from "./answer.js";
import { createSseDecoder } from "./sse-decoder.js";

export function isModelStream(result) {
  return typeof result?.getReader === "function";
}

// What a delta may hold. A delta with none of these is a shape this reader does not know.
const DELTA_KEYS = ["content", "reasoning_content", "reasoning", "role"];

function readChunk(payload) {
  const choice = payload?.choices?.[0];
  const delta = choice?.delta;
  const text = contentText(delta?.content) || (typeof payload?.response === "string" ? payload.response : "");
  const finishReason =
    [choice?.finish_reason, payload?.finish_reason, payload?.stop_reason].find((reason) => typeof reason === "string" && reason) ?? "";
  // Pieces without answer text that are understood all the same: the usage
  // tail, reasoning, a role and an empty piece.
  const quiet =
    typeof payload?.response === "string" ||
    (Array.isArray(payload?.choices) && payload.choices.length === 0) ||
    (delta !== null && typeof delta === "object" && DELTA_KEYS.some((key) => key in delta));
  return { text, finishReason, known: Boolean(text || finishReason || quiet) };
}

function streamError() {
  const error = new Error("ModelStreamError");
  error.name = "ModelStreamError";
  return error;
}

/**
 * Resolves to { response, finish_reason?, unknown_chunks? } when the stream has
 * ended. `onText` gets the answer text as it arrives, except the last
 * `holdBack(textSoFar)` characters, which wait for the next piece. Reading
 * stops early when the answer passes `maxChars`, when `stopWhen(textSoFar)` is
 * true (nothing more is passed on), or when `signal` aborts; the model is then
 * told to stop writing. A stream that closes before the model said it was
 * finished is marked as cut off, and an error sent inside the stream is thrown.
 */
export async function readModelStream(stream, { holdBack, maxChars = Infinity, onText, signal, stopWhen } = {}) {
  const reader = stream.getReader();
  const decoder = createSseDecoder();
  const cancel = () => {
    reader.cancel().catch(() => {});
  };
  let text = "";
  let passed = 0; // Characters of `text` given to onText.
  let finishReason;
  let finished = false; // The model said it was done: a finish reason or [DONE].
  let rejected = false; // Over the size limit, or stopWhen said stop.
  let unknown = 0; // Chunks in a shape this reader does not know.

  const pass = (heldBack) => {
    const end = text.length - heldBack;
    if (end <= passed) return;
    onText?.(text.slice(passed, end));
    passed = end;
  };

  // True when nothing more should be read.
  const take = (messages) => {
    for (const message of messages) {
      if (message.data.trim() === "[DONE]") {
        finished = true;
        return true;
      }
      let payload;
      try {
        payload = JSON.parse(message.data);
      } catch {
        continue;
      }
      if (payload?.error || payload?.errors?.length) throw streamError();
      const chunk = readChunk(payload);
      if (!chunk.known) unknown += 1;
      if (chunk.finishReason) {
        finishReason = chunk.finishReason;
        finished = true;
      }
      if (!chunk.text) continue;
      text += chunk.text;
      // Cut at the size limit: mark it as cut off so the answer checks reject it.
      if (text.length > maxChars) finishReason = "length";
      if (text.length > maxChars || stopWhen?.(text)) {
        rejected = true;
        return true;
      }
      pass(holdBack?.(text) ?? 0);
    }
    return false;
  };

  signal?.addEventListener("abort", cancel, { once: true });
  try {
    // A request that was stopped before the stream arrived reads nothing.
    while (!signal?.aborted) {
      const { done, value } = await reader.read();
      if (signal?.aborted) break;
      if (done ? (take(decoder.end()), true) : take(decoder.push(value))) break;
    }
  } finally {
    signal?.removeEventListener("abort", cancel);
    cancel();
  }

  if (!rejected && !signal?.aborted) {
    // A stream that just closes is half an answer.
    if (!finished) finishReason = "length";
    // A draft the token limit cut off is withdrawn: what was held back stays unseen.
    else if (!isTokenLimitReason(finishReason)) pass(0);
  }

  return {
    response: text,
    ...(finishReason ? { finish_reason: finishReason } : {}),
    ...(unknown > 0 && !text ? { unknown_chunks: unknown } : {}),
  };
}
