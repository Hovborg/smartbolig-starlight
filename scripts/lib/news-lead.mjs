// What a news article is about, in a few words. Shared by the news overview
// (src/lib/ai-news-feed.ts) and the header picture (ai-news-render-image.mjs),
// so the row, the card and the picture always name the same story.

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'" };

/** A heading as plain text: without word-break tags and escaped characters. */
export function decodeHeadline(value) {
  return String(value)
    .replace(/<wbr\s*\/?>/gi, "")
    .replace(/&#(?:x([0-9a-f]+)|([0-9]+));/gi, (entity, hex, decimal) => {
      const codePoint = Number.parseInt(hex || decimal, hex ? 16 : 10);
      return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity;
    })
    .replace(/&(amp|lt|gt|quot|apos);/gi, (entity, name) => ENTITIES[name.toLowerCase()] || entity);
}

/** The heading of the first story in an article, without its number. */
export function firstHeadline(body) {
  const match = String(body ?? "").match(/^###\s+(.+)$/m);
  return match ? decodeHeadline(match[1].trim()).replace(/^\d+\.\s+/, "") : "";
}

/**
 * "AI-nyheder, 14. november 2026: OpenAI Codex 0.169.0" names its main story
 * after the colon. Older titles are only a date, so the first story is used.
 */
export function mainStory(title, headline = "") {
  const text = String(title ?? "").trim();
  const named = text.includes(": ") ? text.slice(text.indexOf(": ") + 2).trim() : "";
  return named || headline || text;
}
