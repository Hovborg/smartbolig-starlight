// When the site is searched for a question, and what is searched for.

import { MAX_SEARCH_QUERY_CHARS } from "./limits.js";

const SMART_HOME_OR_HOMELAB_PATTERN =
  /\b(?:home assistant|ha|esphome|esp32|esp8266|sensor(?:er|s)?|zigbee|z-?wave|matter|thread|mqtt|bluetooth|wi-?fi|ethernet|vlan|dns|reverse[- ]proxy|docker|container(?:e|s)?|proxmox|virtualisering|virtualization|nas|backup|sikkerhed|security|automation|automatisering|smart[- ]?home|smartbolig|smart bolig|shelly|tasmota|truenas|opnsense|pfsense|homey|node-?red|frigate|kamera|camera|energi|energy|solcelle|elpris|homelab)\b/iu;

const userMessages = (messages) => messages.filter((message) => message.role === "user");

// A smart home word in the latest question: its search result is used whatever it scores.
export function shouldRequireSmartboligSearch(messages) {
  return SMART_HOME_OR_HOMELAB_PATTERN.test(userMessages(messages).at(-1)?.content || "");
}

// The latest question, then the one before it: a follow-up like "Hvad koster den?"
// only makes sense with that one. Latest first, because the search only reads the
// first terms of a query (MAX_QUERY_TERMS in site-search/tokens.js).
export function searchQuery(messages) {
  const asked = userMessages(messages).map((message) => message.content);
  return asked.slice(-2).reverse().join("\n").slice(0, MAX_SEARCH_QUERY_CHARS);
}
