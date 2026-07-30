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
const redirectsPath = path.join(rootDir, 'public/_redirects');
const robotsPath = path.join(rootDir, 'public/robots.txt');
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

function decodeEntities(value) {
  const named = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    quot: '"',
  };

  return value.replace(/&(#x[\da-f]+|#\d+|amp|apos|gt|lt|quot);/gi, (entity, code) => {
    if (code[0] !== '#') return named[code.toLowerCase()] ?? entity;
    const radix = code[1].toLowerCase() === 'x' ? 16 : 10;
    const number = Number.parseInt(code.slice(radix === 16 ? 2 : 1), radix);
    return Number.isFinite(number) ? String.fromCodePoint(number) : entity;
  });
}

function sitemapUrlToHtmlPath(loc) {
  const url = new URL(loc);
  if (url.origin !== 'https://smartbolig.net') return null;
  const relative = decodeURIComponent(url.pathname).replace(/^\/+|\/+$/g, '');
  return path.join(distDir, relative, 'index.html');
}

async function validateSitemapPages(issues, sitemapPath, sitemap) {
  const entries = sitemap.match(/<url>[\s\S]*?<\/url>/g) ?? [];
  const titles = new Map();

  for (const entry of entries) {
    const locMatch = entry.match(/<loc>([^<]+)<\/loc>/);
    if (!locMatch) {
      fail(issues, sitemapPath, 'sitemap entry is missing loc');
      continue;
    }

    const loc = decodeEntities(locMatch[1]);
    const lastmod = entry.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
    if (!lastmod) {
      fail(issues, sitemapPath, `${loc} is missing lastmod`);
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(lastmod) || Number.isNaN(Date.parse(`${lastmod}T00:00:00Z`))) {
      fail(issues, sitemapPath, `${loc} has invalid lastmod: ${lastmod}`);
    }

    const htmlPath = sitemapUrlToHtmlPath(loc);
    if (!htmlPath) {
      fail(issues, sitemapPath, `unexpected sitemap origin: ${loc}`);
      continue;
    }
    if (!existsSync(htmlPath)) {
      fail(issues, htmlPath, `missing generated HTML for sitemap URL ${loc}`);
      continue;
    }

    const html = await readFile(htmlPath, 'utf8');
    const h1Count = (html.match(/<h1\b/gi) ?? []).length;
    if (h1Count !== 1) fail(issues, htmlPath, `expected exactly one h1, found ${h1Count}`);

    const title = decodeEntities(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!title) {
      fail(issues, htmlPath, 'missing non-empty title');
    } else {
      const matches = titles.get(title) ?? [];
      matches.push(loc);
      titles.set(title, matches);
    }

    const description = decodeEntities(
      html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1] ?? '',
    ).replace(/\s+/g, ' ').trim();
    const descriptionLength = [...description].length;
    if (descriptionLength < 80 || descriptionLength > 165) {
      fail(
        issues,
        htmlPath,
        `meta description must be 80–165 characters, found ${descriptionLength}`,
      );
    }
  }

  for (const [title, locations] of titles) {
    if (locations.length > 1) {
      fail(issues, sitemapPath, `duplicate title "${title}" on ${locations.join(', ')}`);
    }
  }

  return entries.length;
}

