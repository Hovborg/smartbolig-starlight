import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SITE, buildChecks } from "./monitor/checks.mjs";
import { USER_AGENT, createGetter } from "./monitor/http.mjs";
import { renderReport } from "./monitor/report.mjs";
import { runChecks } from "./monitor/runner.mjs";

const BASE = "https://smartbolig.net";
const NOW = new Date("2026-11-14T12:00:00Z");
const GOOD_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "content-security-policy": "default-src 'self'; script-src 'self'",
  "strict-transport-security": "max-age=31536000",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
};
const { "strict-transport-security": _hsts, ...withoutHsts } = GOOD_HEADERS;
const html = (extra = "") => `<html><head>${extra}</head><body><h1>Hej</h1></body></html>`;
const locs = (count) => Array.from({ length: count }, (_, i) => `<url><loc>${BASE}/p${i}/</loc></url>`).join("");
const rss = (date) => `<rss><channel><item><pubDate>${date}</pubDate></item></channel></rss>`;

/** The site as it should be. A test overrides one route to break one check. */
const healthy = () => ({
  "/da/": { headers: GOOD_HEADERS, body: html() },
  "/en/": { headers: GOOD_HEADERS, body: html() },
  "/": { status: 301, headers: { location: "/da/" } },
  "/robots.txt": { body: `User-agent: *\nSitemap: ${SITE}/sitemap-index.xml\n` },
  "/sitemap-index.xml": { body: `<sitemapindex><sitemap><loc>${BASE}/sitemap-0.xml</loc></sitemap></sitemapindex>` },
  "/sitemap-0.xml": { body: `<urlset>${locs(334)}</urlset>` },
  "/rss.xml": { body: rss("Sat, 14 Nov 2026 08:05:46 GMT") },
  "/da/ai/nyheder/rss.xml": { body: rss("Sat, 14 Nov 2026 00:00:00 GMT") },
  "/llms.txt": { body: "# SmartBolig.net\n" },
  "/api/chat": { status: 405 },
  "/api/elpris": { body: JSON.stringify({ area: "DK1", points: Array.from({ length: 96 }, (_, i) => [1794528000 + i * 900, 512.3]) }) },
  "/ads.txt": { body: "google.com, pub-1, DIRECT\n" },
  "https://www.smartbolig.net/da/": { status: 301, headers: { location: `${SITE}/da/` } },
  "/da/home-assistant/zigbee2mqtt/": { body: html(`<link rel="canonical" href="${SITE}/da/home-assistant/zigbee2mqtt/">`) },
});

function fakeFetch(routes) {
  const calls = [];
  const impl = async (url, options) => {
    calls.push({ url, options });
    const route = routes[url] ?? routes[new URL(url).pathname];
    if (route === undefined) return new Response("not found", { status: 404 });
    if (route instanceof Error) throw route;
    return new Response(route.body ?? "", { status: route.status ?? 200, headers: route.headers ?? { "content-type": "text/plain" } });
  };
  return { impl, calls };
}

async function run(overrides = {}) {
  const { impl, calls } = fakeFetch({ ...healthy(), ...overrides });
  const get = createGetter({ fetchImpl: impl, sleep: async () => {} });
  return { results: await runChecks(buildChecks({ get, base: BASE, now: NOW })), calls };
}
const failed = (results) => results.filter((result) => !result.ok);

test("a healthy site passes every check", async () => {
  const { results, calls } = await run();
  assert.deepEqual(failed(results), []);
  assert.equal(results.length, 14);
  assert.ok(calls.every((call) => call.options.headers["user-agent"] === USER_AGENT));
});

