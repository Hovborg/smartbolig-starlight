import type { AiNewsAssets } from "./ai-news";
import type { PageKind } from "./page-kind";
import { defaultSchemaImage, type PageEntry, siteUrl } from "./site";

type ArticleSchemaInput = {
  kind: PageKind;
  entry: PageEntry;
  title: string;
  description: string;
  languageCode: string;
  dateModified: string | null;
  datePublished: string | undefined;
  aiNews: AiNewsAssets;
};

/** TechArticle / NewsArticle schema for content pages. */
export function buildArticleSchema(input: ArticleSchemaInput) {
  const { kind, entry, title, description, languageCode, dateModified, datePublished, aiNews } = input;
  const newsSources: string[] = Array.isArray(entry?.data?.news?.sources) ? entry!.data!.news.sources : [];
  return {
    "@context": "https://schema.org",
    "@type": kind.isAiNewsArticle ? "NewsArticle" : "TechArticle",
    "@id": `${kind.pageUrl}#article`,
    headline: title,
    description: description,
    url: kind.pageUrl,
    inLanguage: languageCode,
    datePublished: datePublished,
    dateModified: dateModified || datePublished,
    ...(kind.isAiNewsArticle && {
      articleSection: "AI News",
      keywords: aiNews.keywords,
      genre: "AI news briefing",
      isAccessibleForFree: true,
    }),
    ...(newsSources.length > 0 && {
      citation: newsSources.map((url) => ({ "@type": "CreativeWork", url })),
    }),
    isPartOf: { "@id": `${siteUrl}/#website` },
    author: { "@id": `${siteUrl}/#organization` },
    publisher: { "@id": `${siteUrl}/#organization` },
    image: kind.isAiNewsArticle
      ? aiNews.schemaImages.map((image) => ({ "@type": "ImageObject", ...image }))
      : defaultSchemaImage,
    mainEntityOfPage: { "@id": `${kind.pageUrl}#webpage` },
  };
}