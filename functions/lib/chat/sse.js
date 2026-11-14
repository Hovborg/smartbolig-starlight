// A Server-Sent Events response whose events are written while the request runs.

const SSE_HEADERS = {
  "cache-control": "no-store",
  "content-type": "text/event-stream; charset=utf-8",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
};

export function wantsEventStream(request) {
  return /(?:^|,)\s*text\/event-stream\s*(?:;|,|$)/i.test(request.headers.get("accept") || "");
}

/**
 * `produce(send, signal)` writes the events with send(event, data) and resolves
 * when there is nothing more to say. `signal` aborts when the reader is gone:
 * the visitor pressed Stop or closed the page.
 *
 * Returns { response, finished }. `finished` settles when the stream has
 * ended, so the Worker can be kept alive until then.
 */
export function eventStreamResponse(requestId, produce) {
  const encoder = new TextEncoder();
  const reader = new AbortController();
  let controller;
  const body = new ReadableStream({
    start(streamController) {
      controller = streamController;
    },
    cancel() {
      reader.abort();
    },
  });

  const write = (text) => {
    if (reader.signal.aborted) return;
    try {
      controller.enqueue(encoder.encode(text));
    } catch {
      reader.abort();
    }
  };
  // JSON keeps every line break inside the data escaped, so one event is always one data line.
  const send = (event, data) => write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const finished = Promise.resolve()
    .then(() => produce(send, reader.signal))
    .catch(() => {})
    .finally(() => {
      if (reader.signal.aborted) return;
      write("data: [DONE]\n\n");
      try {
        controller.close();
      } catch {
        // The reader went away between the last event and the close.
      }
    });

  const headers = new Headers(SSE_HEADERS);
  if (requestId) headers.set("x-request-id", requestId);
  return { response: new Response(body, { status: 200, headers }), finished };
}