const BREAKS = [
  ["/da/ is HTML with one h1", { "/da/": { body: "<html><h1>a</h1><h1>b</h1></html>", headers: GOOD_HEADERS } }, /2 <h1>/],
  ["/en/ is HTML with one h1", { "/en/": { status: 500, body: "x" } }, /status 500/],
  ["/ redirects to a language", { "/": { status: 200, body: "x" } }, /status 200, location none/],
  ["Security headers on /da/", { "/da/": { body: html(), headers: withoutHsts } }, /strict-transport-security missing/],
  ["/robots.txt names the sitemap", { "/robots.txt": { body: "User-agent: *" } }, /sitemap line missing/],
  ["Sitemap lists enough pages", { "/sitemap-0.xml": { body: `<urlset>${locs(10)}</urlset>` } }, /10 <loc>/],
  ["/rss.xml lists the guides", { "/rss.xml": { body: "<rss><channel></channel></rss>" } }, /status 200, 0 <item>/],
  ["AI news is fresh", { "/da/ai/nyheder/rss.xml": { body: rss("Tue, 10 Nov 2026 00:00:00 GMT") } }, /newest issue 2026-11-10, 108 h old/],
  ["/llms.txt is served", { "/llms.txt": { body: "<html>" } }, /starts differently/],
  ["/api/chat refuses GET", { "/api/chat": { status: 200, body: "{}" } }, /status 200/],
  ["/api/elpris has prices for DK1", { "/api/elpris": { status: 502, body: '{"error":"upstream"}' } }, /status 502, area none, no price list/],
  ["/api/elpris has prices for DK1", { "/api/elpris": { body: '{"area":"DK2","points":[[1,2]]}' } }, /area DK2, 1 price points/],
  ["/ads.txt is served", { "/ads.txt": { body: "  \n" } }, /0 characters/],
  ["www redirects to the bare domain", { "https://www.smartbolig.net/da/": { status: 302, headers: { location: `${SITE}/da/` } } }, /status 302/],
  ["/da/home-assistant/zigbee2mqtt/ has its own canonical", { "/da/home-assistant/zigbee2mqtt/": { body: html(`<link rel="canonical" href="${SITE}/da/">`) } }, /canonical https:\/\/smartbolig.net\/da\/$/],
];

for (const [name, override, message] of BREAKS) {
  test(`failing check gives a readable line: ${name}`, async () => {
    const { results } = await run(override);
    const bad = failed(results);
    assert.equal(bad.length, 1, JSON.stringify(bad));
    assert.equal(bad[0].name, name);
    assert.match(bad[0].seen, message);
    assert.ok(bad[0].expected.length > 0);
  });
}

test("the news age check uses the given time: 83 h passes, 85 h fails, and the guide feed's age is not judged", async () => {
  const rssAt = (hours) => rss(new Date(NOW - hours * 3_600_000).toUTCString());
  const news = (body) => ({ "/da/ai/nyheder/rss.xml": { body } });
  assert.deepEqual(failed((await run(news(rssAt(83)))).results), []);
  assert.equal(failed((await run(news(rssAt(85)))).results).length, 1);
  assert.match(failed((await run(news("<rss></rss>"))).results)[0].seen, /no item with a date/);
  assert.deepEqual(failed((await run({ "/rss.xml": { body: rssAt(900) } })).results), [], "a guide feed built long ago is fine");
});

test("a 5xx is retried once, a 404 is not, and a second failure is the answer", async () => {
  const sleeps = [];
  let calls = 0;
  const flaky = async () => (++calls === 1 ? new Response("x", { status: 503 }) : new Response("ok"));
  const get = createGetter({ fetchImpl: flaky, sleep: async (ms) => sleeps.push(ms) });
  assert.equal((await get("https://x/")).status, 200);
  assert.deepEqual([calls, sleeps], [2, [5000]]);

  calls = 0;
  const notFound = createGetter({ fetchImpl: async () => (calls++, new Response("", { status: 404 })), sleep: async () => {} });
  assert.equal((await notFound("https://x/")).status, 404);
  assert.equal(calls, 1);

  calls = 0;
  const dead = createGetter({ fetchImpl: async () => (calls++, Promise.reject(new TypeError("fetch failed"))), sleep: async () => {} });
  assert.match((await dead("https://x/")).error, /fetch failed/);
  assert.equal(calls, 2);
});

