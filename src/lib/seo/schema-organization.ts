import { type Lang, organizationLogoUrl, siteUrl } from "./site";

/** Organization schema (appears on all pages). */
export function buildOrganizationSchema(lang: Lang) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: "SmartBolig.net",
    url: siteUrl,
    logo: {
      "@type": "ImageObject",
      url: organizationLogoUrl,
      width: 1200,
      height: 270,
    },
    description:
      lang === "da"
        ? "Dansk guide til smart home med Home Assistant, ESP32 og Zigbee"
        : "Danish smart home guide with Home Assistant, ESP32 and Zigbee",
    sameAs: ["https://github.com/Hovborg/smartbolig-starlight"],
  };
}

/**
 * WebSite schema. No SearchAction: site search is client-side (Pagefind), so
 * there is no URL-queryable search endpoint a SearchAction could point to.
 */
export function buildWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: "SmartBolig.net",
    url: siteUrl,
    publisher: { "@id": `${siteUrl}/#organization` },
    // The site entity itself is bilingual regardless of which page is rendered.
    inLanguage: ["da-DK", "en-US"],
  };
}