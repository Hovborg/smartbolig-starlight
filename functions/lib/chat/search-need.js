// When the site is searched for a question, and what is searched for.

import { MAX_SEARCH_QUERY_CHARS } from "./limits.js";

// \b only knows ASCII letters, so it would split "pæha" after the "æ". These
// make a word end at anything that is not a letter or a digit.
const START = "(?<![\\p{L}\\p{N}])";
const END = "(?![\\p{L}\\p{N}])";
const wholeWords = (words) => `${START}(?:${words.join("|")})${END}`;

// Words that put a question on this site's subject. A question with one of them
// uses its search result whatever the result scores. Only whole words count:
// "hub" is a hit, "hubris" is not.
const SMART_HOME_WORDS = [
  // Platforms and protocols. "ha'" is the Danish verb, "it does not matter",
  // "this thread" and "social security" are everyday English.
  "home assistant", "ha(?!['’])", "esphome", "esp32", "esp8266", "zigbee", "zigbee2mqtt", "zha", "z-?wave",
  "(?<!(?:not|n['’]t|no)\\s)matter", "(?<!this\\s)thread",
  "mqtt", "bluetooth", "wi-?fi", "ethernet", "vlan", "dns", "vpn", "reverse[- ]proxy", "docker", "container(?:e|s)?",
  "proxmox", "virtualisering", "virtualization", "nas", "truenas", "opnsense", "pfsense", "homey", "node-?red",
  "frigate", "tasmota", "wled", "shelly", "raspberry[-\\s]?pi", "ok\\s+nabu", "nabu\\s+casa", "wake[-\\s]?words?",
  // Brands and ecosystems
  "homekit", "alexa", "google[-\\s]?home", "hue", "aqara", "sonoff", "tuya", "ikea",
  // Devices
  "sensor(?:er|en|erne|s)?", "hub(?:ben|ber|berne|s)?", "gateway(?:en|s|e|er|erne)?", "router(?:e|en|ne|erne|s)?",
  "pære(?:r|n|rne)?", "bulbs?", "termostat(?:er|en|erne)?", "thermostats?", "robotstøvsuger(?:e|en|ne)?",
  "stikkontakt(?:er|en|erne)?", "smart[-\\s]?plugs?", "røgalarm(?:er|en|erne)?", "kamera(?:er|et|erne)?", "cameras?",
  // Subjects
  "backup(?:s|en)?", "sikkerhed", "(?<!social\\s)security", "automation(?:er|en|s)?", "automatisering(?:er|en)?",
  "smart[- ]?home", "smartbolig", "smart bolig", "energi", "energy", "solcelle(?:r|n|rne)?", "elpris(?:er|en|erne)?", "homelab",
];
const SMART_HOME_PATTERN = new RegExp(wholeWords(SMART_HOME_WORDS), "iu");

// A word that points back at something said before ("Hvad koster den?"), or an
// opening that continues it ("Og uden hub?", "What about the price?").
const POINTING_WORDS = [
  "den", "det", "de", "dem", "denne", "dette", "disse", "dens", "dets", "deres",
  "it", "its", "that", "this", "these", "those", "they", "them", "their",
];
const POINTS_BACK_PATTERN = new RegExp(
  `${wholeWords(POINTING_WORDS)}|^\\s*(?:og|and)\\s|^\\s*(?:hvad\\s+(?:så\\s+)?med|what\\s+about)${END}`,
  "iu",
);

// Words that stand for a thing already named, in the places where they can
// mean little else.
// - "den" is never an empty subject the way "det" is ("Er det muligt ...?").
//   Before an adjective it is the article ("den bedste lås", "den mest solgte"),
//   and an adjective after "den" ends in -e, so that use is left out. So is a
//   real follow-up like "Kan den styre varmen?"; it is searched alone first.
// - "Does it ...?" at the start asks about a thing. "Is it possible ...?" and
//   "How does it work with ...?" often do not.
const STANDS_FOR_A_THING_PATTERN = new RegExp(
  `${START}den(?!\\s+(?:\\p{L}*e|mest|mindst)${END})${END}` +
    `|${wholeWords(["dem", "dens", "deres", "them", "their", "its", "(?:this|that|which)\\s+one"])}` +
    `|^\\s*(?:does|doesn['’]t|can|can['’]t|will|won['’]t|could|should|would|did)\\s+it${END}`,
  "iu",
);

