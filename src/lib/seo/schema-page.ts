import type { AiNewsAssets } from "./ai-news";
import type { PageKind } from "./page-kind";
import { defaultSchemaImage, siteUrl } from "./site";

type PageSchemaInput = {
  kind: PageKind;
  title: string;
  description: string;
  languageCode: string;
  dateModified: string | null;
  datePublished: string | undefined;
  aiNews: AiNewsAssets;
};

function getWebPageType(kind: PageKind) {
  if (kind.isAiNewsIndex || kind.isSectionIndex) return "CollectionPage";
  if (kind.isContactPage) return "ContactPage";
  if (kind.isAboutPage) return "AboutPage";
  return "WebPage";
}

/** WebPage / CollectionPage / ContactPage / AboutPage schema for one page. */
export function buildWebPageSchema(input: PageSchemaInput) {
  const { kind, title, description, languageCode, dateModified, datePublished, aiNews } = input;
  return {
    "@context": "https://schema.org",
    "@type": getWebPageType(kind),
    "@id": `${kind.pageUrl}#webpage`,
    name: title,
    description,
    url: kind.pageUrl,
    inLanguage: languageCode,
    dateModified: dateModified || datePublished,
    isPartOf: { "@id": `${siteUrl}/#website` },
    publisher: { "@id": `${siteUrl}/#organization` },
    image: kind.isAiNewsPage
      ? aiNews.schemaImages.map((image) => ({ "@type": "ImageObject", ...image }))
      : defaultSchemaImage,
    ...(kind.isAiNewsIndex && {
      mainEntity: { "@type": "DataFeed", name: aiNews.feedName, url: aiNews.aiNewsRssHref },
    }),
  };
}