#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(rootDir, 'dist');
const docsDir = path.join(rootDir, 'src/content/docs');
const daNewsDir = path.join(docsDir, 'da/ai/nyheder');
const enNewsDir = path.join(docsDir, 'en/ai/nyheder');
const aiNewsImages = [
  'public/images/ai-news-og.png',
  'public/images/ai-news-og-16x9.png',
  'public/images/ai-news-og-4x3.png',
  'public/images/ai-news-og-1x1.png',
];

function fail(issues, filePath, message) {
  issues.push(`${path.relative(rootDir, filePath)}: ${message}`);
}

async function listDailyArticles(dir) {
  if (!existsSync(dir)) return [];
  const names = await readdir(dir);
  return names.filter((name) => /^\d{4}-\d{2}-\d{2}\.mdx$/.test(name)).sort();
}

function requireText(issues, filePath, html, needle, label) {
  if (!html.includes(needle)) fail(issues, filePath, `missing ${label}`);
}

function rejectText(issues, filePath, html, needle, label) {
  if (html.includes(needle)) fail(issues, filePath, `must not include ${label}`);
}

async function validatePage(issues, filePath, checks) {
  if (!existsSync(filePath)) {
    fail(issues, filePath, 'missing generated HTML');
    return;
  }

  const html = await readFile(filePath, 'utf8');
  for (const check of checks.required) requireText(issues, filePath, html, check.needle, check.label);
  for (const check of checks.forbidden ?? []) rejectText(issues, filePath, html, check.needle, check.label);
}

