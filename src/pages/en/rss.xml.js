import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { execFileSync } from 'node:child_process';

const FALLBACK_DATE = new Date('2025-12-25T00:00:00.000Z');
const EXCLUDED_SECTIONS = ['juridisk', 'om-os', 'kontakt', 'produkter'];

function getSlug(doc) {
  return doc.slug || doc.id;
}

function getGitLastModifiedDate(slug) {
  try {
    const filePath = `src/content/docs/${slug}.mdx`;
    const value = execFileSync('git', ['log', '-1', '--format=%cI', '--', filePath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    return value ? new Date(value) : FALLBACK_DATE;
  } catch {
    return FALLBACK_DATE;
  }
}

function getPubDate(doc) {
  const frontmatterDate = doc.data.date || doc.data.updated || doc.data.lastUpdated;
  return frontmatterDate ? new Date(frontmatterDate) : getGitLastModifiedDate(getSlug(doc));
}

export async function GET(context) {
  // Get all docs from content collection
  const allDocs = await getCollection('docs');

  // Filter to only English guides, excluding indexes and non-guide sections.
  const guides = allDocs.filter(doc => {
    const slug = getSlug(doc);
    return slug.startsWith('en/') &&
           !slug.endsWith('/index') &&
           !EXCLUDED_SECTIONS.some(section => slug.includes(`/${section}`)) &&
           doc.data.title;
  });

  const sortedGuides = guides
    .map((doc) => ({ doc, pubDate: getPubDate(doc) }))
    .sort((a, b) => b.pubDate - a.pubDate);

  return rss({
    title: 'SmartBolig.net - Smart Home Guides',
    description: 'Guides for Home Assistant, ESP32, Zigbee and smart home automation',
    site: context.site || 'https://smartbolig.net',
    language: 'en',
    items: sortedGuides.map(({ doc, pubDate }) => {
      const slug = getSlug(doc);
      return {
        title: doc.data.title,
        description: doc.data.description || '',
        link: `/${slug}/`,
        pubDate,
      };
    }),
    customData: `<language>en</language>`,
  });
}
