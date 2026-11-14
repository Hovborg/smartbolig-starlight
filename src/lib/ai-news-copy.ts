import type { NewsLocale } from "./home-news";

export interface AiNewsCopy {
  eyebrow: string;
  title: string;
  intro: string;
  latest: string;
  openLatest: string;
  rss: string;
  archive: string;
  noIssues: string;
  sources: string;
  sourcesText: string;
  issueCount: string;
  issueCountPlural: string;
  sourceCount: string;
  monitoredCount: string;
  primaryFeeds: string;
  read: string;
  source: string;
  sourcesPlural: string;
  topStories: string;
  storyIntro: string;
  openStory: string;
  openSource: string;
}

const da: AiNewsCopy = {
  eyebrow: "SmartBolig.net",
  title: "AI-nyheder der er værd at læse",
  intro:
    "Korte artikler om de AI-ændringer, der faktisk betyder noget for værktøjer, modeller, priser, sikkerhed og agent-workflows.",
  latest: "Seneste artikel",
  openLatest: "Læs seneste artikel",
  rss: "RSS-feed",
  archive: "Alle artikler",
  noIssues: "Ingen publicerede artikler endnu.",
  sources: "Officielle kilder",
  sourcesText:
    "Kilderne er valgt efter praktisk betydning: brede AI-produktnyheder først, derefter modeller, API'er, privacy, priser, sikkerhed og agent-workflows.",
  issueCount: "artikel",
  issueCountPlural: "artikler",
  sourceCount: "kilder i seneste artikel",
  monitoredCount: "officielle kilder overvåges",
  primaryFeeds: "Primære kilder",
  read: "Læs artikel",
  source: "kilde",
  sourcesPlural: "kilder",
  topStories: "Vigtigste historier",
  storyIntro: "Direkte genveje til de mest relevante afsnit i seneste artikel.",
  openStory: "Læs historien",
  openSource: "Original kilde",
};

const en: AiNewsCopy = {
  eyebrow: "SmartBolig.net",
  title: "AI news worth reading",
  intro:
    "Short articles about AI changes that actually matter for tools, models, pricing, security, and agent workflows.",
  latest: "Latest article",
  openLatest: "Read latest article",
  rss: "RSS feed",
  archive: "All articles",
  noIssues: "No published articles yet.",
  sources: "Official sources",
  sourcesText:
    "Sources are selected by practical impact: broad AI product news first, then models, APIs, privacy, pricing, security, and agent workflows.",
  issueCount: "article",
  issueCountPlural: "articles",
  sourceCount: "sources in latest article",
  monitoredCount: "official sources monitored",
  primaryFeeds: "Primary sources",
  read: "Read article",
  source: "source",
  sourcesPlural: "sources",
  topStories: "Important stories",
  storyIntro: "Direct shortcuts to the most relevant sections in the latest article.",
  openStory: "Read the story",
  openSource: "Original source",
};

export const aiNewsCopy: Record<NewsLocale, AiNewsCopy> = { da, en };