async function main() {
  const issues = [];
  const daArticles = await listDailyArticles(daNewsDir);
  const enArticles = await listDailyArticles(enNewsDir);
  const latest = daArticles.at(-1)?.replace(/\.mdx$/, '');

  if (!existsSync(distDir)) {
    fail(issues, distDir, 'missing dist; run npm run build before seo:validate');
  }

  for (const imagePath of aiNewsImages) {
    if (!existsSync(path.join(rootDir, imagePath))) fail(issues, path.join(rootDir, imagePath), 'missing AI News SEO image');
  }

  if (!latest || !enArticles.includes(`${latest}.mdx`)) {
    fail(issues, daNewsDir, 'missing mirrored AI News daily issue');
  } else {
    await validatePage(issues, path.join(distDir, 'da/ai/nyheder', latest, 'index.html'), {
      required: [
        { needle: `<link rel="canonical" href="https://smartbolig.net/da/ai/nyheder/${latest}/"`, label: 'canonical URL' },
        { needle: '<meta property="og:type" content="article"', label: 'article Open Graph type' },
        { needle: '<meta property="og:image" content="https://smartbolig.net/images/ai-news-og.png"', label: 'AI News Open Graph image' },
        { needle: `<meta property="article:published_time" content="${latest}T00:00:00.000Z"`, label: 'article published time' },
        { needle: `<time datetime="${latest}">`, label: 'visible publication date' },
        { needle: '<link rel="alternate" hreflang="x-default" href="https://smartbolig.net/da/ai/nyheder/', label: 'x-default hreflang' },
        { needle: '<link rel="alternate" type="application/rss+xml" title="SmartBolig.net AI-nyheder" href="https://smartbolig.net/da/ai/nyheder/rss.xml"', label: 'AI News RSS autodiscovery' },
        { needle: '"@type":"NewsArticle"', label: 'NewsArticle JSON-LD' },
        { needle: `"datePublished":"${latest}T00:00:00.000Z"`, label: 'JSON-LD datePublished' },
        { needle: '"url":"https://smartbolig.net/images/ai-news-og-16x9.png"', label: 'AI News 16:9 structured-data image' },
        { needle: '"citation":[', label: 'source citations in JSON-LD' },
      ],
      forbidden: [{ needle: 'noindex', label: 'noindex robots directive' }],
    });

    await validatePage(issues, path.join(distDir, 'en/ai/nyheder', latest, 'index.html'), {
      required: [
        { needle: `<link rel="canonical" href="https://smartbolig.net/en/ai/nyheder/${latest}/"`, label: 'canonical URL' },
        { needle: '<meta property="og:type" content="article"', label: 'article Open Graph type' },
        { needle: '<meta property="og:image" content="https://smartbolig.net/images/ai-news-og.png"', label: 'AI News Open Graph image' },
        { needle: `<meta property="article:published_time" content="${latest}T00:00:00.000Z"`, label: 'article published time' },
        { needle: `<time datetime="${latest}">`, label: 'visible publication date' },
        { needle: '<link rel="alternate" hreflang="x-default" href="https://smartbolig.net/da/ai/nyheder/', label: 'x-default hreflang' },
        { needle: '<link rel="alternate" type="application/rss+xml" title="SmartBolig.net AI News" href="https://smartbolig.net/en/ai/news/rss.xml"', label: 'AI News RSS autodiscovery' },
        { needle: '"@type":"NewsArticle"', label: 'NewsArticle JSON-LD' },
        { needle: `"datePublished":"${latest}T00:00:00.000Z"`, label: 'JSON-LD datePublished' },
        { needle: '"url":"https://smartbolig.net/images/ai-news-og-16x9.png"', label: 'AI News 16:9 structured-data image' },
        { needle: '"citation":[', label: 'source citations in JSON-LD' },
      ],
      forbidden: [{ needle: 'noindex', label: 'noindex robots directive' }],
    });
  }

  await validatePage(issues, path.join(distDir, 'da/ai/nyheder/index.html'), {
    required: [
      { needle: '<link rel="canonical" href="https://smartbolig.net/da/ai/nyheder/"', label: 'canonical URL' },
      { needle: '<meta property="og:image" content="https://smartbolig.net/images/ai-news-og.png"', label: 'AI News Open Graph image' },
      { needle: '<link rel="alternate" hreflang="x-default" href="https://smartbolig.net/da/ai/nyheder/"', label: 'x-default hreflang' },
      { needle: '<link rel="alternate" type="application/rss+xml" title="SmartBolig.net AI-nyheder" href="https://smartbolig.net/da/ai/nyheder/rss.xml"', label: 'AI News RSS autodiscovery' },
      { needle: '"@type":"CollectionPage"', label: 'CollectionPage JSON-LD' },
      { needle: '"@type":"DataFeed"', label: 'DataFeed JSON-LD' },
    ],
    forbidden: [{ needle: 'noindex', label: 'noindex robots directive' }],
  });

  await validatePage(issues, path.join(distDir, 'en/ai/nyheder/index.html'), {
    required: [
      { needle: '<link rel="canonical" href="https://smartbolig.net/en/ai/nyheder/"', label: 'canonical URL' },
      { needle: '<meta property="og:image" content="https://smartbolig.net/images/ai-news-og.png"', label: 'AI News Open Graph image' },
      { needle: '<link rel="alternate" hreflang="x-default" href="https://smartbolig.net/da/ai/nyheder/"', label: 'x-default hreflang' },
      { needle: '<link rel="alternate" type="application/rss+xml" title="SmartBolig.net AI News" href="https://smartbolig.net/en/ai/news/rss.xml"', label: 'AI News RSS autodiscovery' },
      { needle: '"@type":"CollectionPage"', label: 'CollectionPage JSON-LD' },
      { needle: '"@type":"DataFeed"', label: 'DataFeed JSON-LD' },
    ],
    forbidden: [{ needle: 'noindex', label: 'noindex robots directive' }],
  });

  const sitemapPath = path.join(distDir, 'sitemap-0.xml');
  if (latest && existsSync(sitemapPath)) {
    const sitemap = await readFile(sitemapPath, 'utf8');
    requireText(issues, sitemapPath, sitemap, `https://smartbolig.net/da/ai/nyheder/${latest}/`, 'Danish AI News article in sitemap');
    requireText(issues, sitemapPath, sitemap, `https://smartbolig.net/en/ai/nyheder/${latest}/`, 'English AI News article in sitemap');
  } else if (!existsSync(sitemapPath)) {
    fail(issues, sitemapPath, 'missing sitemap');
  }

  await validatePage(issues, path.join(distDir, 'da/ai/nyheder/rss.xml'), {
    required: [
      { needle: '<atom:link href="https://smartbolig.net/da/ai/nyheder/rss.xml" rel="self" type="application/rss+xml"/>', label: 'Danish AI News RSS self link' },
      { needle: '<category>AI News</category>', label: 'AI News RSS category' },
    ],
  });

  await validatePage(issues, path.join(distDir, 'en/ai/news/rss.xml'), {
    required: [
      { needle: '<atom:link href="https://smartbolig.net/en/ai/news/rss.xml" rel="self" type="application/rss+xml"/>', label: 'English AI News RSS self link' },
      { needle: '<category>AI News</category>', label: 'AI News RSS category' },
    ],
  });

  if (issues.length > 0) {
    console.error('SEO validation failed:');
    for (const issue of issues) console.error(`- ${issue}`);
    process.exit(1);
  }

  console.log(`SEO validation passed for AI News${latest ? ` (${latest})` : ''}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
