import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

function getSlug(doc) {
  return doc.slug || doc.id;
}

function getPubDate(doc) {
  return doc.data.date || doc.data.lastUpdated || new Date();
}

function sourceLabel(url) {
  if (url.includes('openai/codex')) return 'OpenAI Codex';
  if (url.includes('anthropics/claude-code') || url.includes('code.claude.com')) return 'Claude Code';
  if (url.includes('google-gemini/gemini-cli')) return 'Gemini CLI';
  if (url.includes('openclaw/openclaw')) return 'OpenClaw';
  if (url.includes('ai.google.dev') || url.includes('blog.google')) return 'Google AI';
  if (url.includes('openai.com') || url.includes('platform.openai.com')) return 'OpenAI';
  if (url.includes('anthropic.com')) return 'Anthropic';
  return 'AI';
}

function getCategories(doc) {
  const categories = new Set(['AI News']);
  for (const source of doc.data.news?.sources || []) {
    categories.add(sourceLabel(source));
  }
  categories.add(`${doc.data.news?.signal || 'medium'} signal`);
  return [...categories];
}

function getDescription(doc) {
  const sourceCount = doc.data.news?.sources?.length || 0;
  const signal = doc.data.news?.signal || 'medium';
  const suffix = `Signal: ${signal}. Official sources: ${sourceCount}.`;
  return [doc.data.description, suffix].filter(Boolean).join(' ');
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
    description: 'Curated AI articles for OpenAI, Claude Code, Gemini CLI, API pricing, and AI-agent workflows.',
    site: context.site || 'https://smartbolig.net',
    language: 'en',
    xmlns: {
      atom: 'http://www.w3.org/2005/Atom',
    },
    items: issues.map((doc) => {
      const slug = getSlug(doc);
      return {
        title: doc.data.title,
        description: getDescription(doc),
        link: `/${slug}/`,
        pubDate: getPubDate(doc),
        categories: getCategories(doc),
      };
    }),
    customData: [
      '<language>en</language>',
      '<ttl>60</ttl>',
      `<lastBuildDate>${latestPubDate.toUTCString()}</lastBuildDate>`,
      '<image><url>https://smartbolig.net/images/ai-news-og.png</url><title>SmartBolig.net - AI News</title><link>https://smartbolig.net/en/ai/nyheder/</link></image>',
      '<atom:link href="https://smartbolig.net/en/ai/news/rss.xml" rel="self" type="application/rss+xml"/>',
    ].join(''),
  });
}
