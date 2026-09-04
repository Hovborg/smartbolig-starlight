import { execFileSync } from 'node:child_process';

const EXCLUDED_SECTIONS = new Set(['juridisk', 'om-os', 'kontakt', 'produkter']);
export const getSlug = (doc) => doc.slug || doc.id;

export function isGuideDocument(doc, locale) {
  const slug = getSlug(doc);
  return slug.startsWith(`${locale}/`)
    && slug !== `${locale}/start`
    && !slug.endsWith('/index')
    // The current content loader removes /index from IDs; filePath preserves it.
    && !/(?:^|[\\/])index\.mdx?$/.test(doc.filePath || '')
    && !slug.split('/').some((segment) => EXCLUDED_SECTIONS.has(segment))
    && Boolean(doc.data.title);
}

function toValidDate(value) {
  if (!value || typeof value === 'boolean') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getPubDate(doc) {
  const date = toValidDate(doc.data.date) || toValidDate(doc.data.updated) || toValidDate(doc.data.lastUpdated);
  if (date) return date;
  try {
    const filePath = doc.filePath || `src/content/docs/${getSlug(doc)}.mdx`;
    const value = execFileSync('git', ['log', '-1', '--format=%cI', '--', filePath], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return toValidDate(value);
  } catch {
    // A checkout without Git history has no defensible fallback publication date.
    return null;
  }
}
