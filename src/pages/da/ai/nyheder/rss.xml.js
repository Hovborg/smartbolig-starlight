import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

function getSlug(doc) {
  return doc.slug || doc.id;
}

function getPubDate(doc) {
  return doc.data.date || doc.data.lastUpdated || new Date();
}

export async function GET(context) {
  const docs = await getCollection('docs');
  const issues = docs
    .filter((doc) => {
      const slug = getSlug(doc);
      return slug.startsWith('da/ai/nyheder/') && !slug.endsWith('/index') && doc.data.title;
    })
    .sort((a, b) => getPubDate(b) - getPubDate(a));

  return rss({
    title: 'SmartBolig.net - AI-nyheder',
    description: 'Kurateret AI Radar om OpenAI, Claude Code, Gemini CLI, API-priser og AI-agent workflows.',
    site: context.site || 'https://smartbolig.net',
    language: 'da',
    items: issues.map((doc) => {
      const slug = getSlug(doc);
      return {
        title: doc.data.title,
        description: doc.data.description || '',
        link: `/${slug}/`,
        pubDate: getPubDate(doc),
      };
    }),
    customData: '<language>da</language>',
  });
}