// Thanks and goodbyes. With no question mark in the message they end the
// subject: "Tak for det" points back at nothing the site should be searched for.
const THANKS_PATTERN = new RegExp(wholeWords(["tak", "takker", "thanks", "thank\\s+you", "thx", "farvel", "bye", "goodbye"]), "iu");

// How a message opens when it asks for something: a question word, a verb that
// opens a question, or a request ("Forklar nærmere", "Show me an example").
const ASKING_OPENINGS = [
  // Danish
  "hvad", "hvem", "hvor", "hvordan", "hvorfor", "hvornår", "hvilken", "hvilket", "hvilke", "kan", "kunne", "vil", "ville",
  "skal", "skulle", "må", "er", "var", "har", "findes", "virker", "bør", "behøver", "forklar", "uddyb", "vis", "giv",
  "fortæl", "beskriv", "sammenlign", "nævn", "hjælp", "anbefal", "foreslå", "jeg\\s+(?:vil|skal|mangler|søger|har\\s+brug)",
  // English
  "what", "who", "where", "how", "why", "when", "which", "can", "could", "will", "would", "should", "shall", "may",
  "is", "are", "was", "were", "do", "does", "did", "has", "have", "explain", "elaborate", "show", "give", "tell",
  "describe", "compare", "list", "name", "help", "recommend", "suggest", "please", "i\\s+(?:want|need|would)", "i['’]d",
];
const ASKS_PATTERN = new RegExp(`\\?|^\\s*(?:${ASKING_OPENINGS.join("|")})${END}`, "iu");

const userMessages = (messages) => messages.filter((message) => message.role === "user");

/** The text of the latest user message. */
export function latestQuestion(messages) {
  return userMessages(messages).at(-1)?.content || "";
}

/** Does the text have a smart home word? */
export function hasSmartHomeWord(text) {
  return SMART_HOME_PATTERN.test(text);
}

/** Is the message thanks or a goodbye, with no question in it? */
export function isThanks(text) {
  return THANKS_PATTERN.test(text) && !text.includes("?");
}

/** Does the text point back at something said before, or open like a continuation? */
export function pointsBack(text) {
  return POINTS_BACK_PATTERN.test(text);
}

/** Does the text talk about a thing only the conversation has named ("Virker den med Home Assistant?")? */
export function standsForAThing(text) {
  return STANDS_FOR_A_THING_PATTERN.test(text);
}

/** Does the text ask for something: a question mark, or an opening that asks or requests? */
export function asks(text) {
  return ASKS_PATTERN.test(text);
}

/**
 * Does the latest message lean on the question before it? `unknownTerms` is
 * how many of its search terms no page of the site uses.
 * - Thanks and goodbyes never do.
 * - A message that points back does ("Hvad koster den?", "Og uden hub?").
 * - So does one that asks for something in words the site knows ("Kan du
 *   uddybe?", "Hvorfor?", "Vis mig et eksempel"). A question that brings its
 *   own subject from outside the site ("Hvad er hovedstaden i Frankrig?") does
 *   not: it is a change of topic.
 */
export function isFollowUp(text, unknownTerms = 0) {
  if (isThanks(text)) return false;
  return pointsBack(text) || (asks(text) && unknownTerms === 0);
}

/**
 * The latest question together with the user message before it. Only that
 * one, so a topic from further back cannot take over. Latest first, because
 * the search only reads the first terms of a query (MAX_QUERY_TERMS in
 * site-search/tokens.js). null when there is no message before it.
 */
export function joinedQuery(messages) {
  const asked = userMessages(messages).map((message) => message.content);
  if (asked.length < 2) return null;
  return `${asked.at(-1)}\n${asked.at(-2)}`.slice(0, MAX_SEARCH_QUERY_CHARS);
}
