// The main sections shown in the top bar. One list for both languages, so a
// section is added or removed in one place.
export type NavLocale = "da" | "en";

interface Section {
  path: string;
  da: string;
  en: string;
}

const SECTIONS: Section[] = [
  { path: "home-assistant/", da: "Home Assistant", en: "Home Assistant" },
  { path: "esp32/", da: "ESP32", en: "ESP32" },
  { path: "automationer/", da: "Automationer", en: "Automations" },
  { path: "vaerktoejer/", da: "Værktøjer", en: "Tools" },
  { path: "produkter/", da: "Produkter", en: "Products" },
  { path: "ai/", da: "AI", en: "AI" },
  { path: "ai/nyheder/", da: "Nyheder", en: "News" },
];

export interface NavItem {
  href: string;
  label: string;
  current: boolean;
}

export function primaryNav(locale: NavLocale, pathname: string): NavItem[] {
  const items = SECTIONS.map((section) => ({
    href: `/${locale}/${section.path}`,
    label: section[locale],
  }));
  // The longest matching section wins, so /ai/nyheder/ marks News, not AI.
  const active = items
    .filter((item) => pathname.startsWith(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return items.map((item) => ({ ...item, current: item === active }));
}

// The same page in the other language. Every page exists in both.
export function alternateLocale(locale: NavLocale, pathname: string) {
  const other: NavLocale = locale === "da" ? "en" : "da";
  const rest = pathname.replace(/^\/(?:da|en)(?=\/|$)/, "");
  return {
    locale: other,
    href: `/${other}${rest || "/"}`,
    label: other === "en" ? "English" : "Dansk",
    short: other.toUpperCase(),
  };
}
