import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { selectLatestNews } from "../src/lib/home-news.ts";

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

test("daily news automation cannot overlay origin/main with a stale local site", async () => {
  const source = await read("scripts/openclaw-ai-news-daily.sh");
  assert.match(source, /git reset --hard origin\/main/);
  assert.doesNotMatch(source, /SYNC_ITEMS=/);
  assert.doesNotMatch(source, /rsync .*SITE_ROOT/);
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

test("homepage hero has a complete responsive AVIF and WebP image family", () => {
  for (const width of [640, 960, 1440]) {
    for (const format of ["avif", "webp"]) {
      const asset = `public/images/hero/smart-home-editorial-${width}.${format}`;
      assert.ok(existsSync(new URL(`../${asset}`, import.meta.url)), `missing hero asset: ${asset}`);
    }
  }
});

test("latest-news heading keeps its eyebrow in normal layout flow", async () => {
  const styles = await read("src/components/HomeStyles.astro");
  assert.doesNotMatch(
    styles,
    /\.home-news-shell \.home-section__heading \.home-eyebrow\s*\{[^}]*position:\s*absolute/s,
  );
  assert.match(
    styles,
    /\.home-news-shell \.home-section__heading \.home-eyebrow\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/s,
  );
});

test("homepage news selector is read-only, bounded and deterministic", async () => {
  const source = await read("src/lib/home-news.ts");
  assert.match(source, /export function selectLatestNews/);
  assert.match(source, /slice\(0, limit\)/);
  assert.doesNotMatch(source, /writeFile|mkdir|rmSync|unlink|fetch\(/);
});

test("homepage news selector exposes optional editorial image metadata", () => {
  const items = selectLatestNews([
    {
      id: "da/ai/nyheder/2026-07-11",
      data: {
        title: "Concrete story",
        description: "A source-backed update.",
        date: "2026-07-11",
        heroImage: {
          src: "/images/ai-news/2026-07-11-16x9.webp",
          alt: "Concrete AI story image",
        },
      },
    },
    {
      id: "da/ai/nyheder/2026-07-10",
      data: {
        title: "Text-only story",
        description: "A valid legacy entry.",
        date: "2026-07-10",
      },
    },
  ], "da");

  assert.deepEqual(items[0].image, {
    src: "/images/ai-news/2026-07-11-16x9.webp",
    alt: "Concrete AI story image",
  });
  assert.equal(items[1].image, null);
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

test("four-guide series stays bilingual, complete and globally scoped", async () => {
  const guidePairs = [
    ["src/content/docs/da/home-assistant/thread-matter.mdx", "src/content/docs/en/home-assistant/thread-matter.mdx"],
    ["src/content/docs/da/home-assistant/local-voice-assist.mdx", "src/content/docs/en/home-assistant/local-voice-assist.mdx"],
    ["src/content/docs/da/esp32/bluetooth-proxy.mdx", "src/content/docs/en/esp32/bluetooth-proxy.mdx"],
    ["src/content/docs/da/home-assistant/energy-dashboard.mdx", "src/content/docs/en/home-assistant/energy-dashboard.mdx"],
  ];
  const sources = await Promise.all(guidePairs.flat().map(read));

  for (const source of sources) {
    assert.equal((source.match(/^title:/gm) || []).length, 1);
    assert.equal((source.match(/^description:/gm) || []).length, 1);
    assert.ok((source.match(/^## /gm) || []).length >= 5);
    assert.match(source, /## (?:Officielle kilder|Official sources)/);
    assert.match(source, /https:\/\//);
    assert.doesNotMatch(source, /^# /m);
  }

  const config = await read("astro.config.mjs");
  for (const route of [
    "/home-assistant/local-voice-assist/",
    "/esp32/bluetooth-proxy/",
    "/home-assistant/energy-dashboard/",
  ]) {
    assert.ok(config.includes(route), `missing guide route: ${route}`);
  }

  for (const source of sources.slice(0, 2)) {
    for (const term of ["matter.js", /Matter\s+1\.5\.1/, /Thread\s+1\.4/, /migrat/i, /visuali/i, /commission/i, /troubleshoot|fejlfinding/i]) {
      assert.match(source, term instanceof RegExp ? term : new RegExp(term.replace(".", "\\.")));
    }
  }
  for (const source of sources.slice(2, 4)) {
    for (const term of ["Speech-to-Phrase", "Whisper", "Piper", /expos|eksponer/i, /pipeline/i, /troubleshoot|fejlfinding/i]) {
      assert.match(source, term instanceof RegExp ? term : new RegExp(term));
    }
  }
  for (const source of sources.slice(4, 6)) {
    for (const term of ["bluetooth_proxy", "esp-idf", "connection_slots", /passive/i, /active|aktiv/i, /troubleshoot|fejlfinding/i]) {
      assert.match(source, term instanceof RegExp ? term : new RegExp(term));
    }
  }
  for (const source of sources.slice(6, 8)) {
    for (const term of [/grid|elnet/i, /solar|solceller/i, /battery|batteri/i, /gas/i, /water|vand/i, /EV|elbil/i, /long-term statistics|langtidsstatistik/i, /power.*energy|effekt.*energi/is, /troubleshoot|fejlfinding/i]) {
      assert.match(source, term);
    }
    assert.match(source, /regional(?:e)? (?:price|pris).*(?:optional|valgfr)/is);
  }

  const englishEnergy = sources[7];
  assert.doesNotMatch(englishEnergy, /Energi Data Service|\bDK1\b|\bDK2\b/);
});

test("Astro renders the guides' GitHub-flavoured Markdown tables", async () => {
  const [config, packageJson] = await Promise.all([
    read("astro.config.mjs"),
    read("package.json"),
  ]);

  assert.match(config, /import remarkGfm from ["']remark-gfm["']/);
  assert.match(config, /markdown:\s*\{[\s\S]*remarkPlugins:\s*\[remarkGfm\]/);
  assert.equal(JSON.parse(packageJson).dependencies["remark-gfm"], "^4.0.1");
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
  const packageJson = JSON.parse(await read("package.json"));
  const finalizeBuild = await read("scripts/finalize-build.mjs");
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
  assert.match(headers, /script-src[^;]*'wasm-unsafe-eval'/);
  assert.doesNotMatch(headers, /(?:^|\s)'unsafe-eval'(?:\s|;)/);
  assert.match(packageJson.scripts.build, /finalize-build\.mjs/);
  assert.match(finalizeBuild, /pagefind-worker\.js/);
  assert.match(finalizeBuild, /createHash\("sha256"\)/);
  assert.match(finalizeBuild, /public\/_headers/);
  assert.match(finalizeBuild, /SmartBolig CSP fingerprint/);
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
