// Cloudflare Pages Function for /api/chat. The logic lives in functions/lib/chat/.
import { createChatHandler } from "../lib/chat/handler.js";

export {
  CHAT_FALLBACK_MODEL,
  CHAT_MODEL,
  FALLBACK_MAX_MODEL_TOKENS,
  FALLBACK_MODEL_TIMEOUT_MS,
  MAX_ANSWER_CHARS,
  MAX_MESSAGE_CHARS,
  MAX_MESSAGES,
  MAX_MODEL_TOKENS,
  MAX_REQUEST_BYTES,
  MAX_SEARCH_CHUNK_CHARS,
  MAX_SEARCH_QUERY_CHARS,
  MAX_SEARCH_RESULTS,
  MAX_TOTAL_CHARS,
  PRIMARY_MODEL_TIMEOUT_MS,
  SEARCH_TIMEOUT_MS,
} from "../lib/chat/limits.js";
export { createWorkersAgent } from "../lib/chat/agent.js";
export { createChatHandler } from "../lib/chat/handler.js";
export { buildSystemPrompt } from "../lib/chat/prompt.js";
export { validateChatBody } from "../lib/chat/request.js";
export { normalizeSearchResults } from "../lib/chat/sources.js";

export const onRequest = createChatHandler();
