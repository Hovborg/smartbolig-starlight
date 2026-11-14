// The checks. Each one has a name, what it expects, and a run() that returns
// { ok, seen }. `seen` says what actually came back, in a few words; it never
// holds a whole header or a page, so a report cannot leak anything.

import { canonicalOf, countH1, firstLoc, itemCount, locCount, newestPubDate, priceList } from "./parse.mjs";

export const SITE = "https://smartbolig.net";
export const MIN_SITEMAP_PAGES = 300;
// The daily news issue is dated at midnight UTC. The news workflow raises its
// own alarm (`ai-news-stalled`) at 11:37 UTC on the third day without an
// issue; 84 h makes this check fail at 18:23 that day, so it is the backstop
// for a news workflow that does not run at all, not a second alarm before it.
// (/rss.xml is the guide feed; its dates follow the build, not the news.)
export const NEWS_FEED = "/da/ai/nyheder/rss.xml";
export const MAX_NEWS_AGE_HOURS = 84;
// A day of quarter-hour prices is 96 points; the endpoint itself refuses fewer than 24.
export const MIN_PRICE_POINTS = 24;
const GUIDE = "/da/home-assistant/zigbee2mqtt/";

// What public/_headers sends on every page. Only these are checked.
const STRICT_REFERRER = ["no-referrer", "same-origin", "strict-origin", "strict-origin-when-cross-origin"];
const HEADERS = [
  ["content-security-policy", (value) => value.includes("default-src")],
  // max-age=0 switches HSTS off, so it must be a number above zero.
  ["strict-transport-security", (value) => /max-age=[1-9]\d*/i.test(value)],
  // A header sent twice arrives as "nosniff, nosniff".
  ["x-content-type-options", (value) => value.split(",").every((part) => part.trim().toLowerCase() === "nosniff")],
  ["referrer-policy", (value) => STRICT_REFERRER.includes(value.trim().toLowerCase())],
];

const check = (name, expected, run) => ({ name, expected, run });
const down = (result) => ({ ok: false, seen: `request failed: ${result.error}` });
const status = (result) => `status ${result.status}`;

