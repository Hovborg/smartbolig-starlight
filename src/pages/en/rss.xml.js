import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { getSlug, getPubDate, isGuideDocument } from '../../lib/rss-guides.mjs';

export async function GET(context) {
  // Get all docs from content collection
  const allDocs = await getCollection('docs');

  // Filter to only English guides, excluding indexes and non-guide sections.
  const guides = allDocs.filter(doc => isGuideDocument(doc, 'en'));

  const sortedGuides = guides
    .map((doc) => ({ doc, pubDate: getPubDate(doc) || undefined }))
    .sort((a, b) => (b.pubDate?.getTime() || 0) - (a.pubDate?.getTime() || 0));

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
