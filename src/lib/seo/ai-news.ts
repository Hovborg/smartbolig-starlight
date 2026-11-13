import { type Lang, type PageEntry, siteUrl } from "./site";

const aiNewsSocialImageUrl = `${siteUrl}/images/ai-news-og.png`;
const aiNewsSchemaImages = [
  { url: `${siteUrl}/images/ai-news-og-16x9.png`, width: 1200, height: 675 },
  { url: `${siteUrl}/images/ai-news-og-4x3.png`, width: 1200, height: 900 },
  { url: `${siteUrl}/images/ai-news-og-1x1.png`, width: 1200, height: 1200 },
];

/** Social and schema images, alt text and feed link for AI-news pages. */
export function getAiNewsAssets(entry: PageEntry, lang: Lang, isAiNewsArticle: boolean) {
  const hero = isAiNewsArticle ? entry?.data?.heroImage : null;
  const heroSrc = typeof hero?.src === "string" ? hero.src : null;
  const heroAlt = typeof hero?.alt === "string" ? hero.alt : null;
  const heroUrl = heroSrc ? new URL(heroSrc, siteUrl).href : null;
  const heroStem = heroSrc?.replace(/\.[a-z0-9]+$/i, "");
  const heroExt = heroSrc?.match(/\.[a-z0-9]+$/i)?.[0] || "";
  const heroSchemaImages =
    heroUrl && heroStem && heroExt
      ? [
          { url: heroUrl, width: 1200, height: 630 },
          { url: `${siteUrl}${heroStem}-16x9${heroExt}`, width: 1200, height: 675 },
          { url: `${siteUrl}${heroStem}-4x3${heroExt}`, width: 1200, height: 900 },
          { url: `${siteUrl}${heroStem}-1x1${heroExt}`, width: 1200, height: 1200 },
        ]
      : null;
  return {
    socialImageUrl: heroUrl || aiNewsSocialImageUrl,
    schemaImages: heroSchemaImages || aiNewsSchemaImages,
    imageAlt: heroAlt || (lang === "da" ? "SmartBolig.net AI-nyheder" : "SmartBolig.net AI News"),
    aiNewsRssHref: lang === "da" ? `${siteUrl}/da/ai/nyheder/rss.xml` : `${siteUrl}/en/ai/news/rss.xml`,
    feedName: lang === "da" ? "SmartBolig.net AI-nyheder" : "SmartBolig.net AI News",
    keywords:
      lang === "da"
        ? ["AI-nyheder", "OpenAI Codex", "Claude Code", "Gemini CLI", "AI CLI", "API-priser"]
        : ["AI News", "OpenAI Codex", "Claude Code", "Gemini CLI", "AI CLI", "API pricing"],
  };
}

export type AiNewsAssets = ReturnType<typeof getAiNewsAssets>;