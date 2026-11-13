import type { AiNewsAssets } from "./ai-news";
import { buildBreadcrumbSchema } from "./breadcrumbs";
import { getPageDates } from "./dates";
import { getLocaleCodes, getPageKind, shouldRenderArticleSchema } from "./page-kind";
import { getTitleAndDescription } from "./page-text";
import { buildArticleSchema } from "./schema-article";
import { buildOrganizationSchema, buildWebsiteSchema } from "./schema-organization";
import { buildWebPageSchema } from "./schema-page";
import type { PageEntry } from "./site";

type GraphInput = {
  pathname: string;
  entry: PageEntry;
  lastUpdated: unknown;
  aiNews: AiNewsAssets;
};

/**
 * The page's JSON-LD graph as a string. "<" is escaped as the unicode sequence
 * so content from external sources (e.g. AI-news source URLs) can never break
 * out of the <script> block; JSON.stringify does not escape "</script>" itself.
 */
export function buildSchemaJson({ pathname, entry, lastUpdated, aiNews }: GraphInput) {
  const kind = getPageKind(pathname);
  const { languageCode } = getLocaleCodes(kind.lang);
  const { title, description } = getTitleAndDescription(entry, kind.lang, kind.isNotFoundPage);
  const { dateModified, datePublished } = getPageDates(entry, lastUpdated);

  const graph: object[] = [buildOrganizationSchema(kind.lang), buildWebsiteSchema()];
  if (entry?.data || kind.isNotFoundPage) {
    graph.push(buildWebPageSchema({ kind, title, description, languageCode, dateModified, datePublished, aiNews }));
  }
  graph.push(buildBreadcrumbSchema(pathname, kind.lang, title, kind.isStartPage));
  if (shouldRenderArticleSchema(kind, Boolean(entry?.data))) {
    graph.push(buildArticleSchema({ kind, entry, title, description, languageCode, dateModified, datePublished, aiNews }));
  }
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
}