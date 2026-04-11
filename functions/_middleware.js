// Cloudflare Pages Function: Geo-based language redirect
// Danske IP'er → /da/, alle andre → /en/

function getCookieValue(cookieHeader, name) {
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function redirectTo(url, status = 302) {
  return Response.redirect(url.toString(), status);
}

const PRODUCT_SLUGS = new Set([
  'anbefalinger',
  'energistyring',
  'medier-entertainment',
  'shelly',
  'smart-alarm',
  'smart-baby',
  'smart-belysning',
  'smart-garage',
  'smart-gardiner',
  'smart-haven',
  'smart-kaeledyr',
  'smart-koekken',
  'smart-luftkvalitet',
  'smart-pool',
  'smart-rengoering',
  'smart-sikkerhed',
  'smart-stemmestyring',
  'smart-sundhed',
  'smart-termostater',
  'smart-vand',
  'tilstedevaerelse',
  'wifi-enheder',
  'zigbee-koordinatorer',
  'zigbee-sensorer',
]);

function ensureTrailingSlash(pathname) {
  return pathname.endsWith('/') ? pathname : `${pathname}/`;
}

function getLegacyRedirectPath(pathname) {
  const exact = {
    '/index.html': '/da/',
    '/index.xml': '/rss.xml',
    '/da/index.xml': '/rss.xml',
    '/en/index.xml': '/en/rss.xml',
    '/sitemap.xml': '/sitemap-index.xml',
    '/kontakt': '/da/kontakt/',
    '/kontakt/': '/da/kontakt/',
    '/produkter': '/da/produkter/',
    '/produkter/': '/da/produkter/',
  };

  if (exact[pathname]) {
    return exact[pathname];
  }

  const unlocalizedProduct = pathname.match(/^\/produkter\/(.+)$/);
  if (unlocalizedProduct) {
    return ensureTrailingSlash(`/da/produkter/${unlocalizedProduct[1]}`);
  }

  const danishProducts = pathname.match(/^\/da\/products\/(.+)$/);
  if (danishProducts) {
    return ensureTrailingSlash(`/da/produkter/${danishProducts[1]}`);
  }

  const englishDanishProductSlug = pathname.match(/^\/en\/products\/([^/]+)\/?$/);
  if (englishDanishProductSlug && PRODUCT_SLUGS.has(englishDanishProductSlug[1])) {
    return `/en/produkter/${englishDanishProductSlug[1]}/`;
  }

  return null;
}

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const country = request.cf?.country || 'XX';

  // Canonical host redirects. Preview deployments use
  // <hash>.smartbolig-starlight.pages.dev and are intentionally left alone.
  if (url.hostname === 'www.smartbolig.net') {
    url.hostname = 'smartbolig.net';
    return redirectTo(url, 301);
  }

  if (url.hostname === 'smartbolig-starlight.pages.dev') {
    url.hostname = 'smartbolig.net';
    return redirectTo(url, 301);
  }

  const legacyRedirectPath = getLegacyRedirectPath(url.pathname);
  if (legacyRedirectPath) {
    url.pathname = legacyRedirectPath;
    return redirectTo(url, 301);
  }

  // Kun redirect på root path (/)
  if (url.pathname === '/' || url.pathname === '') {
    const cookies = request.headers.get('Cookie') || '';
    const preferredLang = getCookieValue(cookies, 'preferred-lang');

    if (preferredLang === 'da' || preferredLang === 'en') {
      url.pathname = `/${preferredLang}/`;
      return redirectTo(url);
    }

    // Danmark → dansk version
    if (country === 'DK') {
      url.pathname = '/da/';
      return redirectTo(url);
    }

    // Alle andre lande → engelsk version
    url.pathname = '/en/';
    return redirectTo(url);
  }

  // Alle andre paths - fortsæt normalt
  return next();
}
