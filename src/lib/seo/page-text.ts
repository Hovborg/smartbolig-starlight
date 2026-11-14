import type { Lang, PageEntry } from "./site";

/** Title and description, with fallbacks for the 404 page and unknown pages. */
export function getTitleAndDescription(entry: PageEntry, lang: Lang, isNotFoundPage: boolean) {
  const title =
    entry?.data?.title ||
    (isNotFoundPage
      ? lang === "da" ? "404 - Side ikke fundet" : "404 - Page not found"
      : "SmartBolig.net");
  const description =
    entry?.data?.description ||
    (isNotFoundPage
      ? lang === "da"
        ? "Siden blev ikke fundet. Find SmartBolig.net guides fra forsiden."
        : "Page not found. Find SmartBolig.net guides from the homepage."
      : "Dansk guide til smart home");
  return { title, description };
}

/**
 * The title for search results and social cards. A section page has a short
 * title for its heading, menus and breadcrumb ("Automationer") and a fuller
 * `seoTitle` that says what the reader finds there.
 */
export function getSearchTitle(entry: PageEntry, title: string): string {
  return entry?.data?.seoTitle || title;
}

export function getSocialImageAlt(lang: Lang) {
  return lang === "da"
    ? "SmartBolig.net — dansk guide til smart home med Home Assistant og ESP32"
    : "SmartBolig.net — smart home guides for Home Assistant and ESP32";
}

export function getRobotsContent(isNotFoundPage: boolean) {
  return isNotFoundPage
    ? "noindex, nofollow"
    : "max-image-preview:large, max-snippet:-1, max-video-preview:-1";
}