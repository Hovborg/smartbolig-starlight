// Which picture of the 3D house a page opens with, and what the page's
// section is called. The pictures are rendered by scripts/house-posters.mjs
// (names "guide-<art>") into public/images/guide/.

/** Alternative text per picture. */
export const GUIDE_ARTS = {
  overview: {
    da: "3D-model af et smart hjem set udefra i dagslys",
    en: "3D model of a smart home seen from outside in daylight",
  },
  "home-assistant": {
    da: "Stuen i 3D-modellen med et dashboard på væggen",
    en: "The living room of the 3D model with a dashboard on the wall",
  },
  automation: {
    da: "3D-model af huset om aftenen, hvor lamperne er forbundet til hjemmets hub",
    en: "3D model of the house in the evening with the lamps linked to the home hub",
  },
  light: {
    da: "Stuen i 3D-modellen om aftenen med lamperne tændt",
    en: "The living room of the 3D model in the evening with the lamps on",
  },
  heat: {
    da: "3D-model af huset om morgenen, hvor radiator, gulvvarme og varmepumpe er fremhævet",
    en: "3D model of the house in the morning with radiator, floor heating and heat pump highlighted",
  },
  energy: {
    da: "3D-model af huset, hvor solceller, ladeboks og elbil er fremhævet",
    en: "3D model of the house with solar panels, charger and electric car highlighted",
  },
  security: {
    da: "3D-model af huset om natten, hvor dørlås og kamera er fremhævet",
    en: "3D model of the house at night with door lock and camera highlighted",
  },
  diy: {
    da: "3D-model af huset, hvor en hjemmebygget sensor er forbundet til hubben",
    en: "3D model of the house with a home-built sensor linked to the hub",
  },
  network: {
    da: "Huset set ovenfra om natten med forbindelserne mellem enhederne og hubben",
    en: "The house seen from above at night with the links between the devices and the hub",
  },
  products: {
    da: "Køkken og entré i 3D-modellen med smarte enheder",
    en: "Kitchen and hallway of the 3D model with smart devices",
  },
  garden: {
    da: "Terrasse, have og robotplæneklipper i 3D-modellen",
    en: "Terrace, garden and robot mower in the 3D model",
  },
  ai: {
    da: "3D-model af et smart hjem om natten",
    en: "3D model of a smart home at night",
  },
};

/** First match wins. `null` means the page keeps its own picture. */
const RULES = [
  // The news overview and each news issue have pictures of their own.
  [/^ai\/nyheder(\/|$)/, null],
  [/^esp32(\/|$)/, "diy"],
  [/zigbee|z-wave|thread|matter|wifi|bluetooth|mqtt|proxy|fjernadgang|mcp/, "network"],
  [/energi|energy|elpris|elbil|solcelle|elmaaler|vaskemaskine|billige-timer/, "energy"],
  [/termostat|thermostat|varme|fugt|luft|affugter/, "heat"],
  [/alarm|sikkerhed|kamera|backup|opdatering/, "security"],
  [/lys|belysning|led|gardin/, "light"],
  [/have|pool|vand|garage|robot|kaeledyr|rengoering/, "garden"],
  [/automation|node-red|notifi|tilstedevaerelse|ferie|overvaagning/, "automation"],
  [/^produkter(\/|$)/, "products"],
  [/^ai(\/|$)/, "ai"],
  [/^home-assistant(\/|$)/, "home-assistant"],
];

export const GUIDE_ART_NAMES = [...new Set(RULES.map(([, art]) => art).filter(Boolean)), "overview"];

/** `slug` is the page path without the language, for example "esp32/led-strip". */
export function guideArt(slug, locale = "da") {
  const rule = RULES.find(([pattern]) => pattern.test(slug));
  const art = rule ? rule[1] : "overview";
  if (!art) return null;
  return { name: `guide-${art}`, alt: GUIDE_ARTS[art][locale] ?? GUIDE_ARTS[art].da };
}

/** A guide that shows a picture of its own near the top keeps that one. */
export function hasLeadPicture(body = "") {
  return /!\[[^\]]*\]\(|<img\b|<Image\b|<picture\b/.test(body.slice(0, 1500));
}

const SECTIONS = {
  "home-assistant": { da: "Home Assistant", en: "Home Assistant" },
  esp32: { da: "ESP32 & ESPHome", en: "ESP32 & ESPHome" },
  automationer: { da: "Automationer", en: "Automations" },
  produkter: { da: "Produkter", en: "Products" },
  ai: { da: "AI", en: "AI" },
  sikkerhed: { da: "Sikkerhed", en: "Security" },
  juridisk: { da: "Juridisk", en: "Legal" },
};

/** The section a page belongs to, or `null` for the section's own front page and loose pages. */
export function guideSection(slug, locale = "da") {
  const [first, ...rest] = slug.split("/");
  const section = SECTIONS[first];
  if (!section || rest.length === 0) return null;
  return { label: section[locale] ?? section.da, href: `/${locale}/${first}/` };
}
