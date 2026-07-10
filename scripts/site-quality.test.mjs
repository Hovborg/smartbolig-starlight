import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Node-RED function examples remain directly pasteable", async () => {
  for (const locale of ["da", "en"]) {
    const source = await read(`src/content/docs/${locale}/home-assistant/node-red.mdx`);
    assert.match(source, /^return msg;$/m);
  }
});

test("content audit understands Node-RED snippets and fails on real issues", async () => {
  const source = await read("scripts/content-audit.py");
  assert.match(source, /function __node_red_example__\(\)/);
  assert.match(source, /return 1 if total else 0/);
});

test("daily news automation keeps append-only content and image boundaries", async () => {
  const source = await read("scripts/openclaw-ai-news-daily.sh");
  for (const path of [
    "src/content/docs/da/ai/nyheder",
    "src/content/docs/en/ai/nyheder",
    "public/images/ai-news",
  ]) {
    assert.ok(source.includes(path), `missing protected path: ${path}`);
  }
  assert.ok(source.includes("Append-only content dirs"));
});

test("homepages use the shared portal and avoid unsupported claims", async () => {
  for (const locale of ["da", "en"]) {
    const home = await read(`src/content/docs/${locale}/index.mdx`);
    assert.match(home, new RegExp(`<HomePortal locale=["']${locale}["']`));
    assert.doesNotMatch(home, /100%|0 Cloud|hver uge|every week/i);
    assert.equal((home.match(/<CustomHero/g) || []).length, 1);
  }
});

test("shared portal exposes five intentional paths", async () => {
  const portal = await read("src/components/HomePortal.astro");
  for (const key of ["home-assistant", "automationer", "esp32", "produkter", "ai"]) {
    assert.ok(portal.includes(`key: "${key}"`), `missing portal path: ${key}`);
  }
});

test("homepage keeps a single main landmark and a visible skip-link target", async () => {
  const [portal, skipLink, themeSelect, styles, config] = await Promise.all([
    read("src/components/HomePortal.astro"),
    read("src/components/SkipLink.astro"),
    read("src/components/ThemeSelect.astro"),
    read("src/components/HomeStyles.astro"),
    read("astro.config.mjs"),
  ]);
  assert.doesNotMatch(portal, /<\/?main\b/);
  assert.match(skipLink, /home-hero-title/);
  assert.match(skipLink, /["']_top["']/);
  assert.match(config, /SkipLink:\s*["']\.\/src\/components\/SkipLink\.astro["']/);
  assert.match(themeSelect, /aria-label=\{label\}/);
  assert.match(config, /ThemeSelect:\s*["']\.\/src\/components\/ThemeSelect\.astro["']/);
  assert.match(styles, /html\[data-theme=["']light["']\]/);
});

test("homepage hero uses factual bilingual defaults without duplicate statistics", async () => {
  const hero = await read("src/components/CustomHero.astro");
  assert.match(hero, /Independent, practical guides/);
  assert.match(hero, /Uafhængige, praktiske guides/);
  assert.doesNotMatch(hero, /home-hero__stats|100%|0 Cloud|every week|hver uge/i);
});

test("homepage news selector is read-only, bounded and deterministic", async () => {
  const source = await read("src/lib/home-news.ts");
  assert.match(source, /export function selectLatestNews/);
  assert.match(source, /slice\(0, limit\)/);
  assert.doesNotMatch(source, /writeFile|mkdir|rmSync|unlink|fetch\(/);
});

test("homepage news component links to archive and RSS in both locales", async () => {
  const source = await read("src/components/HomeLatestNews.astro");
  for (const href of [
    "/da/ai/nyheder/",
    "/en/ai/nyheder/",
    "/da/ai/nyheder/rss.xml",
    "/en/ai/news/rss.xml",
  ]) {
    assert.ok(source.includes(href), `missing news destination: ${href}`);
  }
});

test("both homepages compose the isolated latest-news component", async () => {
  for (const locale of ["da", "en"]) {
    const home = await read(`src/content/docs/${locale}/index.mdx`);
    assert.match(home, /import HomeLatestNews/);
    assert.match(home, new RegExp(`<HomeLatestNews slot=["']latest-news["'] locale=["']${locale}["']`));
  }
});

test("start pages have matching six-step journeys", async () => {
  const [da, en] = await Promise.all([
    read("src/content/docs/da/start.mdx"),
    read("src/content/docs/en/start.mdx"),
  ]);
  assert.equal((da.match(/<Card title=/g) || []).length, 6);
  assert.equal((en.match(/<Card title=/g) || []).length, 6);
  for (const source of [da, en]) {
    assert.match(source, /home-assistant/);
    assert.match(source, /backup-sikkerhed/);
    assert.doesNotMatch(source, /^# /m);
    assert.doesNotMatch(source, /target=["']_blank/);
  }
});

test("start-page actions use locale-correct canonical routes", async () => {
  const da = await read("src/content/docs/da/start.mdx");
  const en = await read("src/content/docs/en/start.mdx");
  assert.match(da, /\/da\/home-assistant\/kom-godt-i-gang\//);
  assert.match(en, /\/en\/home-assistant\/kom-godt-i-gang\//);
  assert.doesNotMatch(da, /\/en\//);
  assert.doesNotMatch(en, /\/da\//);
});

test("head metadata treats start pages as pages and preserves AI news schema", async () => {
  const head = await read("src/components/Head.astro");
  assert.match(head, /const isStartPage =/);
  assert.match(head, /!isStartPage/);
  for (const invariant of ["NewsArticle", "citation", "datePublished", "aiNewsRssHref"]) {
    assert.ok(head.includes(invariant), `missing AI news schema invariant: ${invariant}`);
  }
});

test("Cloudflare headers retain the security contract", async () => {
  const headers = await read("public/_headers");
  for (const value of [
    "Strict-Transport-Security: max-age=31536000; includeSubDomains; preload",
    "X-Content-Type-Options: nosniff",
    "Referrer-Policy: strict-origin-when-cross-origin",
    "Permissions-Policy:",
    "Content-Security-Policy:",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
  ]) {
    assert.ok(headers.includes(value), `missing security header invariant: ${value}`);
  }
});

test("deploy runs every local quality gate before publishing", async () => {
  const workflow = await read(".github/workflows/deploy.yml");
  assert.match(workflow, /pull_request:\s*\n\s+branches:\s*\[main\]/);
  assert.equal((workflow.match(/github\.event_name != 'pull_request'/g) || []).length, 2);
  for (const command of [
    "npm run site:test",
    "npm run ai-news:test",
    "npm run ai-news:validate",
    "python3 scripts/content-audit.py",
    "npm run build",
    "npm run seo:validate",
    "npm audit --omit=dev --audit-level=high",
  ]) {
    assert.ok(workflow.includes(command), `missing pre-deploy gate: ${command}`);
  }
});
