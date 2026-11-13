import { getCollection } from "astro:content";

export interface PageIndexEntry {
  /** Page path, e.g. "/da/home-assistant/zigbee2mqtt/". */
  p: string;
  /** Page title. */
  t: string;
}

// Dated AI-news archive entries are excluded: there are over a hundred of them
// and "did you mean 2026-03-11?" is never a useful answer.
const datedAiNews = /(^|\/)ai\/nyheder\/\d{4}-\d{2}-\d{2}$/;

/**
 * Build-time index of every real page. The 404 page ships it to the browser,
 * which suggests the closest match to the broken URL.
 */
export async function buildPageIndex(): Promise<PageIndexEntry[]> {
  return (await getCollection("docs"))
    .map((entry) => {
      // docsLoader ids are extension-less slugs ("da/home-assistant/zigbee2mqtt").
      // Index files may arrive either as "da/home-assistant" or ".../index".
      const slug = entry.id.replace(/\/index$/, "");
      return { slug, title: entry.data.title };
    })
    .filter(({ slug, title }) => slug && title && !datedAiNews.test(slug))
    .map(({ slug, title }) => ({ p: `/${slug}/`, t: title }))
    .sort((a, b) => a.p.localeCompare(b.p));
}
