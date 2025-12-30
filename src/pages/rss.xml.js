import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  // Get all docs from content collection
  const allDocs = await getCollection('docs');
  
  // Filter to only Danish guides (not index pages, not legal pages)
  const guides = allDocs.filter(doc => {
    const slug = doc.slug || doc.id;
    return slug.startsWith('da/') && 
           !slug.endsWith('/index') &&
           !slug.includes('juridisk') &&
           !slug.includes('om-os') &&
           doc.data.title;
  });

  // Sort by title alphabetically
  const sortedGuides = guides.sort((a, b) => 
    a.data.title.localeCompare(b.data.title, 'da')
  );

  return rss({
    title: 'SmartBolig.net - Smart Home Guides',
    description: 'Danske guides til Home Assistant, ESP32, Zigbee og smart home automatisering',
    site: context.site || 'https://smartbolig.net',
    language: 'da',
    items: sortedGuides.map((doc) => {
      const slug = doc.slug || doc.id;
      return {
        title: doc.data.title,
        description: doc.data.description || '',
        link: `/${slug}/`,
        pubDate: doc.data.date ? new Date(doc.data.date) : new Date(), // Use frontmatter date or build date
      };
    }),
    customData: `<language>da</language>`,
  });
}
