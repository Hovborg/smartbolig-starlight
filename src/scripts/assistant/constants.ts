// Limits and allowlists shared by the assistant's client modules.
export const MAX_HISTORY_MESSAGES = 10;
export const MAX_HISTORY_CHARS = 8_000;
export const MAX_MESSAGE_CHARS = 2000;
export const REQUEST_TIMEOUT_MS = 180_000;
export const SAFE_SOURCE_HOSTS = new Set(["smartbolig.net", "www.home-assistant.io", "esphome.io"]);
export const ALLOWED_DIAGNOSTIC_MODELS = new Set([
  "gemma-4-26b-a4b-it",
  "qwen3-30b-a3b-fp8",
  "unknown",
]);
export const ALLOWED_DIAGNOSTIC_ROUTES = new Set(["primary", "fallback", "unknown"]);
export const SAFE_DIAGNOSTIC_TRACE = /^[A-Za-z0-9._:-]{1,64}$/;
export const safeLanguagePattern = /^[a-zA-Z0-9_+-]{1,20}$/;
