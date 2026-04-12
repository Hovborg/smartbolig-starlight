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

  await validatePage(issues, path.join(distDir, 'da/index.html'), {
    required: [
      { needle: '<link rel="canonical" href="https://smartbolig.net/da/"', label: 'Danish home canonical URL' },
      { needle: '<link rel="alternate" hreflang="da" href="https://smartbolig.net/da/"', label: 'Danish home hreflang self' },
      { needle: '<link rel="alternate" hreflang="en" href="https://smartbolig.net/en/"', label: 'Danish home hreflang English' },
      { needle: '<link rel="alternate" hreflang="x-default" href="https://smartbolig.net/da/"', label: 'Danish home x-default hreflang' },
      { needle: '<meta property="og:locale" content="da_DK"', label: 'Danish Open Graph locale' },
      { needle: '<meta property="og:locale:alternate" content="en_US"', label: 'Danish alternate Open Graph locale' },
      { needle: '<meta name="twitter:title"', label: 'Danish home Twitter title' },
      { needle: '<meta name="twitter:description"', label: 'Danish home Twitter description' },
      { needle: '"@type":"WebPage"', label: 'Danish home WebPage JSON-LD' },
      { needle: '"url":"https://smartbolig.net/brand/logo/logo-dark-1200x270.png","width":1200,"height":270', label: 'Organization logo JSON-LD' },
      { needle: '"name":"Forside"', label: 'Danish breadcrumb home label' },
    ],
    forbidden: [
      { needle: 'noindex', label: 'noindex robots directive' },
      { needle: '"@type":"TechArticle"', label: 'TechArticle JSON-LD on home page' },
      { needle: 'https://smartbolig.net/da/#article', label: 'home page article schema' },
      { needle: '"name":"Da"', label: 'raw locale breadcrumb label' },
    ],
  });

  await validatePage(issues, path.join(distDir, 'en/index.html'), {
    required: [
      { needle: '<link rel="canonical" href="https://smartbolig.net/en/"', label: 'English home canonical URL' },
      { needle: '<link rel="alternate" hreflang="da" href="https://smartbolig.net/da/"', label: 'English home hreflang Danish' },
      { needle: '<link rel="alternate" hreflang="en" href="https://smartbolig.net/en/"', label: 'English home hreflang self' },
      { needle: '<link rel="alternate" hreflang="x-default" href="https://smartbolig.net/da/"', label: 'English home x-default hreflang' },
      { needle: '<meta property="og:locale" content="en_US"', label: 'English Open Graph locale' },
      { needle: '<meta property="og:locale:alternate" content="da_DK"', label: 'English alternate Open Graph locale' },
      { needle: '<meta name="twitter:title"', label: 'English home Twitter title' },
      { needle: '<meta name="twitter:description"', label: 'English home Twitter description' },
      { needle: '"@type":"WebPage"', label: 'English home WebPage JSON-LD' },
      { needle: '"url":"https://smartbolig.net/brand/logo/logo-dark-1200x270.png","width":1200,"height":270', label: 'Organization logo JSON-LD' },
      { needle: '"name":"Home"', label: 'English breadcrumb home label' },
    ],
    forbidden: [
      { needle: 'noindex', label: 'noindex robots directive' },
      { needle: '"@type":"TechArticle"', label: 'TechArticle JSON-LD on home page' },
      { needle: 'https://smartbolig.net/en/#article', label: 'home page article schema' },
      { needle: '"name":"En"', label: 'raw locale breadcrumb label' },
    ],
  });

  for (const imagePath of aiNewsImages) {
    if (!existsSync(path.join(rootDir, imagePath))) fail(issues, path.join(rootDir, imagePath), 'missing AI News SEO image');
  }

  if (!latest || !enArticles.includes(`${latest}.mdx`)) {
    fail(issues, daNewsDir, 'missing mirrored AI News daily issue');
  } else {
    await validatePage(issues, path.join(distDir, 'da/ai/nyheder', latest, 'index.html'), {
      required: [
        { needle: `<link rel="canonical" href="https://smartbolig.net/da/ai/nyheder/${latest}/"`, label: 'canonical URL' },
        { needle: `<link rel="alternate" hreflang="da" href="https://smartbolig.net/da/ai/nyheder/${latest}/"`, label: 'Danish hreflang self' },
        { needle: `<link rel="alternate" hreflang="en" href="https://smartbolig.net/en/ai/nyheder/${latest}/"`, label: 'Danish hreflang English' },
        { needle: '<meta property="og:locale" content="da_DK"', label: 'Danish Open Graph locale' },
        { needle: '<meta property="og:locale:alternate" content="en_US"', label: 'Danish alternate Open Graph locale' },
        { needle: '<meta property="og:type" content="article"', label: 'article Open Graph type' },
        { needle: '<meta property="og:image" content="https://smartbolig.net/images/ai-news-og.png"', label: 'AI News Open Graph image' },
        { needle: '<meta name="twitter:title"', label: 'Twitter title' },
        { needle: '<meta name="twitter:description"', label: 'Twitter description' },
        { needle: `<meta property="article:published_time" content="${latest}T00:00:00.000Z"`, label: 'article published time' },
        { needle: `<time datetime="${latest}">`, label: 'visible publication date' },
        { needle: '<link rel="alternate" hreflang="x-default" href="https://smartbolig.net/da/ai/nyheder/', label: 'x-default hreflang' },
        { needle: '<link rel="alternate" type="application/rss+xml" title="SmartBolig.net AI-nyheder" href="https://smartbolig.net/da/ai/nyheder/rss.xml"', label: 'AI News RSS autodiscovery' },
        { needle: '"@type":"WebPage"', label: 'WebPage JSON-LD' },
        { needle: '"@type":"NewsArticle"', label: 'NewsArticle JSON-LD' },
        { needle: `"mainEntityOfPage":{"@id":"https://smartbolig.net/da/ai/nyheder/${latest}/#webpage"`, label: 'article WebPage reference' },
        { needle: `"datePublished":"${latest}T00:00:00.000Z"`, label: 'JSON-LD datePublished' },
        { needle: '"url":"https://smartbolig.net/images/ai-news-og-16x9.png"', label: 'AI News 16:9 structured-data image' },
        { needle: '"citation":[', label: 'source citations in JSON-LD' },
        { needle: '"name":"Forside"', label: 'Danish breadcrumb home label' },
        { needle: '"name":"AI-nyheder"', label: 'Danish breadcrumb AI News label' },
      ],
      forbidden: [
        { needle: 'noindex', label: 'noindex robots directive' },
        { needle: '"name":"Da"', label: 'raw locale breadcrumb label' },
      ],
    });

    await validatePage(issues, path.join(distDir, 'en/ai/nyheder', latest, 'index.html'), {
      required: [
        { needle: `<link rel="canonical" href="https://smartbolig.net/en/ai/nyheder/${latest}/"`, label: 'canonical URL' },
        { needle: `<link rel="alternate" hreflang="da" href="https://smartbolig.net/da/ai/nyheder/${latest}/"`, label: 'English hreflang Danish' },
        { needle: `<link rel="alternate" hreflang="en" href="https://smartbolig.net/en/ai/nyheder/${latest}/"`, label: 'English hreflang self' },
        { needle: '<meta property="og:locale" content="en_US"', label: 'English Open Graph locale' },
        { needle: '<meta property="og:locale:alternate" content="da_DK"', label: 'English alternate Open Graph locale' },
        { needle: '<meta property="og:type" content="article"', label: 'article Open Graph type' },
        { needle: '<meta property="og:image" content="https://smartbolig.net/images/ai-news-og.png"', label: 'AI News Open Graph image' },
        { needle: '<meta name="twitter:title"', label: 'Twitter title' },
        { needle: '<meta name="twitter:description"', label: 'Twitter description' },
        { needle: `<meta property="article:published_time" content="${latest}T00:00:00.000Z"`, label: 'article published time' },
        { needle: `<time datetime="${latest}">`, label: 'visible publication date' },
        { needle: '<link rel="alternate" hreflang="x-default" href="https://smartbolig.net/da/ai/nyheder/', label: 'x-default hreflang' },
        { needle: '<link rel="alternate" type="application/rss+xml" title="SmartBolig.net AI News" href="https://smartbolig.net/en/ai/news/rss.xml"', label: 'AI News RSS autodiscovery' },
        { needle: '"@type":"WebPage"', label: 'WebPage JSON-LD' },
        { needle: '"@type":"NewsArticle"', label: 'NewsArticle JSON-LD' },
        { needle: `"mainEntityOfPage":{"@id":"https://smartbolig.net/en/ai/nyheder/${latest}/#webpage"`, label: 'article WebPage reference' },
        { needle: `"datePublished":"${latest}T00:00:00.000Z"`, label: 'JSON-LD datePublished' },
        { needle: '"url":"https://smartbolig.net/images/ai-news-og-16x9.png"', label: 'AI News 16:9 structured-data image' },
        { needle: '"citation":[', label: 'source citations in JSON-LD' },
        { needle: '"name":"Home"', label: 'English breadcrumb home label' },
        { needle: '"name":"AI News"', label: 'English breadcrumb AI News label' },
      ],
      forbidden: [
        { needle: 'noindex', label: 'noindex robots directive' },
        { needle: '"name":"En"', label: 'raw locale breadcrumb label' },
      ],
    });
  }

  await validatePage(issues, path.join(distDir, 'da/ai/nyheder/index.html'), {
    required: [
      { needle: '<link rel="canonical" href="https://smartbolig.net/da/ai/nyheder/"', label: 'canonical URL' },
      { needle: '<link rel="alternate" hreflang="da" href="https://smartbolig.net/da/ai/nyheder/"', label: 'Danish AI News hreflang self' },
      { needle: '<link rel="alternate" hreflang="en" href="https://smartbolig.net/en/ai/nyheder/"', label: 'Danish AI News hreflang English' },
      { needle: '<meta property="og:locale" content="da_DK"', label: 'Danish Open Graph locale' },
      { needle: '<meta property="og:image" content="https://smartbolig.net/images/ai-news-og.png"', label: 'AI News Open Graph image' },
      { needle: '<meta name="twitter:title"', label: 'Twitter title' },
      { needle: '<meta name="twitter:description"', label: 'Twitter description' },
      { needle: '<link rel="alternate" hreflang="x-default" href="https://smartbolig.net/da/ai/nyheder/"', label: 'x-default hreflang' },
      { needle: '<link rel="alternate" type="application/rss+xml" title="SmartBolig.net AI-nyheder" href="https://smartbolig.net/da/ai/nyheder/rss.xml"', label: 'AI News RSS autodiscovery' },
      { needle: '"@type":"CollectionPage"', label: 'CollectionPage JSON-LD' },
      { needle: '"@type":"DataFeed"', label: 'DataFeed JSON-LD' },
      { needle: '"name":"Forside"', label: 'Danish breadcrumb home label' },
      { needle: '"name":"AI-nyheder"', label: 'Danish breadcrumb AI News label' },
    ],
    forbidden: [
      { needle: 'noindex', label: 'noindex robots directive' },
      { needle: '"@type":"TechArticle"', label: 'TechArticle JSON-LD on collection page' },
      { needle: '"name":"Da"', label: 'raw locale breadcrumb label' },
    ],
  });

  await validatePage(issues, path.join(distDir, 'en/ai/nyheder/index.html'), {
    required: [
      { needle: '<link rel="canonical" href="https://smartbolig.net/en/ai/nyheder/"', label: 'canonical URL' },
      { needle: '<link rel="alternate" hreflang="da" href="https://smartbolig.net/da/ai/nyheder/"', label: 'English AI News hreflang Danish' },
      { needle: '<link rel="alternate" hreflang="en" href="https://smartbolig.net/en/ai/nyheder/"', label: 'English AI News hreflang self' },
      { needle: '<meta property="og:locale" content="en_US"', label: 'English Open Graph locale' },
      { needle: '<meta property="og:image" content="https://smartbolig.net/images/ai-news-og.png"', label: 'AI News Open Graph image' },
      { needle: '<meta name="twitter:title"', label: 'Twitter title' },
      { needle: '<meta name="twitter:description"', label: 'Twitter description' },
      { needle: '<link rel="alternate" hreflang="x-default" href="https://smartbolig.net/da/ai/nyheder/"', label: 'x-default hreflang' },
      { needle: '<link rel="alternate" type="application/rss+xml" title="SmartBolig.net AI News" href="https://smartbolig.net/en/ai/news/rss.xml"', label: 'AI News RSS autodiscovery' },
      { needle: '"@type":"CollectionPage"', label: 'CollectionPage JSON-LD' },
      { needle: '"@type":"DataFeed"', label: 'DataFeed JSON-LD' },
      { needle: '"name":"Home"', label: 'English breadcrumb home label' },
      { needle: '"name":"AI News"', label: 'English breadcrumb AI News label' },
    ],
    forbidden: [
      { needle: 'noindex', label: 'noindex robots directive' },
      { needle: '"@type":"TechArticle"', label: 'TechArticle JSON-LD on collection page' },
      { needle: '"name":"En"', label: 'raw locale breadcrumb label' },
    ],
  });

  await validatePage(issues, path.join(distDir, 'da/home-assistant/kom-godt-i-gang/index.html'), {
    required: [
      { needle: '<link rel="canonical" href="https://smartbolig.net/da/home-assistant/kom-godt-i-gang/"', label: 'guide canonical URL' },
      { needle: '<meta property="og:locale" content="da_DK"', label: 'guide Open Graph locale' },
      { needle: '<meta name="twitter:title"', label: 'guide Twitter title' },
      { needle: '"@type":"WebPage"', label: 'guide WebPage JSON-LD' },
      { needle: '"@type":"TechArticle"', label: 'guide TechArticle JSON-LD' },
      { needle: '"name":"Home Assistant"', label: 'guide breadcrumb section label' },
      { needle: '"mainEntityOfPage":{"@id":"https://smartbolig.net/da/home-assistant/kom-godt-i-gang/#webpage"', label: 'guide article WebPage reference' },
    ],
    forbidden: [{ needle: 'noindex', label: 'noindex robots directive' }],
  });

  await validatePage(issues, path.join(distDir, '404.html'), {
    required: [
      { needle: '<meta name="description" content="Siden blev ikke fundet. Find SmartBolig.net guides fra forsiden."', label: '404 meta description' },
      { needle: '<meta property="og:type" content="website"', label: '404 Open Graph type' },
      { needle: '<meta name="robots" content="noindex, nofollow"', label: '404 robots noindex' },
      { needle: '"@type":"WebPage"', label: '404 WebPage JSON-LD' },
    ],
    forbidden: [
      { needle: '"@type":"TechArticle"', label: 'TechArticle JSON-LD on 404 page' },
      { needle: 'https://smartbolig.net/404/#article', label: '404 article schema' },
    ],
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

  console.log(`SEO validation passed${latest ? ` (latest AI News ${latest})` : ''}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
