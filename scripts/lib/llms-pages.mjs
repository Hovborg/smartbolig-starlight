// Reads the pages the sitemap lists from dist/ and returns what llms.txt
// needs from each: address, language, section, title and description. The
// built <head> is the one source, so the file says what search engines see.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { locate, unknownAreas } from "./llms-txt.mjs";
import { SITE_NAME_SUFFIX, decodeEntities } from "./seo-title-checks.mjs";

const ORIGIN = "https://smartbolig.net/";
const oneLine = (value) => decodeEntities(value).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

/** Every <loc> in a sitemap, in the order written. */
export const locsOf = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decodeEntities(match[1]));

export function headOf(html) {
  let title = oneLine(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  if (title.endsWith(SITE_NAME_SUFFIX)) title = title.slice(0, -SITE_NAME_SUFFIX.length);
  const tag = (html.match(/<meta\b[^>]*>/gi) ?? []).find((candidate) => /\sname="description"/i.test(candidate));
  const description = oneLine(tag?.match(/\scontent="([^"]*)"/i)?.[1] ?? "");
  return { title, description };
}

/** Every page address the sitemap index leads to. */
export async function sitemapUrls(distDir) {
  const index = await readFile(path.join(distDir, "sitemap-index.xml"), "utf8");
  const urls = [];
  for (const sitemap of locsOf(index)) {
    const file = path.join(distDir, new URL(sitemap).pathname);
    urls.push(...locsOf(await readFile(file, "utf8")));
  }
  return urls;
}

export async function readBuiltPages(distDir) {
  const pages = [];
  const urls = await sitemapUrls(distDir);
  // A new area must be listed or left out on purpose; silently missing from llms.txt is neither.
  const unknown = unknownAreas(urls);
  if (unknown.length) {
    throw new Error(`llms.txt: the sitemap has pages under ${unknown.map((area) => `/${area}/`).join(", ")}, which scripts/lib/llms-txt.mjs does not know. Add the area to SECTIONS, or to LEFT_OUT to leave it out.`);
  }
  for (const url of urls) {
    const place = locate(url);
    if (!place || !url.startsWith(ORIGIN)) continue;
    const relative = decodeURIComponent(new URL(url).pathname).replace(/^\/+|\/+$/g, "");
    const html = await readFile(path.join(distDir, relative, "index.html"), "utf8");
    pages.push({ url, ...place, ...headOf(html) });
  }
  return pages;
}
