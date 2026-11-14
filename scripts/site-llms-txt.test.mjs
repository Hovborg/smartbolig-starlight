import assert from "node:assert/strict";
import test from "node:test";
import { headOf } from "./lib/llms-pages.mjs";
import { MAX_BYTES, buildLlmsTxt, locate, shorten, unknownAreas } from "./lib/llms-txt.mjs";
import { checkLlmsTxt } from "./lib/seo-llms-check.mjs";

const O = "https://smartbolig.net";
const page = (path, title = `Titel ${path}`, description = "Kort beskrivelse.") => ({
  url: `${O}${path}`,
  ...locate(`${O}${path}`),
  title,
  description,
});
const sample = () => [
  page("/en/ai/"),
  page("/da/ai/"),
  page("/da/ai/nyheder/"),
  page("/da/ai/nyheder/2026-11-14/"),
  page("/da/juridisk/privatlivspolitik/"),
  page("/en/home-assistant/"),
  page("/da/home-assistant/zigbee2mqtt/"),
  page("/da/home-assistant/"),
  page("/da/"),
  page("/da/esp32/"),
  page("/da/produkter/"),
  page("/da/sikkerhed/"),
  page("/da/automationer/"),
];
const headings = (text) => [...text.matchAll(/^(#{2,3}) (.+)$/gm)].map((match) => match[2]);

test("sections come in the fixed order, Danish first, then Optional, then Feeds", () => {
  const text = buildLlmsTxt(sample());
  assert.deepEqual(headings(text), [
    "Start", "Home Assistant", "Automationer", "ESP32", "Produkter", "Sikkerhed", "AI",
    "Optional", "Home Assistant (English)", "AI (English)", "Feeds",
  ]);
  assert.ok(text.startsWith("# SmartBolig.net\n\n> "));
  assert.match(text, /bulk training\/dataset collection is\nnot permitted/);
});

test("pages are sorted by address inside a section", () => {
  const text = buildLlmsTxt(sample());
  assert.ok(text.indexOf("/da/home-assistant/)") < text.indexOf("/da/home-assistant/zigbee2mqtt/)"));
});

test("daily news issues and legal pages are left out, the news overview stays", () => {
  const text = buildLlmsTxt(sample());
  assert.doesNotMatch(text, /2026-11-14/);
  assert.doesNotMatch(text, /juridisk\/privatlivspolitik/);
  assert.match(text, /\/da\/ai\/nyheder\/\)/);
  assert.equal(locate(`${O}/da/juridisk/`), null);
  assert.equal(locate(`${O}/404/`), null);
  assert.deepEqual(locate(`${O}/en/om-os/`), { lang: "en", section: "start" });
});

test("a page that the sitemap lists under another language or section is not trusted blindly", () => {
  const wrong = { ...page("/da/esp32/"), section: "ai" };
  assert.doesNotMatch(buildLlmsTxt([wrong]), /esp32/);
});

test("titles lose the site name, entities are decoded and brackets are escaped", () => {
  const head = headOf('<title>Tom &amp; Jerry [x] | SmartBolig.net</title><meta name="description" content="A &quot;fine&quot;\n guide">');
  assert.deepEqual(head, { title: "Tom & Jerry [x]", description: 'A "fine" guide' });
  const text = buildLlmsTxt([{ ...page("/da/esp32/"), ...head }]);
  assert.match(text, /- \[Tom & Jerry \\\[x\\\]\]\(https:\/\/smartbolig\.net\/da\/esp32\/\): A "fine" guide/);
});

test("a description is cut at a word boundary to at most 160 characters", () => {
  const long = "ord ".repeat(80);
  const short = shorten(long);
  assert.ok([...short].length <= 160);
  assert.ok(short.endsWith("ord…"));
  assert.equal(shorten("Kort."), "Kort.");
  assert.ok([...shorten("x".repeat(400))].length <= 160);
  assert.equal(shorten("æ".repeat(160)), "æ".repeat(160));
});

test("two builds from the same pages give the same bytes, whatever the input order", () => {
  const first = buildLlmsTxt(sample());
  assert.equal(buildLlmsTxt([...sample()].reverse()), first);
});

test("a file over 100 KB fails the build with a clear message", () => {
  const many = Array.from({ length: 900 }, (_, index) =>
    page(`/da/home-assistant/side-${index}/`, "T".repeat(110), "Ord ".repeat(60)),
  );
  assert.throws(() => buildLlmsTxt(many), new RegExp(`over the ${MAX_BYTES / 1024} KB limit`));
});

test("the check after a build accepts the file and names a link outside the sitemap", () => {
  const pages = sample();
  const text = buildLlmsTxt(pages);
  const sitemap = pages.map((entry) => entry.url);
  assert.deepEqual(checkLlmsTxt(text, sitemap), []);
  assert.match(checkLlmsTxt(text, sitemap.slice(1)).join("\n"), /not in the sitemap/);
  assert.match(checkLlmsTxt(undefined, sitemap).join("\n"), /missing/);
  assert.match(checkLlmsTxt("# Other\n", sitemap).join("\n"), /must start with/);
});

test("an area the file does not know is named, so the build can stop", () => {
  const urls = ["/da/", "/da/start/", "/da/juridisk/cookiepolitik/", "/da/ai/nyheder/2026-11-14/", "/en/home-assistant/zigbee2mqtt/"].map((path) => `${O}${path}`);
  assert.deepEqual(unknownAreas(urls), []);
  assert.deepEqual(unknownAreas([...urls, `${O}/da/vaerktoejer/`]), [], "a single page under the language is a start page");
  assert.deepEqual(unknownAreas([...urls, `${O}/da/vaerktoejer/elpris/`, `${O}/en/vaerktoejer/elpris/`, `${O}/da/blog/a/`]), ["blog", "vaerktoejer"]);
});
