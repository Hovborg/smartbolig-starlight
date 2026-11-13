import { slug } from "github-slugger";
import { isLocaleNewsEntry, type NewsLocale } from "./home-news";
import { sourceLabel, sourceName } from "./ai-news-sources";

export type Signal = "high" | "medium" | "low";

export interface Headline {
  title: string;
  href: string;
  provider: string;
  sourceUrl: string;
  sourceName: string;
}

export interface NewsIssue {
  title: string;
  description: string;
  date: Date;
  dateString: string;
  href: string;
  signal: Signal;
  sources: string[];
  providers: string[];
  headlines: Headline[];
}

// The parts of a docs collection entry this module reads.
interface IssueDocument {
  id: string;
  slug?: string;
  body?: unknown;
  data: {
    title: string;
    description?: string;
    date?: Date | string;
    lastUpdated?: Date | string | boolean;
    news?: { signal?: string; sources?: unknown };
  };
}

const getSlug = (doc: IssueDocument) => doc.slug || doc.id;
const getDate = (doc: IssueDocument) => {
  const value = doc.data.date || doc.data.lastUpdated || new Date();
  return value instanceof Date ? value : new Date(value as string);
};

export const formatDate = (date: Date, locale: NewsLocale) =>
  new Intl.DateTimeFormat(locale === "da" ? "da-DK" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);

// AI News headings contain fixed word breaks and escaped feed characters.
// Astro displays this as text, while its Markdown heading IDs use github-slugger.
const namedHeadlineEntities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'" };
const decodeHeadline = (value: string) =>
  value
    .replace(/<wbr\s*\/?>/gi, "")
    .replace(/&#(?:x([0-9a-f]+)|([0-9]+));/gi, (entity, hex, decimal) => {
      const codePoint = Number.parseInt(hex || decimal, hex ? 16 : 10);
      return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity;
    })
    .replace(/&(amp|lt|gt|quot|apos);/gi, (entity, name) => namedHeadlineEntities[name.toLowerCase()] || entity);

const extractHeadlines = (body: unknown, issueHref: string, sources: string[]): Headline[] => {
  if (typeof body !== "string") return [];
  return [...body.matchAll(/^###\s+(.+)$/gm)]
    .map((match, index) => {
      const heading = decodeHeadline(match[1]?.trim() || "");
      const title = heading.replace(/^\d+\.\s+/, "");
      const rawSourceUrl = sources[index] || "";
      // Only http(s) URLs may reach href=: frontmatter can be hand-edited.
      const sourceUrl = /^https?:\/\//i.test(rawSourceUrl) ? rawSourceUrl : "";
      return {
        title,
        href: `${issueHref}#${slug(heading)}`,
        provider: sourceUrl ? sourceLabel(sourceUrl) : "AI",
        sourceUrl,
        sourceName: sourceUrl ? sourceName(sourceUrl) : "",
      };
    })
    .filter((headline) => headline.title && headline.href)
    .slice(0, 6);
};

const signalPriority: Record<Signal, number> = { high: 3, medium: 2, low: 1 };

/** Every published article for the locale, newest first (ties: higher signal first). */
export function selectIssues(docs: readonly IssueDocument[], locale: NewsLocale): NewsIssue[] {
  return docs
    .filter((doc) => isLocaleNewsEntry(doc, locale))
    .map((doc) => {
      const date = getDate(doc);
      const signal = (doc.data.news?.signal || "medium") as Signal;
      const sources = Array.isArray(doc.data.news?.sources)
        ? doc.data.news.sources.filter((source): source is string => typeof source === "string")
        : [];
      const providers = [...new Set(sources.map(sourceLabel))].sort();
      const href = `/${getSlug(doc)}/`;
      return {
        title: doc.data.title,
        description: doc.data.description || "",
        date,
        dateString: date.toISOString().slice(0, 10),
        href,
        signal,
        sources,
        providers,
        headlines: extractHeadlines(doc.body, href, sources),
      };
    })
    .sort((a, b) => {
      const dateCompare = b.date.getTime() - a.date.getTime();
      if (dateCompare !== 0) return dateCompare;
      return signalPriority[b.signal] - signalPriority[a.signal];
    });
}
