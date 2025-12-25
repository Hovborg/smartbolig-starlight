import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  // Get all docs from content collection
  const allDocs = await getCollection('docs');
  
  // Filter to only English guides (not index pages, not legal pages)
  const guides = allDocs.filter(doc => {
    const slug = doc.slug || doc.id;
    return slug.startsWith('en/') && 
           !slug.endsWith('/index') &&
           !slug.includes('legal') &&
           !slug.includes('about') &&
           !slug.includes('products') &&
           doc.data.title;
  });

  // Sort by title alphabetically
  const sortedGuides = guides.sort((a, b) => 
    a.data.title.localeCompare(b.data.title, 'en')
  );

  return rss({
    title: 'SmartBolig.net - Smart Home Guides',
    description: 'Guides for Home Assistant, ESP32, Zigbee and smart home automation',
    site: context.site || 'https://smartbolig.net',
    language: 'en',
    items: sortedGuides.map((doc) => {
      const slug = doc.slug || doc.id;
      return {
        title: doc.data.title,
        description: doc.data.description || '',
        link: `/${slug}/`,
        pubDate: new Date('2024-12-25'),
      };
    }),
    customData: `<language>en</language>`,
  });
}
