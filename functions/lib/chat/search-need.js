// When the site is searched for a question, and what is searched for.

import { MAX_SEARCH_QUERY_CHARS } from "./limits.js";

// Words that put a question on this site's subject. A question with one of them
// uses its search result whatever the result scores. Only whole words count:
// "hub" is a hit, "hubris" is not.
const SMART_HOME_WORDS = [
  // Platforms and protocols
  "home assistant", "ha", "esphome", "esp32", "esp8266", "zigbee", "zigbee2mqtt", "zha", "z-?wave", "matter", "thread",
  "mqtt", "bluetooth", "wi-?fi", "ethernet", "vlan", "dns", "vpn", "reverse[- ]proxy", "docker", "container(?:e|s)?",
  "proxmox", "virtualisering", "virtualization", "nas", "truenas", "opnsense", "pfsense", "homey", "node-?red",
  "frigate", "tasmota", "wled", "shelly", "raspberry\\s+pi",
  // Brands and ecosystems
  "homekit", "alexa", "google\\s+home", "hue", "aqara", "sonoff", "tuya", "ikea",
  // Devices
  "sensor(?:er|s)?", "hub(?:ben|s)?", "gateway", "router(?:e|en|s)?", "pære(?:r|n|rne)?", "bulbs?",
  "termostat(?:er|en|erne)?", "thermostats?", "robotstøvsuger(?:e|en|ne)?", "stikkontakt(?:er|en|erne)?",
  "smart\\s+plugs?", "røgalarm(?:er|en|erne)?", "kamera", "camera",
  // Subjects
  "backup", "sikkerhed", "security", "automation", "automatisering", "smart[- ]?home", "smartbolig", "smart bolig",
  "energi", "energy", "solcelle", "elpris", "homelab",
];

// \b only knows ASCII letters, so it would split "pæha" after the "æ". The
// look-arounds make a word end at anything that is not a letter or a digit.
const SMART_HOME_PATTERN = new RegExp(`(?<![\\p{L}\\p{N}])(?:${SMART_HOME_WORDS.join("|")})(?![\\p{L}\\p{N}])`, "iu");

// A word that points back at something said before ("Hvad koster den?"), or an
// opening that continues it ("Og uden hub?", "What about the price?").
const POINTING_WORDS = [
  "den", "det", "de", "dem", "denne", "dette", "disse", "dens", "dets", "deres",
  "it", "its", "that", "this", "these", "those", "they", "them", "their",
];
const FOLLOW_UP_PATTERN = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${POINTING_WORDS.join("|")})(?![\\p{L}\\p{N}])` +
    "|^\\s*(?:og|and)\\s|^\\s*(?:hvad\\s+(?:så\\s+)?med|what\\s+about)(?![\\p{L}\\p{N}])",
  "iu",
);

const userMessages = (messages) => messages.filter((message) => message.role === "user");

/** The text of the latest user message. */
export function latestQuestion(messages) {
  return userMessages(messages).at(-1)?.content || "";
}

/** Does the text have a smart home word? */
export function hasSmartHomeWord(text) {
  return SMART_HOME_PATTERN.test(text);
}

/** Does the text look like it continues the question before it? */
export function isFollowUp(text) {
  return FOLLOW_UP_PATTERN.test(text);
}

/**
 * The query for a follow-up: the latest question, then the user message before
 * it. Only that one, so a topic from further back cannot take over. Latest
 * first, because the search only reads the first terms of a query
 * (MAX_QUERY_TERMS in site-search/tokens.js). null when the latest question is
 * no follow-up or there is no message before it.
 */
export function followUpQuery(messages) {
  const asked = userMessages(messages).map((message) => message.content);
  if (asked.length < 2 || !isFollowUp(asked.at(-1))) return null;
  return `${asked.at(-1)}\n${asked.at(-2)}`.slice(0, MAX_SEARCH_QUERY_CHARS);
}
