/**
 * Copy for the 404 page. Danish and English are written separately, not
 * translated: the jokes only land if each language gets its own phrasing.
 * Used at build time (the page is rendered in Danish) and by the browser
 * script, which swaps in English when the visitor's URL or browser asks for it.
 */
export type NotFoundLang = "da" | "en";

export interface NotFoundLink {
  href: string;
  text: string;
}

export interface NotFoundCopy {
  title: string;
  heading: string;
  /** Matches what scripts/seo-validate.mjs requires verbatim for Danish. */
  metaDescription: string;
  description: string;
  eyebrow: string;
  entityId: string;
  stateLabel: string;
  restartingLabel: string;
  cardHint: string;
  historyLabel: string;
  historyAria: string;
  attrState: string;
  attrPath: string;
  attrDeviceClass: string;
  attrRestored: string;
  attrChanged: string;
  deviceClassValue: string;
  justNow: string;
  logTitle: string;
  logLines: string[];
  restartLabel: string;
  restartBusy: string;
  restartLines: string[];
  suggestTitle: string;
  homeLink: string;
  startLink: string;
  haLink: string;
  espLink: string;
  popularTitle: string;
  guides: NotFoundLink[];
  langSwitch: NotFoundLink & { flag: string };
  homePath: string;
  startPath: string;
  haPath: string;
  espPath: string;
}

export const notFoundCopy: Record<NotFoundLang, NotFoundCopy> = {
  da: {
    title: "404 - Side ikke fundet",
    heading: "Siden svarer ikke",
    metaDescription: "Siden blev ikke fundet. Find SmartBolig.net guides fra forsiden.",
    description:
      "Siden findes ikke, er flyttet, eller har mistet forbindelsen ligesom den ene Zigbee-pære der altid falder af. Her er det der rent faktisk svarer.",
    eyebrow: "Fejl 404 · entity not found",
    entityId: "sensor.side_du_soegte",
    stateLabel: "unavailable",
    restartingLabel: "restarting",
    cardHint: "Enhed: smartbolig.net · sidst set: aldrig",
    historyLabel: "Tilstand, sidste 24 timer",
    historyAria: "Home Assistant-tilstandshistorik",
    attrState: "state",
    attrPath: "requested_path",
    attrDeviceClass: "device_class",
    // A real HA attribute: `restored: true` is exactly what you see on an entity
    // that no longer exists but is remembered from a previous run.
    attrRestored: "restored",
    attrChanged: "last_changed",
    deviceClassValue: "skuffelse",
    justNow: "lige nu",
    logTitle: "Logbog",
    logLines: [
      "side_du_soegte blev unavailable",
      "automation.find_siden udløst, 0 handlinger kørt",
      "smartbolig.net: prøver igen om aldrig",
    ],
    restartLabel: "Genstart Home Assistant",
    restartBusy: "Genstarter",
    restartLines: [
      "Genstart gennemført. Siden findes stadig ikke.",
      "Genstart nr. 2. Stadig ingenting.",
      "Tredje gang er ikke lykkens gang. Prøv et af linkene.",
    ],
    suggestTitle: "Mente du?",
    homeLink: "Gå til forsiden",
    startLink: "Guidebiblioteket",
    haLink: "Home Assistant",
    espLink: "ESP32",
    popularTitle: "Sider der rent faktisk svarer",
    guides: [
      { href: "/da/home-assistant/kom-godt-i-gang/", text: "Kom godt i gang" },
      { href: "/da/home-assistant/zigbee2mqtt/", text: "Zigbee2MQTT" },
      { href: "/da/esp32/temperatur-sensor/", text: "Temperatur sensor" },
      { href: "/da/home-assistant/foerste-automation/", text: "Din første automation" },
    ],
    langSwitch: { href: "/en/", text: "English version", flag: "🇬🇧" },
    homePath: "/da/",
    startPath: "/da/start/",
    haPath: "/da/home-assistant/",
    espPath: "/da/esp32/",
  },
  en: {
    title: "404 - Page not found",
    heading: "This page is not responding",
    metaDescription: "Page not found. Find SmartBolig.net guides from the homepage.",
    description:
      "The page does not exist, it moved, or it dropped off the network like that one Zigbee bulb always does. Here is what actually responds.",
    eyebrow: "Error 404 · entity not found",
    entityId: "sensor.page_you_requested",
    stateLabel: "unavailable",
    restartingLabel: "restarting",
    cardHint: "Device: smartbolig.net · last seen: never",
    historyLabel: "State, last 24 hours",
    historyAria: "Home Assistant state history",
    attrState: "state",
    attrPath: "requested_path",
    attrDeviceClass: "device_class",
    attrRestored: "restored",
    attrChanged: "last_changed",
    deviceClassValue: "disappointment",
    justNow: "just now",
    logTitle: "Logbook",
    logLines: [
      "page_you_requested became unavailable",
      "automation.find_the_page triggered, 0 actions run",
      "smartbolig.net: retrying in never",
    ],
    restartLabel: "Restart Home Assistant",
    restartBusy: "Restarting",
    restartLines: [
      "Restart complete. The page still does not exist.",
      "Restart number 2. Still nothing.",
      "Third time is not the charm. Try one of the links.",
    ],
    suggestTitle: "Did you mean?",
    homeLink: "Go to homepage",
    startLink: "Guide library",
    haLink: "Home Assistant",
    espLink: "ESP32",
    popularTitle: "Pages that do respond",
    guides: [
      { href: "/en/home-assistant/kom-godt-i-gang/", text: "Getting Started" },
      { href: "/en/home-assistant/zigbee2mqtt/", text: "Zigbee2MQTT" },
      { href: "/en/esp32/temperatur-sensor/", text: "Temperature Sensor" },
      { href: "/en/home-assistant/foerste-automation/", text: "First Automation" },
    ],
    langSwitch: { href: "/da/", text: "Dansk version", flag: "🇩🇰" },
    homePath: "/en/",
    startPath: "/en/start/",
    haPath: "/en/home-assistant/",
    espPath: "/en/esp32/",
  },
};
