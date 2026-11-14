import { type Lang, siteUrl } from "./site";

const labels: Record<Lang, Record<string, string>> = {
  da: {
    ai: "AI",
    "ai-cli": "AI CLI'er",
    nyheder: "AI-nyheder",
    automationer: "Automationer",
    esp32: "ESP32",
    "home-assistant": "Home Assistant",
    juridisk: "Juridisk",
    produkter: "Produkter",
    sikkerhed: "Sikkerhed",
    start: "Start her",
    kontakt: "Kontakt",
    "om-os": "Om SmartBolig.net",
  },
  en: {
    ai: "AI",
    "ai-cli": "AI CLIs",
    nyheder: "AI News",
    automationer: "Automations",
    esp32: "ESP32",
    "home-assistant": "Home Assistant",
    juridisk: "Legal",
    produkter: "Products",
    sikkerhed: "Security",
    start: "Start here",
    kontakt: "Contact",
    "om-os": "About SmartBolig.net",
  },
};

const formatPart = (lang: Lang, part: string) =>
  labels[lang]?.[part] || part.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

/**
 * BreadcrumbList for navigation, or null on the homepage: a list needs at least
 * two items, and a one-item list is invalid structured data.
 */
export function buildBreadcrumbSchema(
  pathname: string,
  lang: Lang,
  title: string,
  isStartPage: boolean,
) {
  const pathParts = pathname.split("/").filter(Boolean);
  const parts = pathParts[0] === "da" || pathParts[0] === "en" ? pathParts.slice(1) : pathParts;
  if (parts.length === 0) return null;
  const itemListElement = [
    {
      "@type": "ListItem",
      position: 1,
      name: lang === "da" ? "Forside" : "Home",
      item: `${siteUrl}/${lang}/`,
    },
    ...parts.map((part, index) => {
      const path = `/${[lang, ...parts.slice(0, index + 1)].join("/")}/`;
      const isLast = index === parts.length - 1;
      const name = isLast ? (isStartPage ? labels[lang]?.start || title : title) : formatPart(lang, part);
      return { "@type": "ListItem", position: index + 2, name, item: `${siteUrl}${path}` };
    }),
  ];
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement };
}