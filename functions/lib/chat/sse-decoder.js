// Decodes Server-Sent Events from byte chunks into { event, data } messages.
//
// The Worker reads the model's stream with it and the browser reads /api/chat
// with it (src/lib/assistant-stream.mjs), so a change here changes both.
// A chunk may end anywhere: inside a line, or inside a multi-byte character.

export function createSseDecoder() {
  const bytes = new TextDecoder();
  let buffer = "";
  let event = "";
  let data = [];

  function dispatch(messages) {
    if (data.length > 0) messages.push({ event: event || "message", data: data.join("\n") });
    event = "";
    data = [];
  }

  function readLine(line, messages) {
    if (line === "") {
      dispatch(messages);
      return;
    }
    if (line.startsWith(":")) return; // A comment; servers use it as a keep-alive.
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");
    if (field === "event") event = value;
    else if (field === "data") data.push(value);
  }

  function readLines(messages, atEnd) {
    for (;;) {
      const index = buffer.search(/[\r\n]/);
      if (index === -1) return;
      // A lone \r at the very end may be the first half of a \r\n pair.
      if (!atEnd && buffer[index] === "\r" && index === buffer.length - 1) return;
      const next = buffer[index] === "\r" && buffer[index + 1] === "\n" ? index + 2 : index + 1;
      readLine(buffer.slice(0, index), messages);
      buffer = buffer.slice(next);
    }
  }

  return {
    push(chunk) {
      const messages = [];
      buffer += typeof chunk === "string" ? chunk : bytes.decode(chunk, { stream: true });
      readLines(messages, false);
      return messages;
    },
    // The stream ended. A last event that lacks its blank line is still
    // delivered: losing the final words of an answer is worse than being strict.
    end() {
      const messages = [];
      buffer += bytes.decode();
      readLines(messages, true);
      if (buffer) readLine(buffer, messages);
      buffer = "";
      dispatch(messages);
      return messages;
    },
  };
}
