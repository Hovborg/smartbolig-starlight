// The links and texts of the footer on every page (components/Footer.astro).
// Internal links are written without the language; the component adds it.

export const YOUTUBE_URL = "https://www.youtube.com/@SmartBoligNet";
export const GITHUB_URL = "https://github.com/Hovborg/smartbolig-starlight";

const copy = {
  da: {
    tagline: "Uafhængige guides til et smart hjem, du selv styrer. Lokal kontrol og privatliv først.",
    nav: "Sidefod",
    columns: [
      {
        title: "Guides",
        links: [
          { label: "Home Assistant", path: "/home-assistant/" },
          { label: "ESP32 & ESPHome", path: "/esp32/" },
          { label: "Automationer", path: "/automationer/" },
          { label: "Produkter", path: "/produkter/" },
          { label: "Sikkerhed", path: "/sikkerhed/" },
          { label: "AI", path: "/ai/" },
        ],
      },
      {
        title: "Om siden",
        links: [
          { label: "Startruten", path: "/start/" },
          { label: "Om SmartBolig.net", path: "/om-os/" },
          { label: "Kontakt og rettelser", path: "/kontakt/" },
        ],
      },
      {
        title: "Følg med",
        links: [
          { label: "AI-nyheder", path: "/ai/nyheder/" },
          { label: "RSS", href: "/rss.xml" },
          { label: "YouTube", href: YOUTUBE_URL },
          { label: "GitHub", href: GITHUB_URL },
        ],
      },
    ],
    legalNav: "Juridiske links",
    legal: [
      { label: "Brugsvilkår", path: "/juridisk/brugsvilkaar/" },
      { label: "Privatlivspolitik", path: "/juridisk/privatlivspolitik/" },
      { label: "Cookiepolitik", path: "/juridisk/cookiepolitik/" },
      { label: "Reklamelinks", path: "/juridisk/affiliate-disclosure/" },
    ],
    cookieSettings: "Cookieindstillinger",
    rights: "Alle rettigheder forbeholdes. Indhold må ikke kopieres uden skriftlig tilladelse.",
  },
  en: {
    tagline: "Independent guides to a smart home you control yourself. Local control and privacy first.",
    nav: "Footer",
    columns: [
      {
        title: "Guides",
        links: [
          { label: "Home Assistant", path: "/home-assistant/" },
          { label: "ESP32 & ESPHome", path: "/esp32/" },
          { label: "Automations", path: "/automationer/" },
          { label: "Products", path: "/produkter/" },
          { label: "Security", path: "/sikkerhed/" },
          { label: "AI", path: "/ai/" },
        ],
      },
      {
        title: "About",
        links: [
          { label: "Start route", path: "/start/" },
          { label: "About SmartBolig.net", path: "/om-os/" },
          { label: "Contact and corrections", path: "/kontakt/" },
        ],
      },
      {
        title: "Follow",
        links: [
          { label: "AI news", path: "/ai/nyheder/" },
          { label: "RSS", href: "/en/rss.xml" },
          { label: "YouTube", href: YOUTUBE_URL },
          { label: "GitHub", href: GITHUB_URL },
        ],
      },
    ],
    legalNav: "Legal links",
    legal: [
      { label: "Terms of use", path: "/juridisk/brugsvilkaar/" },
      { label: "Privacy policy", path: "/juridisk/privatlivspolitik/" },
      { label: "Cookie policy", path: "/juridisk/cookiepolitik/" },
      { label: "Affiliate disclosure", path: "/juridisk/affiliate-disclosure/" },
    ],
    cookieSettings: "Cookie settings",
    rights: "All rights reserved. Content may not be copied without written permission.",
  },
};

/** The footer for one language, with every link as a ready `href`. */
export function siteFooter(locale = "da") {
  const text = copy[locale] ?? copy.da;
  const href = (link) => ({ label: link.label, href: link.href ?? `/${locale}${link.path}`, external: /^https:/.test(link.href ?? "") });
  return {
    ...text,
    columns: text.columns.map((column) => ({ title: column.title, links: column.links.map(href) })),
    legal: text.legal.map(href),
  };
}
