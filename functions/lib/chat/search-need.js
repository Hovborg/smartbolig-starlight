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

// A closing is a message made of these words only: thanks, a goodbye, a
// greeting or a short "fine". One word of the first list must be there; the
// second list is what such a message is padded with ("Tak for det", "Det
// lyder godt", "Thanks, that was a big help"). Any other word makes the
// message something to search for: "Tak, det virkede ikke" is no closing.
// "Ja" and "nej" are not closings; they answer something the assistant asked.
const CLOSING_WORDS = new Set([
  // Danish
  "tak", "takker", "farvel", "hej", "hejsa", "goddag", "godmorgen", "godaften", "godnat", "ok", "okay", "super", "fint", "godt", "god", "perfekt",
  "fedt", "dejligt", "fantastisk", "forstået", "mening",
  // English
  "thanks", "thank", "thx", "cheers", "bye", "goodbye", "alright", "fine", "great", "perfect", "nice", "cool",
  "awesome", "understood", "sense", "good", "goodnight", "helps", "got", "hi", "hello", "hey",
]);
const PADDING_WORDS = new Set([
  // Danish
  "for", "det", "den", "du", "dig", "skal", "have", "hjælpen", "hjælp", "svaret", "nu", "nå", "så", "lige", "bare",
  "meget", "mange", "tusind", "var", "er", "alt", "giver", "lyder", "igen", "med", "en", "stor", "at", "vide", "virker",
  "dag", "morgen", "aften", "nat", "weekend", "ha",
  // English
  "you", "so", "much", "very", "a", "lot", "the", "help", "answer", "that", "that's", "it", "it's", "this", "was", "is",
  "all", "now", "i", "see", "sounds", "makes", "day", "morning", "afternoon", "evening", "night", "one", "again", "to", "know",
  "big", "works",
]);
// A word may hold an apostrophe ("that's"); one at its end is dropped ("ha'").
const WORD_PATTERN = /[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu;

const userMessages = (messages) => messages.filter((message) => message.role === "user");

/** The text of the latest user message. */
export function latestQuestion(messages) {
  return userMessages(messages).at(-1)?.content || "";
}

/** Does the text have a smart home word? */
export function hasSmartHomeWord(text) {
  return SMART_HOME_PATTERN.test(text);
}

/**
 * Is the message a closing and nothing else: thanks, a goodbye, a greeting or
 * a short "fine", with no question mark? Such a message is not searched for.
 */
export function isClosing(text) {
  if (text.includes("?")) return false;
  const words = text.toLowerCase().replaceAll("’", "'").match(WORD_PATTERN) ?? [];
  return words.some((word) => CLOSING_WORDS.has(word)) && words.every((word) => CLOSING_WORDS.has(word) || PADDING_WORDS.has(word));
}

/**
 * Does the latest message lean on the question before it? Asked when the
 * message alone found nothing. `unknownTerms` is how many of its search terms
 * no page of the site uses.
 * - A message in words the site knows does: "Kan du uddybe?", "Hvorfor?",
 *   "Fortsæt", "Det virkede ikke". It brings no subject of its own.
 * - A message with a word the site does not use is a change of topic ("Hvad
 *   er hovedstaden i Frankrig?").
 */
export function isFollowUp(unknownTerms) {
  return unknownTerms === 0;
}

/**
 * The latest question together with the user message before it. Only that
 * one, so a topic from further back cannot take over. Latest first, because
 * the search only reads the first terms of a query (MAX_QUERY_TERMS in
 * site-search/tokens.js). null when there is no message before it, or when
 * the latest question fills the query alone and the search would be the same.
 */
export function joinedQuery(messages) {
  const asked = userMessages(messages).map((message) => message.content);
  if (asked.length < 2 || asked.at(-1).trim().length >= MAX_SEARCH_QUERY_CHARS) return null;
  return `${asked.at(-1)}\n${asked.at(-2)}`.slice(0, MAX_SEARCH_QUERY_CHARS);
}