/** @param {{get: Function, base: string, now: Date}} context */
export function buildChecks({ get, base, now }) {
  const at = (path) => `${base}${path}`;
  // A request that failed (timeout, network) is one answer for every check.
  const fetched = (path, options, judge) => async () => {
    const result = await get(at(path), options);
    return result.error ? down(result) : judge(result);
  };

  const page = (path) =>
    check(`${path} is HTML with one h1`, "200, text/html, exactly one <h1>", fetched(path, undefined, (r) => {
      const type = r.headers.get("content-type") ?? "no content-type";
      const h1 = countH1(r.body);
      return { ok: r.status === 200 && type.includes("text/html") && h1 === 1, seen: `${status(r)}, ${type.split(";")[0]}, ${h1} <h1>` };
    }));

  return [
    page("/da/"),
    page("/en/"),
    check("/ redirects to a language", "301 or 302 to /da/ or /en/", fetched("/", { redirect: "manual" }, (r) => {
      const target = r.headers.get("location");
      const path = target ? new URL(target, base).pathname : "";
      return { ok: [301, 302].includes(r.status) && ["/da/", "/en/"].includes(path), seen: `${status(r)}, location ${path || "none"}` };
    })),
    check("Security headers on /da/", HEADERS.map(([name]) => name).join(", "), fetched("/da/", undefined, (r) => {
      const verdicts = HEADERS.map(([name, good]) => {
        const value = r.headers.get(name);
        return `${name} ${value === null ? "missing" : good(value) ? "ok" : "wrong"}`;
      });
      return { ok: r.status === 200 && verdicts.every((line) => line.endsWith(" ok")), seen: `${status(r)}; ${verdicts.join(", ")}` };
    })),
    check("/robots.txt names the sitemap", `200 and "Sitemap: ${SITE}/sitemap-index.xml"`, fetched("/robots.txt", undefined, (r) => {
      const found = r.body.includes(`Sitemap: ${SITE}/sitemap-index.xml`);
      return { ok: r.status === 200 && found, seen: `${status(r)}, sitemap line ${found ? "present" : "missing"}` };
    })),
    check("Sitemap lists enough pages", `index lists a sitemap with at least ${MIN_SITEMAP_PAGES} <loc>`, async () => {
      const index = await get(at("/sitemap-index.xml"));
      if (index.error) return down(index);
      const first = firstLoc(index.body ?? "");
      if (index.status !== 200 || !first) return { ok: false, seen: `${status(index)}, ${first ? "sitemap listed" : "no sitemap listed"}` };
      const sitemap = await get(at(new URL(first).pathname));
      if (sitemap.error) return down(sitemap);
      const count = locCount(sitemap.body);
      return { ok: sitemap.status === 200 && count >= MIN_SITEMAP_PAGES, seen: `index ok, first sitemap ${status(sitemap)}, ${count} <loc>` };
    }),
    check("/rss.xml lists the guides", "200 and at least one <item>", fetched("/rss.xml", undefined, (r) => {
      const items = itemCount(r.body);
      return { ok: r.status === 200 && items > 0, seen: `${status(r)}, ${items} <item>` };
    })),
    check("AI news is fresh", `${NEWS_FEED}: 200 and newest issue at most ${MAX_NEWS_AGE_HOURS} h old`, fetched(NEWS_FEED, undefined, (r) => {
      const newest = newestPubDate(r.body);
      if (!newest) return { ok: false, seen: `${status(r)}, no item with a date` };
      const hours = Math.round((now - newest) / 3_600_000);
      return { ok: r.status === 200 && hours <= MAX_NEWS_AGE_HOURS, seen: `${status(r)}, newest issue ${newest.toISOString().slice(0, 10)}, ${hours} h old` };
    })),
    check("/llms.txt is served", '200 and starts with "# SmartBolig.net"', fetched("/llms.txt", undefined, (r) => {
      const starts = r.body.startsWith("# SmartBolig.net");
      return { ok: r.status === 200 && starts, seen: `${status(r)}, ${starts ? "starts as expected" : "starts differently"}` };
    })),
    check("/api/chat refuses GET", "405 (the Worker answers a wrong method; no question is sent)", fetched("/api/chat", undefined, (r) => ({
      ok: r.status === 405, seen: status(r),
    }))),
    check("/api/elpris has prices for DK1", `200, area DK1 and at least ${MIN_PRICE_POINTS} price points`, fetched("/api/elpris?area=DK1", undefined, (r) => {
      const { area, points } = priceList(r.body);
      return { ok: r.status === 200 && area === "DK1" && points >= MIN_PRICE_POINTS, seen: `${status(r)}, area ${area}, ${points < 0 ? "no price list" : `${points} price points`}` };
    })),
    check("/ads.txt is served", "200 and not empty", fetched("/ads.txt", undefined, (r) => ({
      ok: r.status === 200 && r.body.trim().length > 0, seen: `${status(r)}, ${r.body.trim().length} characters`,
    }))),
    check("www redirects to the bare domain", `301 to ${SITE}/da/`, async () => {
      const r = await get("https://www.smartbolig.net/da/", { redirect: "manual" });
      if (r.error) return down(r);
      const target = r.headers.get("location") ?? "none";
      return { ok: r.status === 301 && target === `${SITE}/da/`, seen: `${status(r)}, location ${target}` };
    }),
    check(`${GUIDE} has its own canonical`, `200 and canonical ${SITE}${GUIDE}`, fetched(GUIDE, undefined, (r) => {
      const canonical = canonicalOf(r.body) ?? "none";
      return { ok: r.status === 200 && canonical === `${SITE}${GUIDE}`, seen: `${status(r)}, canonical ${canonical}` };
    })),
  ];
}
