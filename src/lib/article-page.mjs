// Is this the page of one guide or one news article? Comments and the ad
// place under the text are only shown there, not on the front page, a
// section's overview, a legal page or a utility page.
const SECTION_OVERVIEW = /\/(home-assistant|esp32|produkter|automationer|sikkerhed|ai|ai-cli|nyheder)\/?$/;

export function isArticlePage(pathname) {
  if (/^\/(da|en)\/?$/.test(pathname)) return false;
  if (pathname.includes("/juridisk/")) return false;
  if (pathname.endsWith("/index") || SECTION_OVERVIEW.test(pathname)) return false;
  if (pathname.includes("/404") || pathname.includes("/kontakt") || pathname.includes("/om-os")) return false;
  return true;
}