test("a network error becomes a failing line, not a crash", async () => {
  const { results } = await run({ "/ads.txt": new Error("boom") });
  assert.match(failed(results)[0].seen, /request failed: Error: boom/);
});

test("the report has a table, names the failures and dumps no headers or bodies", async () => {
  const { results } = await run({ "/da/": { body: html(), headers: withoutHsts } });
  const report = renderReport(results, { base: BASE, at: NOW, runUrl: "https://github.com/o/r/actions/runs/1" });
  assert.match(report, /^1 of 14 checks fail on https:\/\/smartbolig\.net\./);
  assert.match(report, /\| Result \| Check \| Expected \| Seen \|\n\|---\|/);
  assert.match(report, /\| \*\*FAIL\*\* \| Security headers on \/da\/ \|/);
  assert.match(report, /2026-11-14 12:00 UTC\. Run: https:\/\/github\.com\/o\/r\/actions\/runs\/1/);
  assert.doesNotMatch(report, /default-src|max-age|nosniff|user-agent|pub-1/i);
  assert.equal(renderReport(results.map((r) => ({ ...r, ok: true })), { base: BASE, at: NOW }).split("\n")[0], "All 14 checks pass on https://smartbolig.net.");
});

test("what the site sent stays text in the report, as one short line", async () => {
  const sent = "@octocat [x](https://evil.example) #1 `code` <h1>\n::error title=x::y " + "z".repeat(500);
  const [result] = await runChecks([{ name: "a|b", expected: "exactly one <h1>", run: async () => ({ ok: false, seen: sent }) }]);
  assert.equal(result.seen.length, 240);
  assert.doesNotMatch(result.seen, /\n/, "no line of its own in the log, where '::error' would be a command");
  const row = renderReport([result], { base: BASE, at: NOW }).split("\n").find((line) => line.includes("**FAIL**"));
  assert.match(row, /\| a\\\|b \| `exactly one <h1>` \| `@octocat \[x\]\(https:\/\/evil\.example\) #1 'code' <h1> ::error/);
  assert.equal(row.split("`").length, 5, "two code spans, and nothing inside closes one early");
});

test("monitor.yml: issues write only, a schedule, concurrency, every action pinned to a SHA", () => {
  const yml = readFileSync(new URL("../.github/workflows/monitor.yml", import.meta.url), "utf8");
  const writes = [...yml.matchAll(/^\s+([\w-]+): write\s*$/gm)].map((match) => match[1]);
  assert.deepEqual(writes, ["issues"]);
  assert.match(yml, /^\s+schedule:\s*\n(?:\s+#.*\n)*\s+- cron: '\d+ \d+ \* \* \*'/m);
  // Three runs a day, so one run GitHub drops still leaves two.
  assert.deepEqual([...yml.matchAll(/- cron: '(\d+ \d+) \* \* \*'/g)].map((match) => match[1]), ["23 2", "23 10", "23 18"]);
  // A manual run can point the checks at another address to try the alarm; a scheduled run passes an empty value.
  assert.ok(yml.includes("MONITOR_BASE_URL: ${{ inputs.base }}"));
  const run = readFileSync(new URL("./monitor/run.mjs", import.meta.url), "utf8");
  assert.ok(run.includes("values.base || process.env.MONITOR_BASE_URL || SITE"), "an empty address means the live site");
  assert.match(yml, /^concurrency:\s*\n\s+group: monitor/m);
  assert.match(yml, /timeout-minutes: 15/);
  assert.match(yml, /if: \$\{\{ github\.repository == 'Hovborg\/smartbolig-starlight' \}\}/);
  assert.match(yml, /issues\?labels=monitor&state=open&creator=github-actions%5Bbot%5D/, "only the workflow's own issue is commented on and closed");
  const uses = [...yml.matchAll(/^\s+uses:\s*(\S+)/gm)].map((match) => match[1]);
  assert.ok(uses.length >= 2);
  for (const reference of uses) assert.match(reference, /^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/, reference);
});
