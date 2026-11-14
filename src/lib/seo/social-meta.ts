import type { AiNewsAssets } from "./ai-news";
import { getLocaleCodes, type PageKind, shouldRenderArticleSchema } from "./page-kind";
import { getSocialImageAlt } from "./page-text";
import type { PageEntry } from "./site";

export type HeadEntry = {
  tag: string;
  attrs?: Record<string, string | boolean>;
  content?: string;
};

type SocialMetaInput = {
  head: HeadEntry[];
  kind: PageKind;
  entry: PageEntry;
  title: string;
  description: string;
  aiNews: AiNewsAssets;
  dateModified: string | null;
  datePublished: string | undefined;
};

/** Adds or overwrites a <meta> entry in Starlight's head list; skips empty content. */
function upsertMeta(head: HeadEntry[], key: "name" | "property", value: string, content: string | null | undefined) {
  if (!content) return;
  const existing = head.find((item) => item.tag === "meta" && item.attrs?.[key] === value);
  if (existing?.attrs) {
    existing.attrs.content = content;
  } else {
    head.push({ tag: "meta", attrs: { [key]: value, content } });
  }
}

function addLink(head: HeadEntry[], attrs: Record<string, string>) {
  const exists = head.some(
    (item) =>
      item.tag === "link" &&
      item.attrs?.rel === attrs.rel &&
      item.attrs?.href === attrs.href &&
      item.attrs?.hreflang === attrs.hreflang &&
      item.attrs?.type === attrs.type,
  );
  if (!exists) head.push({ tag: "link", attrs });
}

/**
 * Starlight lists an Astro and a Starlight generator tag. One is enough, so
 * only the first is kept.
 */
function keepFirstGenerator(head: HeadEntry[]) {
  let seen = false;
  for (let index = 0; index < head.length; index += 1) {
    const item = head[index];
    if (item.tag !== "meta" || item.attrs?.name !== "generator") continue;
    if (seen) head.splice(index--, 1);
    seen = true;
  }
}

/**
 * Mutates Starlight's head list with Open Graph, Twitter and article meta.
 * Starlight already emits the full hreflang set (da / en / x-default), so no
 * x-default is added here: a duplicate x-default is malformed and can make
 * Google ignore the whole alternate set.
 */
export function applySocialMeta(input: SocialMetaInput) {
  const { head, kind, entry, title, description, aiNews, dateModified, datePublished } = input;
  const { openGraphLocale, alternateOpenGraphLocale } = getLocaleCodes(kind.lang);
  const socialImageAlt = getSocialImageAlt(kind.lang);

  keepFirstGenerator(head);

  if (entry?.data || kind.isNotFoundPage) {
    upsertMeta(head, "name", "description", description);
    upsertMeta(head, "property", "og:description", description);
    upsertMeta(head, "property", "og:type", shouldRenderArticleSchema(kind, Boolean(entry?.data)) ? "article" : "website");
    upsertMeta(head, "property", "og:locale", openGraphLocale);
    upsertMeta(head, "property", "og:locale:alternate", alternateOpenGraphLocale);
    upsertMeta(head, "property", "og:image:alt", socialImageAlt);
    upsertMeta(head, "name", "twitter:title", title);
    upsertMeta(head, "name", "twitter:description", description);
    upsertMeta(head, "name", "twitter:image:alt", socialImageAlt);
  }

  if (kind.isAiNewsPage) {
    upsertMeta(head, "property", "og:image", aiNews.socialImageUrl);
    upsertMeta(head, "property", "og:image:width", "1200");
    upsertMeta(head, "property", "og:image:height", "630");
    upsertMeta(head, "property", "og:image:alt", aiNews.imageAlt);
    upsertMeta(head, "name", "twitter:image", aiNews.socialImageUrl);
    upsertMeta(head, "name", "twitter:image:alt", aiNews.imageAlt);
    addLink(head, {
      rel: "alternate",
      type: "application/rss+xml",
      title: aiNews.feedName,
      href: aiNews.aiNewsRssHref,
    });
  }

  if (kind.isAiNewsArticle) {
    upsertMeta(head, "property", "article:published_time", datePublished);
    upsertMeta(head, "property", "article:modified_time", dateModified || datePublished);
    upsertMeta(head, "property", "article:section", "AI News");
  }
}