// Session-only conversation history: normalising, persisting and bounding what is sent.
import {
  MAX_HISTORY_CHARS,
  MAX_HISTORY_MESSAGES,
  MAX_MESSAGE_CHARS,
  SAFE_SOURCE_HOSTS,
} from "./constants";
import { normalizeDiagnostics } from "./diagnostics";

export interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  sourceMode?: "official" | "mixed" | "general";
  diagnostics?: ReturnType<typeof normalizeDiagnostics>;
  sources?: any[];
}

// `message` comes from sessionStorage or the API, so it is deliberately loosely typed.
export function normalizeStoredMessage(message: any): StoredMessage | null {
  if (!message || typeof message !== "object") return null;
  if (message.role !== "user" && message.role !== "assistant") return null;
  if (typeof message.content !== "string") return null;
  const content = message.content.trim().slice(0, MAX_MESSAGE_CHARS);
  if (!content) return null;

  const normalized: StoredMessage = { role: message.role, content };
  if (message.role === "assistant") {
    normalized.sourceMode =
      message.sourceMode === "official" ? "official" : message.sourceMode === "mixed" ? "mixed" : "general";
    normalized.diagnostics = normalizeDiagnostics(message.diagnostics);
    if (Array.isArray(message.sources)) {
      normalized.sources = message.sources.slice(0, 5).filter((source: any) => {
        if (!source || typeof source.title !== "string" || typeof source.url !== "string") return false;
        try {
          const sourceUrl = new URL(source.url);
          return (
            sourceUrl.protocol === "https:" &&
            !sourceUrl.port &&
            !sourceUrl.username &&
            !sourceUrl.password &&
            SAFE_SOURCE_HOSTS.has(sourceUrl.hostname)
          );
        } catch {
          return false;
        }
      });
    }
  }
  return normalized;
}

export function createHistoryStore(storageKey: string) {
  let history: StoredMessage[] = loadHistory();

  function loadHistory() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(storageKey) || "[]");
      if (!Array.isArray(parsed)) return [];

      const safe: StoredMessage[] = [];
      for (const candidate of parsed.slice(-MAX_HISTORY_MESSAGES)) {
        const message = normalizeStoredMessage(candidate);
        if (!message) continue;
        if (safe.length === 0 && message.role !== "user") continue;
        if (safe.at(-1)?.role === message.role) continue;
        safe.push(message);
      }
      return safe;
    } catch {
      return [];
    }
  }

  function saveHistory() {
    try {
      const storedHistory = history.slice(-MAX_HISTORY_MESSAGES).map(normalizeStoredMessage).filter(Boolean);
      sessionStorage.setItem(storageKey, JSON.stringify(storedHistory));
    } catch {
      // Storage may be unavailable in hardened/private browser contexts.
    }
  }

  function createRequestMessages() {
    const requestMessages: { role: string; content: string }[] = [];
    let remainingChars = MAX_HISTORY_CHARS;

    for (
      let index = history.length - 1;
      index >= 0 && remainingChars > 0 && requestMessages.length < MAX_HISTORY_MESSAGES;
      index -= 1
    ) {
      const message = history[index];
      const content = message.content.slice(0, Math.min(MAX_MESSAGE_CHARS, remainingChars));
      if (!content) continue;
      requestMessages.unshift({ role: message.role, content });
      remainingChars -= content.length;
    }

    while (requestMessages.length > 0 && requestMessages[0]?.role !== "user") {
      requestMessages.shift();
    }
    return requestMessages;
  }

  return {
    get items() {
      return history;
    },
    set(next: StoredMessage[]) {
      history = next;
    },
    saveHistory,
    createRequestMessages,
  };
}

export type HistoryStore = ReturnType<typeof createHistoryStore>;
