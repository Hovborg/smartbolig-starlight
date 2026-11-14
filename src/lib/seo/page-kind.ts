import { type Lang, siteUrl } from "./site";

/** Flags describing what kind of page a pathname is. Pure: depends only on the path. */
export function getPageKind(pathname: string) {
  const lang: Lang = pathname.startsWith("/en/") ? "en" : "da";
  const isAiNewsIndex = /^\/(?:da|en)\/ai\/nyheder\/?$/.test(pathname);
  return {
    lang,
    pageUrl: new URL(pathname, siteUrl).href,
    isNotFoundPage: /^\/(?:da\/|en\/)?404\/?$/.test(pathname),
    isAiNewsPage: /^\/(?:da|en)\/ai\/nyheder(?:\/|$)/.test(pathname),
    isAiNewsArticle: /^\/(?:da|en)\/ai\/nyheder\/\d{4}-\d{2}-\d{2}\/?$/.test(pathname),
    isAiNewsIndex,
    isHomePage: /^\/(?:da|en)\/?$/.test(pathname),
    isStartPage: /^\/(?:da|en)\/start\/?$/.test(pathname),
    isContactPage: /^\/(?:da|en)\/kontakt\/?$/.test(pathname),
    isAboutPage: /^\/(?:da|en)\/om-os\/?$/.test(pathname),
    isLegalPage: /^\/(?:da|en)\/(?:juridisk|kontakt|om-os)(?:\/|$)/.test(pathname),
    isSectionIndex:
      /^\/(?:da|en)\/(?:ai|automationer|esp32|home-assistant|juridisk|produkter|sikkerhed|vaerktoejer)\/?$/.test(pathname) ||
      /^\/(?:da|en)\/ai\/ai-cli\/?$/.test(pathname),
  };
}

export type PageKind = ReturnType<typeof getPageKind>;

export function getLocaleCodes(lang: Lang) {
  return {
    languageCode: lang === "da" ? "da-DK" : "en-US",
    openGraphLocale: lang === "da" ? "da_DK" : "en_US",
    alternateOpenGraphLocale: lang === "da" ? "en_US" : "da_DK",
  };
}

/** Whether the page gets TechArticle/NewsArticle structured data. */
export function shouldRenderArticleSchema(kind: PageKind, hasEntryData: boolean) {
  return Boolean(
    hasEntryData &&
      !kind.isHomePage &&
      !kind.isStartPage &&
      !kind.isSectionIndex &&
      !kind.isLegalPage &&
      !kind.isAiNewsIndex &&
      !kind.isNotFoundPage,
  );
}