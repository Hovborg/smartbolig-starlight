import type { PageEntry } from "./site";

export const toIsoDate = (...values: unknown[]) => {
  for (const value of values) {
    if (!value || typeof value === "boolean") continue;
    const date = new Date(value as string | number | Date);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return null;
};

/**
 * Prefer a real date; never fabricate one. datePublished falls back to the
 * git-derived modified date, and is undefined when nothing is known
 * (JSON.stringify drops undefined values).
 */
export function getPageDates(entry: PageEntry, lastUpdated: unknown) {
  const dateModified = toIsoDate(entry?.data?.updated, entry?.data?.lastUpdated, lastUpdated, entry?.data?.date);
  const datePublished =
    toIsoDate(entry?.data?.date, entry?.data?.lastUpdated, lastUpdated) || dateModified || undefined;
  return { dateModified, datePublished };
}