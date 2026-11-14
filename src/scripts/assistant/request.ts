// Asks the same-origin chat endpoint: as an event stream when the browser can
// read one, and as the plain JSON response otherwise or when the stream fails
// before it has written any text.
import { readChatStream } from "../../lib/assistant-stream.mjs";

export interface AnswerHandlers {
  onStage: (stage: string) => void;
  onSources: (sources: unknown) => void;
  onText: (text: string) => void;
  // The stream gave up before any text; the question is asked again as JSON.
  onRestart: () => void;
}

type RequestError = Error & { code?: string; statusCode?: number };

function requestError(code: string | undefined, statusCode: number): RequestError {
  const error: RequestError = new Error("AssistantRequestFailed");
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function post(payload: unknown, signal: AbortSignal, stream: boolean) {
  return fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", ...(stream ? { accept: "text/event-stream" } : {}) },
    body: JSON.stringify(payload),
    signal,
  });
}

async function readJson(response: Response) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok || typeof result.answer !== "string" || !result.answer.trim()) {
    throw requestError(result.code, response.status);
  }
  return result;
}

/** Resolves to the response body of a finished answer; rejects like the JSON request always did. */
export async function requestAnswer(payload: unknown, signal: AbortSignal, handlers: AnswerHandlers) {
  const canReadStreams = typeof ReadableStream === "function" && typeof TextDecoder === "function";
  if (!canReadStreams) return readJson(await post(payload, signal, false));

  const response = await post(payload, signal, true);
  const isStream = /^text\/event-stream\b/i.test(response.headers.get("content-type") || "");
  // A refusal (rate limit, invalid input) and a server with streaming turned off answer in JSON.
  if (!isStream || !response.body) return readJson(response);

  let wroteText = false;
  let outcome: Awaited<ReturnType<typeof readChatStream>>;
  try {
    outcome = await readChatStream(response.body, (event) => {
      if (event.type === "status") handlers.onStage(event.stage);
      else if (event.type === "sources") handlers.onSources(event.sources);
      else if (event.type === "delta") {
        if (event.text.trim()) wroteText = true;
        handlers.onText(event.text);
      }
    });
  } catch (error) {
    if (signal.aborted) throw error;
    outcome = { failed: true };
  }

  if ("result" in outcome) return outcome.result;
  // Half an answer is never shown as an answer, and never patched up by a second request.
  if (wroteText) throw requestError(outcome.code, response.status);
  handlers.onRestart();
  return readJson(await post(payload, signal, false));
}
