// Request validation: bounded body reading and chat body shape checks.

import { ChatRequestError } from "./responses.js";
import { MAX_MESSAGES, MAX_MESSAGE_CHARS, MAX_REQUEST_BYTES, MAX_TOTAL_CHARS } from "./limits.js";

const ALLOWED_LOCALES = new Set(["da", "en"]);
const ALLOWED_ROLES = new Set(["user", "assistant"]);

export function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function hasOnlyKeys(value, allowedKeys) {
  return Object.keys(value).every((key) => allowedKeys.has(key));
}

export function validateChatBody(value) {
  if (!isPlainObject(value) || !hasOnlyKeys(value, new Set(["locale", "messages"]))) {
    return null;
  }
  if (!ALLOWED_LOCALES.has(value.locale) || !Array.isArray(value.messages)) {
    return null;
  }
  if (value.messages.length === 0 || value.messages.length > MAX_MESSAGES) {
    return null;
  }

  let totalChars = 0;
  const messages = [];

  for (const [index, message] of value.messages.entries()) {
    if (!isPlainObject(message) || !hasOnlyKeys(message, new Set(["role", "content"]))) {
      return null;
    }
    if (!ALLOWED_ROLES.has(message.role) || typeof message.content !== "string") {
      return null;
    }

    const content = message.content.trim();
    if (!content || content.length > MAX_MESSAGE_CHARS) {
      return null;
    }
    if (index === 0 && message.role !== "user") {
      return null;
    }
    if (index > 0 && messages[index - 1].role === message.role) {
      return null;
    }

    totalChars += content.length;
    if (totalChars > MAX_TOTAL_CHARS) {
      return null;
    }
    messages.push({ role: message.role, content });
  }

  if (messages.at(-1)?.role !== "user") {
    return null;
  }

  return { locale: value.locale, messages };
}

export async function readBoundedBody(request) {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const declaredLength = Number.parseInt(contentLength, 10);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
      throw new ChatRequestError(413, "payload_too_large");
    }
  }

  if (!request.body) return "";

  const chunks = [];
  let totalBytes = 0;
  const reader = request.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_REQUEST_BYTES) {
      await reader.cancel();
      throw new ChatRequestError(413, "payload_too_large");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new ChatRequestError(400, "invalid_request");
  }
}
