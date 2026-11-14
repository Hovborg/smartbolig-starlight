import type { NewsLocale } from "./home-news";

export interface AiNewsCopy {
  feed: string;
  latest: string;
  rss: string;
  archive: string;
  noIssues: string;
  sources: string;
  sourcesText: string;
  issueCount: string;
  issueCountPlural: string;
  monitoredCount: string;
  primaryFeeds: string;
  read: string;
  source: string;
  sourcesPlural: string;
  topStories: string;
  openSource: string;
}

const da: AiNewsCopy = {
  feed: "Artikler",
  latest: "Seneste artikel",
  rss: "RSS-feed",
  archive: "Tidligere artikler",
  noIssues: "Ingen publicerede artikler endnu.",
  sources: "Officielle kilder",
  sourcesText:
    "Kilderne er valgt efter praktisk betydning: brede AI-produktnyheder først, derefter modeller, API'er, privacy, priser, sikkerhed og agent-workflows.",
  issueCount: "artikel",
  issueCountPlural: "artikler",
  monitoredCount: "officielle kilder overvåges",
  primaryFeeds: "Primære kilder",
  read: "Læs artiklen",
  source: "kilde",
  sourcesPlural: "kilder",
  topStories: "Historierne i artiklen",
  openSource: "Original kilde",
};

const en: AiNewsCopy = {
  feed: "Articles",
  latest: "Latest article",
  rss: "RSS feed",
  archive: "Earlier articles",
  noIssues: "No published articles yet.",
  sources: "Official sources",
  sourcesText:
    "Sources are selected by practical impact: broad AI product news first, then models, APIs, privacy, pricing, security, and agent workflows.",
  issueCount: "article",
  issueCountPlural: "articles",
  monitoredCount: "official sources monitored",
  primaryFeeds: "Primary sources",
  read: "Read the article",
  source: "source",
  sourcesPlural: "sources",
  topStories: "The stories in the article",
  openSource: "Original source",
};

export const aiNewsCopy: Record<NewsLocale, AiNewsCopy> = { da, en };