async function main() {
  const issues = [];
  let sitemapPageCount = 0;
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
      { needle: 'href="/da/ai/nyheder/"', label: 'Danish home AI News link' },
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
      { needle: 'href="/en/ai/nyheder/"', label: 'English home AI News link' },
    ],
    forbidden: [
      { needle: 'noindex', label: 'noindex robots directive' },
      { needle: '"@type":"TechArticle"', label: 'TechArticle JSON-LD on home page' },
      { needle: 'https://smartbolig.net/en/#article', label: 'home page article schema' },
      { needle: '"name":"En"', label: 'raw locale breadcrumb label' },
    ],
  });

  await validatePage(issues, path.join(distDir, 'da/start/index.html'), {
    required: [
      { needle: '<link rel="canonical" href="https://smartbolig.net/da/start/"', label: 'Danish start canonical URL' },
      { needle: '<link rel="alternate" hreflang="da" href="https://smartbolig.net/da/start/"', label: 'Danish start hreflang self' },
      { needle: '<link rel="alternate" hreflang="en" href="https://smartbolig.net/en/start/"', label: 'Danish start English alternate' },
      { needle: '<meta property="og:locale" content="da_DK"', label: 'Danish start Open Graph locale' },
      { needle: '"@type":"WebPage"', label: 'Danish start WebPage JSON-LD' },
      { needle: '"name":"Start her"', label: 'Danish start breadcrumb label' },
    ],
    forbidden: [
      { needle: 'noindex', label: 'Danish start noindex directive' },
      { needle: '"@type":"TechArticle"', label: 'TechArticle on Danish start page' },
      { needle: 'https://smartbolig.net/da/start/#article', label: 'Danish start article schema' },
    ],
  });

  await validatePage(issues, path.join(distDir, 'en/start/index.html'), {
    required: [
      { needle: '<link rel="canonical" href="https://smartbolig.net/en/start/"', label: 'English start canonical URL' },
      { needle: '<link rel="alternate" hreflang="da" href="https://smartbolig.net/da/start/"', label: 'English start Danish alternate' },
      { needle: '<link rel="alternate" hreflang="en" href="https://smartbolig.net/en/start/"', label: 'English start hreflang self' },
      { needle: '<meta property="og:locale" content="en_US"', label: 'English start Open Graph locale' },
      { needle: '"@type":"WebPage"', label: 'English start WebPage JSON-LD' },
      { needle: '"name":"Start here"', label: 'English start breadcrumb label' },
    ],
    forbidden: [
      { needle: 'noindex', label: 'English start noindex directive' },
      { needle: '"@type":"TechArticle"', label: 'TechArticle on English start page' },
      { needle: 'https://smartbolig.net/en/start/#article', label: 'English start article schema' },
    ],
  });

  for (const imagePath of aiNewsImages) {
    if (!existsSync(path.join(rootDir, imagePath))) fail(issues, path.join(rootDir, imagePath), 'missing AI News SEO image');
  }

  if (existsSync(redirectsPath)) {
    const redirects = await readFile(redirectsPath, 'utf8');
    for (const [index, line] of redirects.split('\n').entries()) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const isAllowedFeedSelfRule = trimmed === '/en/ai/news/rss.xml /en/ai/news/rss.xml 200';
      if (trimmed.endsWith(' 200') && !isAllowedFeedSelfRule) {
        fail(issues, redirectsPath, `line ${index + 1}: alias rule must be 301, not 200`);
      }
    }
  } else {
    fail(issues, redirectsPath, 'missing Cloudflare redirects file');
  }

  if (existsSync(robotsPath)) {
    const robots = await readFile(robotsPath, 'utf8');
    const requiredRobotRules = [
      { needle: 'User-agent: Googlebot\nAllow: /', label: 'Googlebot allowed' },
      { needle: 'User-agent: Bingbot\nAllow: /', label: 'Bingbot allowed' },
      { needle: 'User-agent: ChatGPT-User\nAllow: /', label: 'ChatGPT user-request crawler allowed' },
      { needle: 'User-agent: OAI-SearchBot\nAllow: /', label: 'OpenAI search crawler allowed' },
      { needle: 'User-agent: PerplexityBot\nAllow: /', label: 'Perplexity answer crawler allowed' },
      { needle: 'User-agent: GPTBot\nDisallow: /', label: 'OpenAI training crawler blocked' },
      { needle: 'User-agent: Google-Extended\nDisallow: /', label: 'Google AI training opt-out' },
      { needle: 'User-agent: CCBot\nDisallow: /', label: 'Common Crawl training crawler blocked' },
    ];
    for (const check of requiredRobotRules) requireText(issues, robotsPath, robots, check.needle, check.label);
  } else {
    fail(issues, robotsPath, 'missing robots.txt');
  }

  if (!latest || !enArticles.includes(`${latest}.mdx`)) {
    fail(issues, daNewsDir, 'missing mirrored AI News daily issue');
  } else {
    const latestAiNewsImages = [
      `public/images/ai-news/${latest}.jpg`,
      `public/images/ai-news/${latest}-16x9.jpg`,
      `public/images/ai-news/${latest}-4x3.jpg`,
      `public/images/ai-news/${latest}-1x1.jpg`,
    ];
    for (const imagePath of latestAiNewsImages) {
      if (!existsSync(path.join(rootDir, imagePath))) {
        fail(issues, path.join(rootDir, imagePath), 'missing date-specific AI News image');
      }
    }

    await validatePage(issues, path.join(distDir, 'da/ai/nyheder', latest, 'index.html'), {
      required: [
        { needle: `<link rel="canonical" href="https://smartbolig.net/da/ai/nyheder/${latest}/"`, label: 'canonical URL' },
        { needle: `<link rel="alternate" hreflang="da" href="https://smartbolig.net/da/ai/nyheder/${latest}/"`, label: 'Danish hreflang self' },
        { needle: `<link rel="alternate" hreflang="en" href="https://smartbolig.net/en/ai/nyheder/${latest}/"`, label: 'Danish hreflang English' },
        { needle: '<meta property="og:locale" content="da_DK"', label: 'Danish Open Graph locale' },
        { needle: '<meta property="og:locale:alternate" content="en_US"', label: 'Danish alternate Open Graph locale' },
        { needle: '<meta property="og:type" content="article"', label: 'article Open Graph type' },
        { needle: `<meta property="og:image" content="https://smartbolig.net/images/ai-news/${latest}.jpg"`, label: 'date-specific AI News Open Graph image' },
        { needle: 'ai-news-hero', label: 'visible AI News article image figure' },
        { needle: `src="/images/ai-news/${latest}.jpg"`, label: 'visible date-specific AI News article image source' },
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
        { needle: `"url":"https://smartbolig.net/images/ai-news/${latest}-16x9.jpg"`, label: 'date-specific AI News 16:9 structured-data image' },
        { needle: '"citation":[', label: 'source citations in JSON-LD' },
        { needle: '"name":"Forside"', label: 'Danish breadcrumb home label' },
        { needle: '"name":"AI-nyheder"', label: 'Danish breadcrumb AI News label' },
      ],
      forbidden: [
        { needle: 'noindex', label: 'noindex robots directive' },
        { needle: 'src="/images/ai-news-og.png"', label: 'generic visible AI News image on daily issue' },
        { needle: 'https://smartbolig.net/images/ai-news-og.png', label: 'generic AI News social image on daily issue' },
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
        { needle: `<meta property="og:image" content="https://smartbolig.net/images/ai-news/${latest}.jpg"`, label: 'date-specific AI News Open Graph image' },
        { needle: 'ai-news-hero', label: 'visible AI News article image figure' },
        { needle: `src="/images/ai-news/${latest}.jpg"`, label: 'visible date-specific AI News article image source' },
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
        { needle: `"url":"https://smartbolig.net/images/ai-news/${latest}-16x9.jpg"`, label: 'date-specific AI News 16:9 structured-data image' },
        { needle: '"citation":[', label: 'source citations in JSON-LD' },
        { needle: '"name":"Home"', label: 'English breadcrumb home label' },
        { needle: '"name":"AI News"', label: 'English breadcrumb AI News label' },
      ],
      forbidden: [
        { needle: 'noindex', label: 'noindex robots directive' },
        { needle: 'src="/images/ai-news-og.png"', label: 'generic visible AI News image on daily issue' },
        { needle: 'https://smartbolig.net/images/ai-news-og.png', label: 'generic AI News social image on daily issue' },
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
    requireText(issues, sitemapPath, sitemap, 'https://smartbolig.net/da/start/', 'Danish start page in sitemap');
    requireText(issues, sitemapPath, sitemap, 'https://smartbolig.net/en/start/', 'English start page in sitemap');
    sitemapPageCount = await validateSitemapPages(issues, sitemapPath, sitemap);
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
      { needle: `https://smartbolig.net/en/ai/nyheder/${latest}/`, label: 'English AI News canonical article URL in RSS' },
      { needle: '<category>AI News</category>', label: 'AI News RSS category' },
    ],
    forbidden: [
      { needle: `https://smartbolig.net/en/ai/news/${latest}/`, label: 'English AI News alias article URL in RSS' },
    ],
  });

  if (issues.length > 0) {
    console.error('SEO validation failed:');
    for (const issue of issues) console.error(`- ${issue}`);
    process.exit(1);
  }

  console.log(
    `SEO validation passed for ${sitemapPageCount} sitemap pages`
      + `${latest ? ` (latest AI News ${latest})` : ''}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
