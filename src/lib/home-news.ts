export type NewsLocale = "da" | "en";

/** True for a titled article under `<locale>/ai/nyheder/` (not the index page). */
export function isLocaleNewsEntry(
  entry: { id: string; slug?: string; data: { title?: string } },
  locale: NewsLocale,
): boolean {
  const slug = entry.slug || entry.id;
  return slug.startsWith(`${locale}/ai/nyheder/`) && !slug.endsWith("/index") && Boolean(entry.data.title);
}
