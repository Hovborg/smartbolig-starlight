import { FEEDS, OFFICIAL_SOURCE_URLS } from "../../scripts/ai-news-sources.mjs";

/** Short provider name for a source URL, shown as a label on headlines. */
export const sourceLabel = (url: string): string => {
  if (url.includes("openai/codex")) return "Codex";
  if (url.includes("anthropics/claude-code") || url.includes("code.claude.com")) return "Claude Code";
  if (url.includes("google-gemini/gemini-cli")) return "Gemini CLI";
  if (url.includes("openclaw/openclaw")) return "OpenClaw";
  if (url.includes("ai.google.dev") || url.includes("blog.google")) return "Google AI";
  if (url.includes("openai.com") || url.includes("platform.openai.com")) return "OpenAI";
  if (url.includes("anthropic.com")) return "Anthropic";
  return "AI";
};

/** Readable host (or github.com/owner/repo) for a source URL. */
export const sourceName = (url: string): string => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "github.com") {
      const repo = parsed.pathname.split("/").filter(Boolean).slice(0, 2).join("/");
      return repo ? `${host}/${repo}` : host;
    }
    return host;
  } catch {
    return url.replace(/^https?:\/\//, "");
  }
};

export interface SourceGroup {
  label: string;
  urls: string[];
}

const urls: string[] = OFFICIAL_SOURCE_URLS;

/** The monitored official sources, grouped by provider. */
export const sourceGroups: SourceGroup[] = [
  {
    label: "OpenAI",
    urls: urls.filter((url) => url.includes("openai") || url.includes("platform.openai")),
  },
  {
    label: "Anthropic",
    urls: urls.filter((url) => url.includes("anthropic") || url.includes("claude.com")),
  },
  {
    label: "Google",
    urls: urls.filter((url) => url.includes("google") || url.includes("gemini")),
  },
  {
    label: "OpenClaw",
    urls: urls.filter((url) => url.includes("openclaw")),
  },
].filter((group) => group.urls.length > 0);

export const totalSourceCount: number = urls.length;

/** Names of the feeds marked critical, shown as "primary sources". */
export const criticalFeeds: string[] = (FEEDS as { name: string; critical?: boolean }[])
  .filter((feed) => feed.critical)
  .map((feed) => feed.name);
