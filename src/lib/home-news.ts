export type NewsLocale = "da" | "en";

export interface NewsDocument {
  id: string;
  slug?: string;
  data: {
    title?: string;
    description?: string;
    date?: Date | string;
    lastUpdated?: Date | string | boolean;
  };
}

export interface HomeNewsItem {
  title: string;
  description: string;
  href: string;
  date: Date;
  dateString: string;
}

export function selectLatestNews(
  entries: readonly NewsDocument[],
  locale: NewsLocale,
  limit = 3,
): HomeNewsItem[] {
  return entries
    .filter((entry) => {
      const slug = entry.slug || entry.id;
      return slug.startsWith(`${locale}/ai/nyheder/`) && !slug.endsWith("/index") && entry.data.title;
    })
    .map((entry) => {
      const slug = entry.slug || entry.id;
      const rawDate = entry.data.date || entry.data.lastUpdated;
      const date = rawDate && typeof rawDate !== "boolean" ? new Date(rawDate) : new Date(Number.NaN);
      return {
        title: entry.data.title || "",
        description: entry.data.description || "",
        href: `/${slug}/`,
        date,
        dateString: Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10),
      };
    })
    .filter((entry) => entry.dateString)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, limit);
}
