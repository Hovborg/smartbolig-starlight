// Checks the built dist/llms.txt: it starts as the convention wants, and every
// link in it is a page of the sitemap or one of the feed/policy addresses.

import { FIXED_URLS } from "./llms-txt.mjs";

/**
 * @param {string | undefined} text the file, or undefined when it is missing
 * @param {Iterable<string>} sitemapUrls the pages the sitemap lists
 * @returns {string[]} what is wrong; empty when the file is fine
 */
export function checkLlmsTxt(text, sitemapUrls) {
  if (text === undefined) return ["dist/llms.txt is missing; node scripts/write-llms-txt.mjs writes it"];
  const messages = [];
  if (!text.startsWith("# SmartBolig.net\n")) messages.push("llms.txt must start with '# SmartBolig.net'");
  const known = new Set([...sitemapUrls, ...FIXED_URLS]);
  // Link targets everywhere, plus the plain addresses in the policy paragraph before the first section.
  const header = text.split("\n## ")[0];
  const urls = new Set([
    ...[...text.matchAll(/\]\((https?:[^)\s]+)\)/g)].map((match) => match[1]),
    ...(header.match(/https?:\/\/[^\s)]+/g) ?? []),
  ]);
  for (const url of urls) {
    if (!known.has(url)) messages.push(`llms.txt links to ${url}, which is not in the sitemap or the known feed/policy addresses`);
  }
  return messages;
}
