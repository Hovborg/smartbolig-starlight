// Fakes for the streamed chat tests: a model that streams, a site search, a
// network that delivers bytes in pieces and a reader for the endpoint's events.
// No real model or network is used.
import { CHAT_MODEL, createChatHandler, createWorkersAgent } from "../../functions/api/chat.js";

const encoder = new TextEncoder();

export const SEARCH_HIT = {
  url: "https://smartbolig.net/da/produkter/zigbee-koordinatorer/",
  title: "Zigbee-koordinatorer",
  heading: "Hvilken skal jeg vælge?",
  text: "En netværkskoordinator kan stå midt i huset.",
  score: 12,
};
export const SEARCH_SOURCE = { title: SEARCH_HIT.title, url: SEARCH_HIT.url };
export const DOMAIN_QUESTION = "Hvilken Zigbee-koordinator skal jeg bruge til Zigbee2MQTT?";
export const PLAIN_QUESTION = "Hvad koster det at komme i gang?";

/**
 * A byte stream of Server-Sent Events, one `data:` line per payload, as Workers
 * AI sends a streamed answer. A string payload is written as it is (a broken
 * line). `failAfter` breaks the stream after that many payloads, `hangAfter`
 * leaves it open without sending more, and `done: false` ends it without the
 * closing [DONE].
 */
export function sseStream(payloads, { failAfter, hangAfter, done = true } = {}) {
  const lines = payloads.map(
    (payload) => `data: ${typeof payload === "string" ? payload : JSON.stringify(payload)}\n\n`,
  );
  if (done) lines.push("data: [DONE]\n\n");
  let index = 0;
  return new ReadableStream({
    pull(controller) {
      if (index === failAfter) {
        controller.error(new Error("stream broke"));
        return undefined;
      }
      if (index === hangAfter) return new Promise(() => {});
      if (index === lines.length) {
        controller.close();
        return undefined;
      }
      controller.enqueue(encoder.encode(lines[index]));
      index += 1;
      return undefined;
    },
  });
}

/**
 * A streamed model answer. `shape` picks the chunk shape: "openai"
 * (choices[0].delta.content) or "legacy" (response). `finish: null` ends the
 * stream without a finish reason.
 */
export function modelStream(parts, { shape = "openai", finish = "stop", ...options } = {}) {
  const payloads = parts.map((text) =>
    shape === "openai" ? { choices: [{ index: 0, delta: { content: text } }] } : { response: text },
  );
  if (finish) {
    payloads.push(
      shape === "openai"
        ? { choices: [{ index: 0, delta: {}, finish_reason: finish }] }
        : { response: "", finish_reason: finish },
    );
  }
  return sseStream(payloads, options);
}

export const completion = (content, finishReason = "stop") => ({
  choices: [{ message: { content }, finish_reason: finishReason }],
});

export const searchCall = (query) => ({
  choices: [
    {
      message: {
        content: null,
        tool_calls: [
          { id: "call-1", type: "function", function: { name: "search_smartbolig", arguments: JSON.stringify({ query }) } },
        ],
      },
    },
  ],
});

/**
 * A chat handler around a scripted model. `script(call)` returns what the model
 * answers for that call; `call` is { index, model, stream, tools, primary }.
 * Returns { handler, calls, logs, searches }.
 */
export function createStreamHarness(script, options = {}) {
  const calls = [];
  const logs = [];
  const searches = [];
  const agentRunner = createWorkersAgent({
    aiRunImpl: async (_binding, model, input, runOptions) => {
      const call = {
        index: calls.length,
        model,
        stream: input.stream,
        tools: Array.isArray(input.tools),
        primary: model === CHAT_MODEL,
        signal: runOptions.signal,
      };
      calls.push(call);
      return script(call);
    },
  });
  const handler = createChatHandler({
    agentRunner,
    createRequestId: () => "req-stream-1",
    logger: {
      error: (message, details) => logs.push({ level: "error", message, ...details }),
      warn: (message, details) => logs.push({ level: "warn", message, ...details }),
    },
    now: () => 1_000,
    siteSearch: () => async (query) => {
      searches.push(query);
      return [SEARCH_HIT];
    },
    ...options,
  });
  return { handler, calls, logs, searches };
}

export function chatRequest(content, { stream = true, headers = {}, body } = {}) {
  return new Request("https://smartbolig.net/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://smartbolig.net",
      "cf-connecting-ip": "203.0.113.42",
      ...(stream ? { accept: "text/event-stream" } : {}),
      ...headers,
    },
    body: body ?? JSON.stringify({ locale: "da", messages: [{ role: "user", content }] }),
  });
}

export function chatEnv(overrides = {}) {
  return {
    AI: { name: "fake-ai-binding" },
    CHAT_RATE_LIMITER: { limit: async () => ({ success: true }) },
    ...overrides,
  };
}

/** One event as the chat endpoint writes it. */
export const sse = (event, data) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

/**
 * A response body that delivers `text` in pieces of `size` bytes, as a network
 * would. `failAt` breaks the connection once that many bytes were delivered.
 */
export function bodyOf(text, { size = 7, failAt } = {}) {
  const all = encoder.encode(text);
  let offset = 0;
  return new ReadableStream({
    pull(controller) {
      if (failAt !== undefined && offset >= failAt) return controller.error(new TypeError("network error"));
      if (offset >= all.length) return controller.close();
      controller.enqueue(all.slice(offset, offset + size));
      offset += size;
      return undefined;
    },
  });
}

/** The events of a streamed response, in order: [{ event, data }]. */
export async function readEvents(response) {
  const text = await response.text();
  return text
    .split("\n\n")
    .filter(Boolean)
    .map((block) => {
      const event = /^event: (.+)$/m.exec(block)?.[1] ?? "message";
      const data = /^data: (.*)$/m.exec(block)?.[1] ?? "";
      return { event, data: data === "[DONE]" ? data : JSON.parse(data) };
    });
}

export const eventNames = (events) => events.map(({ event }) => event).join(" ");
export const deltaText = (events) =>
  events
    .filter(({ event }) => event === "delta")
    .map(({ data }) => data.text)
    .join("");
