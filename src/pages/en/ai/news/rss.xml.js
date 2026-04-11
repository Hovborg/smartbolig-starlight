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
      return slug.startsWith('en/ai/nyheder/') && !slug.endsWith('/index') && doc.data.title;
    })
    .sort((a, b) => getPubDate(b) - getPubDate(a));
  const latestPubDate = issues[0] ? getPubDate(issues[0]) : new Date();

  return rss({
    title: 'SmartBolig.net - AI News',
    description: 'Curated AI Radar for OpenAI, Claude Code, Gemini CLI, API pricing, and AI-agent workflows.',
    site: context.site || 'https://smartbolig.net',
    language: 'en',
    xmlns: {
      atom: 'http://www.w3.org/2005/Atom',
    },
    items: issues.map((doc) => {
      const slug = getSlug(doc);
      return {
        title: doc.data.title,
        description: doc.data.description || '',
        link: `/${slug.replace('en/ai/nyheder/', 'en/ai/news/')}/`,
        pubDate: getPubDate(doc),
        categories: ['AI News', 'OpenAI Codex', 'Claude Code', 'Gemini CLI'],
      };
    }),
    customData: [
      '<language>en</language>',
      `<lastBuildDate>${latestPubDate.toUTCString()}</lastBuildDate>`,
      '<atom:link href="https://smartbolig.net/en/ai/news/rss.xml" rel="self" type="application/rss+xml"/>',
    ].join(''),
  });
}
