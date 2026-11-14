// Builds the text of /llms.txt (https://llmstxt.org) from the pages of the
// built site. Pure: pages in, text out. Reading dist/ is scripts/lib/llms-pages.mjs.
// The file is written by the build so it cannot go stale when a section grows.

export const MAX_BYTES = 100 * 1024;
export const MAX_DESCRIPTION = 160;
const ORIGIN = "https://smartbolig.net";

// Top-level areas in the order a reader meets them. "start" holds the pages
// that sit directly under /da/ and /en/ (home, start, about, contact).
export const SECTIONS = [
  ["start", "Start"],
  ["home-assistant", "Home Assistant"],
  ["automationer", "Automationer"],
  ["esp32", "ESP32"],
  ["produkter", "Produkter"],
  ["sikkerhed", "Sikkerhed"],
  ["ai", "AI"],
];
// Top-level folders that are left out on purpose.
export const LEFT_OUT = ["juridisk"];

// Links the file carries besides pages. The check after a build accepts these
// next to the sitemap's pages.
export const FEEDS = [
  ["Danish RSS", `${ORIGIN}/rss.xml`],
  ["English RSS", `${ORIGIN}/en/rss.xml`],
  ["AI news RSS (da)", `${ORIGIN}/da/ai/nyheder/rss.xml`],
  ["AI news RSS (en)", `${ORIGIN}/en/ai/news/rss.xml`],
  ["Sitemap", `${ORIGIN}/sitemap-index.xml`],
];
export const POLICY_URLS = [`${ORIGIN}/robots.txt`, `${ORIGIN}/da/juridisk/brugsvilkaar/`];
export const FIXED_URLS = [...FEEDS.map(([, url]) => url), ...POLICY_URLS];

const HEADER = `# SmartBolig.net

> Danish smart-home and AI knowledge site: practical, source-based guides on
> Home Assistant, Zigbee, ESP32, smart products, AI tools (ChatGPT, Claude,
> Gemini, coding agents) and daily curated AI news. Bilingual (Danish
> original, English mirror).

Content policy for AI systems: retrieval and answering with attribution and a
link back to the source page is welcome; bulk training/dataset collection is
not permitted. See ${POLICY_URLS[0]} and
${POLICY_URLS[1]}
`;

const NEWS_ISSUE = /^\/(?:da|en)\/ai\/nyheder\/\d{4}-\d{2}-\d{2}\/$/;

/** Where a page URL belongs: { lang, section }, or null for pages the file leaves out. */
export function locate(url) {
  const { pathname } = new URL(url);
  if (!pathname.endsWith("/")) return null;
  const [lang, top, ...deeper] = pathname.split("/").filter(Boolean);
  if (lang !== "da" && lang !== "en") return null;
  if (!top) return { lang, section: "start" };
  if (SECTIONS.slice(1).some(([key]) => key === top)) return NEWS_ISSUE.test(pathname) ? null : { lang, section: top };
  // A single page directly under /da/ or /en/ (start, om-os, kontakt). The
  // legal pages and anything else unknown are left out.
  return deeper.length === 0 && !LEFT_OUT.includes(top) ? { lang, section: "start" } : null;
}

/** Top-level areas with pages below them that the file neither lists nor leaves out on purpose. */
export function unknownAreas(urls) {
  const known = new Set([...SECTIONS.map(([key]) => key), ...LEFT_OUT]);
  const unknown = new Set();
  for (const url of urls) {
    const [lang, top, ...deeper] = new URL(url).pathname.split("/").filter(Boolean);
    if ((lang === "da" || lang === "en") && top && deeper.length > 0 && !known.has(top)) unknown.add(top);
  }
  return [...unknown].sort();
}

/** One line of text, cut at a word boundary to at most `limit` characters. */
export function shorten(text, limit = MAX_DESCRIPTION) {
  const chars = [...text.replace(/\s+/g, " ").trim()];
  if (chars.length <= limit) return chars.join("");
  const head = chars.slice(0, limit - 1).join("");
  const space = head.lastIndexOf(" ");
  const cut = space > limit / 2 ? head.slice(0, space) : head;
  return `${cut.replace(/[\s,;:.\-–(]+$/, "")}…`;
}

const escapeLabel = (title) => title.replace(/[[\]]/g, (bracket) => `\\${bracket}`);

function line(page) {
  const description = shorten(page.description ?? "");
  return `- [${escapeLabel(shorten(page.title, 120))}](${page.url})${description ? `: ${description}` : ""}`;
}

function groups(pages, lang, heading) {
  const out = [];
  for (const [key, name] of SECTIONS) {
    const rows = pages
      .filter((page) => page.lang === lang && page.section === key)
      .sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));
    if (rows.length) out.push(`${heading} ${lang === "en" ? `${name} (English)` : name}\n\n${rows.map(line).join("\n")}`);
  }
  return out;
}

/**
 * @param {{url: string, lang: string, section: string, title: string, description?: string}[]} pages
 * @returns {string} the file; throws when it passes MAX_BYTES
 */
export function buildLlmsTxt(pages) {
  const kept = pages.filter((page) => {
    const place = locate(page.url);
    return place && place.lang === page.lang && place.section === page.section && page.title;
  });
  const blocks = [
    HEADER.trimEnd(),
    ...groups(kept, "da", "##"),
    `## Optional\n\n${groups(kept, "en", "###").join("\n\n")}`,
    `## Feeds\n\n${FEEDS.map(([name, url]) => `- [${name}](${url})`).join("\n")}`,
  ];
  const text = `${blocks.join("\n\n")}\n`;
  const bytes = Buffer.byteLength(text);
  if (bytes > MAX_BYTES) {
    throw new Error(`llms.txt is ${Math.round(bytes / 1024)} KB, over the ${MAX_BYTES / 1024} KB limit. Shorten descriptions or leave a section out in scripts/lib/llms-txt.mjs.`);
  }
  return text;
}
