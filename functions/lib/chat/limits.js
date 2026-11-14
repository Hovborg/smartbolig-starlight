// Shared model names, size limits and timeouts for the chat API.

export const CHAT_MODEL = "@cf/google/gemma-4-26b-a4b-it";
export const CHAT_FALLBACK_MODEL = "@cf/qwen/qwen3-30b-a3b-fp8";
export const MAX_REQUEST_BYTES = 24_000;
export const MAX_MESSAGES = 10;
export const MAX_MESSAGE_CHARS = 2_000;
export const MAX_TOTAL_CHARS = 8_000;
export const MAX_ANSWER_CHARS = 12_000;
export const MAX_SEARCH_QUERY_CHARS = 400;
export const MAX_SEARCH_RESULTS = 5;
export const MAX_SEARCH_CHUNK_CHARS = 2_400;
export const MAX_MODEL_TOKENS = 2_400;
export const FALLBACK_MAX_MODEL_TOKENS = 1_600;
export const PRIMARY_MODEL_TIMEOUT_MS = 55_000;
export const FALLBACK_MODEL_TIMEOUT_MS = 25_000;
export const SEARCH_TIMEOUT_MS = 5_000;

// Answers are written to the browser while the model writes them when the
// request asks for text/event-stream. Set to false to answer every request
// with the JSON response again; the widget then falls back by itself.
export const STREAMING_ENABLED = true;

export const CHAT_MODEL_DIAGNOSTIC = "gemma-4-26b-a4b-it";
export const CHAT_FALLBACK_MODEL_DIAGNOSTIC = "qwen3-30b-a3b-fp8";
export const MAX_PUBLIC_DURATION_MS = 180_000;
