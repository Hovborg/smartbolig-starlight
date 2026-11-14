// JSON responses, localized error bodies and the request error type.

const JSON_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
};

export class ChatRequestError extends Error {
  constructor(status, code) {
    super(code);
    this.name = "ChatRequestError";
    this.status = status;
    this.code = code;
  }
}

// The body of every error, in both languages. A streamed request sends the
// same body in its `error` event.
export function responseBodyFor(code) {
  return {
    code,
    error: {
      da: {
        invalid_request: "Beskeden kunne ikke behandles. Kontrollér teksten og prøv igen.",
        forbidden: "Forespørgslen blev afvist.",
        method_not_allowed: "Denne handling er ikke understøttet.",
        payload_too_large: "Samtalen er for stor. Start en ny samtale og prøv igen.",
        unsupported_media_type: "Forespørgslen skal sendes som JSON.",
        rate_limited: "Der er sendt mange beskeder på kort tid. Vent et øjeblik og prøv igen.",
        service_unavailable: "AI-assistenten er ikke klar lige nu. Prøv igen senere.",
        assistant_unavailable: "AI-assistenten kunne ikke svare. Prøv igen om lidt.",
      }[code],
      en: {
        invalid_request: "The message could not be processed. Check the text and try again.",
        forbidden: "The request was rejected.",
        method_not_allowed: "This action is not supported.",
        payload_too_large: "The conversation is too large. Start a new chat and try again.",
        unsupported_media_type: "The request must be sent as JSON.",
        rate_limited: "Many messages were sent in a short time. Wait a moment and try again.",
        service_unavailable: "The AI assistant is not ready right now. Please try again later.",
        assistant_unavailable: "The AI assistant could not respond. Please try again shortly.",
      }[code],
    },
  };
}

export function jsonResponse(codeOrBody, status, requestId, extraHeaders = {}) {
  const body = typeof codeOrBody === "string" ? responseBodyFor(codeOrBody) : codeOrBody;
  const headers = new Headers({
    ...JSON_HEADERS,
    ...extraHeaders,
  });
  if (requestId) headers.set("x-request-id", requestId);

  return new Response(JSON.stringify(body), { status, headers });
}
