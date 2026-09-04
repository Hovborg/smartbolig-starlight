import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { getSlug, getPubDate, isGuideDocument } from '../lib/rss-guides.mjs';

export async function GET(context) {
  // Get all docs from content collection
  const allDocs = await getCollection('docs');

  // Filter to only Danish guides, excluding indexes and non-guide sections.
  const guides = allDocs.filter(doc => isGuideDocument(doc, 'da'));

  const sortedGuides = guides
    .map((doc) => ({ doc, pubDate: getPubDate(doc) || undefined }))
    .sort((a, b) => (b.pubDate?.getTime() || 0) - (a.pubDate?.getTime() || 0));

  return rss({
    title: 'SmartBolig.net - Smart Home Guides',
    description: 'Danske guides til Home Assistant, ESP32, Zigbee og smart home automatisering',
    site: context.site || 'https://smartbolig.net',
    language: 'da',
    items: sortedGuides.map(({ doc, pubDate }) => {
      const slug = getSlug(doc);
      return {
        title: doc.data.title,
        description: doc.data.description || '',
        link: `/${slug}/`,
        pubDate,
      };
    }),
    customData: `<language>da</language>`,
  });
}
