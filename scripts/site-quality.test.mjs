import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { selectLatestNews } from "../src/lib/home-news.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const HOME_COMPONENTS = [
  "src/components/home/HomeHero.astro",
  "src/components/home/HomeGoalNavigator.astro",
  "src/components/home/HomeFieldGuide.astro",
  "src/components/home/HomeFeaturedGuides.astro",
  "src/components/home/HomeTrustEvidence.astro",
  "src/components/home/HomeClosingCta.astro",
  "src/components/HomePortal.astro",
  "src/components/HomeLatestNews.astro",
];

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

test("homepages compose the portal orchestrator and avoid unsupported claims", async () => {
  for (const locale of ["da", "en"]) {
    const home = await read(`src/content/docs/${locale}/index.mdx`);
    assert.match(home, new RegExp(`<HomePortal locale=["']${locale}["']`));
    assert.doesNotMatch(home, /100%|0 Cloud|hver uge|every week/i);
    assert.doesNotMatch(home, /CustomHero/);
    assert.match(home, /template: splash/);
  }
});

test("homepage copy model is typed, bilingual and structurally identical", async () => {
  const { homeCopy } = await import("../src/lib/home-copy.ts");

  const shape = (value) => {
    if (Array.isArray(value)) return value.map(shape);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.keys(value).sort().map((key) => [key, shape(value[key])]));
    }
    return typeof value;
  };
  assert.deepEqual(shape(homeCopy.da), shape(homeCopy.en));

  const collectHrefs = (value, out = []) => {
    if (Array.isArray(value)) value.forEach((item) => collectHrefs(item, out));
    else if (value && typeof value === "object") Object.values(value).forEach((item) => collectHrefs(item, out));
    else if (typeof value === "string" && value.startsWith("/")) out.push(value);
    return out;
  };
  for (const locale of ["da", "en"]) {
    const hrefs = collectHrefs(homeCopy[locale]);
    assert.ok(hrefs.length >= 12, `expected a full set of ${locale} links`);
    for (const href of hrefs) {
      assert.ok(href.startsWith(`/${locale}/`), `${locale} copy has cross-locale link: ${href}`);
      assert.match(href, /\/$/, `internal link must keep trailing slash: ${href}`);
    }
  }
});

test("goal navigator keeps the five intentional routes plus a beginner track", async () => {
  const { homeCopy } = await import("../src/lib/home-copy.ts");
  for (const locale of ["da", "en"]) {
    const { navigator } = homeCopy[locale];
    const hrefs = navigator.rows.map((row) => row.href);
    for (const section of ["home-assistant", "automationer", "esp32", "produkter", "ai"]) {
      assert.ok(hrefs.includes(`/${locale}/${section}/`), `missing ${locale} route: ${section}`);
    }
    assert.equal(navigator.rows.length, 5);
    assert.equal(navigator.beginner.link.href, `/${locale}/start/`);
  }
});

test("start-route CTAs are bounded, distinct and absent from the closing section", async () => {
  const { homeCopy } = await import("../src/lib/home-copy.ts");
  const collectLinks = (value, out = []) => {
    if (Array.isArray(value)) value.forEach((item) => collectLinks(item, out));
    else if (value && typeof value === "object") {
      if (typeof value.href === "string" && typeof value.label === "string") out.push(value);
      Object.values(value).forEach((item) => collectLinks(item, out));
    }
    return out;
  };
  for (const locale of ["da", "en"]) {
    const copy = homeCopy[locale];
    const startLinks = collectLinks(copy).filter((link) => link.href === `/${locale}/start/`);
    assert.ok(startLinks.length <= 3, `too many start-route CTAs: ${startLinks.length}`);
    assert.equal(new Set(startLinks.map((link) => link.label)).size, startLinks.length, "start-route CTAs must not repeat wording");
    assert.equal(collectLinks(copy.closing).filter((link) => link.href === `/${locale}/start/`).length, 0);
    const startLabel = locale === "da" ? "Start her" : "Start here";
    assert.equal(startLinks.filter((link) => link.label === startLabel).length, 1);
    assert.equal(copy.hero.primary.label, startLabel);
  }
});

test("homepage portal is a thin orchestrator with the editorial section order", async () => {
  const [portal, pageTitle] = await Promise.all([
    read("src/components/HomePortal.astro"),
    read("src/components/PageTitle.astro"),
  ]);
  assert.match(pageTitle, /import HomeHero from/);
  assert.match(pageTitle, /<HomeHero copy=/);
  for (const component of ["HomeGoalNavigator", "HomeFieldGuide", "HomeFeaturedGuides", "HomeTrustEvidence", "HomeClosingCta"]) {
    assert.match(portal, new RegExp(`import ${component} from`), `portal must compose ${component}`);
  }
  assert.match(portal, /getHomeCopy|homeCopy\[/);
  const order = ["<HomeGoalNavigator", "<HomeFieldGuide", "<HomeFeaturedGuides", "<HomeTrustEvidence", 'slot name="editorial-news"', "<HomeClosingCta"];
  const positions = order.map((needle) => portal.indexOf(needle));
  for (const [index, position] of positions.entries()) {
    assert.ok(position >= 0, `portal missing section: ${order[index]}`);
    if (index > 0) assert.ok(position > positions[index - 1], `section out of order: ${order[index]}`);
  }
  assert.doesNotMatch(portal, /<\/?main\b/);
});

test("hero takes an explicit locale, owns the homepage h1 and keeps the responsive image contract", async () => {
  const hero = await read("src/components/home/HomeHero.astro");
  assert.doesNotMatch(hero, /Astro\.url/, "hero must use an explicit locale prop, not URL sniffing");
  assert.match(hero, /<h1 id="_top">/);
  assert.match(hero, /aria-labelledby="_top"/);
  assert.match(hero, /<picture>/);
  for (const width of [640, 960, 1440]) {
    assert.match(hero, new RegExp(`smart-home-editorial-${width}\\.avif ${width}w`));
    assert.match(hero, new RegExp(`smart-home-editorial-${width}\\.webp ${width}w`));
  }
  assert.match(hero, /width="1440"/);
  assert.match(hero, /height="810"/);
  assert.match(hero, /loading="eager"/);
  assert.match(hero, /fetchpriority="high"/);
  assert.match(hero, /decoding="async"/);
  const skipLink = await read("src/components/SkipLink.astro");
  assert.match(skipLink, /href=["']#_top["']/);
});

test("homepage hero has a complete responsive AVIF and WebP image family", () => {
  for (const width of [640, 960, 1440]) {
    for (const format of ["avif", "webp"]) {
      const asset = `public/images/hero/smart-home-editorial-${width}.${format}`;
      assert.ok(existsSync(new URL(`../${asset}`, import.meta.url)), `missing hero asset: ${asset}`);
    }
  }
});

test("homepage keeps one number series and neutralises theme list counters", async () => {
  const [navigatorSource, fieldGuide, styles] = await Promise.all([
    read("src/components/home/HomeGoalNavigator.astro"),
    read("src/components/home/HomeFieldGuide.astro"),
    read("src/components/HomeStyles.astro"),
  ]);
  assert.doesNotMatch(navigatorSource, /"0[0-9]"|__number/, "navigator rows must not carry a competing number series");
  assert.match(fieldGuide, /<ol/);
  assert.match(styles, /\.home-portal li::(?:before|marker)\s*\{[^}]*content:\s*none/s, "theme list counters must be neutralised inside the portal");
  assert.match(styles, /\.home-hero h1[^{]*\{[^}]*background:\s*none/s, "theme gradient heading must be reset in the hero");
});

test("home components stay static with no homepage-specific client JavaScript", async () => {
  for (const path of HOME_COMPONENTS) {
    const source = await read(path);
    assert.doesNotMatch(source, /<script/i, `${path} must not ship client JavaScript`);
  }
});

test("compact news module sits low on the page and defers its images", async () => {
  const news = await read("src/components/HomeLatestNews.astro");
  assert.match(news, /loading="lazy"/);
  assert.doesNotMatch(news, /loading=\{?["']?eager/, "below-the-fold news images must not be eager");
  assert.match(news, /width="\d+"/);
  assert.match(news, /height="\d+"/);
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
    assert.match(home, new RegExp(`<HomeLatestNews slot=["']editorial-news["'] locale=["']${locale}["']`));
  }
});

test("homepage keeps a single main landmark and a visible skip-link target", async () => {
  const [portal, pageTitle, themeSelect, styles, config] = await Promise.all([
    read("src/components/HomePortal.astro"),
    read("src/components/PageTitle.astro"),
    read("src/components/ThemeSelect.astro"),
    read("src/components/HomeStyles.astro"),
    read("astro.config.mjs"),
  ]);
  assert.doesNotMatch(portal, /<\/?main\b/);
  assert.match(pageTitle, /DefaultPageTitle/);
  assert.match(pageTitle, /Astro\.url\.pathname\.match/);
  assert.match(pageTitle, /\\\/\(da\|en\)\\\//);
  assert.match(pageTitle, /homepageLocale\s*\?\s*<HomeHero/);
  assert.match(config, /SkipLink:\s*["']\.\/src\/components\/SkipLink\.astro["']/);
  assert.match(config, /PageTitle:\s*["']\.\/src\/components\/PageTitle\.astro["']/);
  assert.match(themeSelect, /aria-label=\{label\}/);
  assert.match(config, /ThemeSelect:\s*["']\.\/src\/components\/ThemeSelect\.astro["']/);
  assert.match(styles, /html\[data-theme=["']light["']\]/);
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

test("six current Home Assistant guides stay bilingual and discoverable", async () => {
  const guideSlugs = [
    "automationer-2026-7",
    "overview-dashboard-2026",
    "infraroed-proxy",
    "radiofrekvens-proxy",
    "ai-task",
    "mcp-server",
  ];
  const paths = guideSlugs.flatMap((slug) => [
    `src/content/docs/da/home-assistant/${slug}.mdx`,
    `src/content/docs/en/home-assistant/${slug}.mdx`,
  ]);
  const sources = await Promise.all(paths.map(read));

  for (const source of sources) {
    assert.equal((source.match(/^title:/gm) || []).length, 1);
    assert.equal((source.match(/^description:/gm) || []).length, 1);
    assert.ok((source.match(/^## /gm) || []).length >= 5);
    assert.match(source, /## (?:Officielle kilder|Official sources)/);
    assert.match(source, /https:\/\/www\.home-assistant\.io\//);
    assert.doesNotMatch(source, /^# /m);
  }

  for (const source of sources.slice(6, 8)) {
    assert.doesNotMatch(source, /markise|awning/i);
  }
  for (const source of sources.slice(10, 12)) {
    assert.match(source, /OAuth/);
    assert.match(source, /ejerkonto|owner account/i);
    assert.match(source, /eksponeringslisten|exposure list/i);
    assert.match(source, /andre\s+Home\s+Assistant-API|other\s+Home\s+Assistant\s+APIs/i);
  }

  const [config, daHub, enHub] = await Promise.all([
    read("astro.config.mjs"),
    read("src/content/docs/da/home-assistant/index.mdx"),
    read("src/content/docs/en/home-assistant/index.mdx"),
  ]);
  for (const slug of guideSlugs) {
    const route = `/home-assistant/${slug}/`;
    assert.ok(config.includes(route), `missing sidebar route: ${route}`);
    assert.ok(daHub.includes(`/da${route}`), `missing Danish hub route: ${route}`);
    assert.ok(enHub.includes(`/en${route}`), `missing English hub route: ${route}`);
  }
});

test("six illustrated Home Assistant guides stay bilingual, natural and discoverable", async () => {
  const guideSlugs = [
    "aktivitet-og-spor",
    "sikre-opdateringer-2026",
    "zha-enhedshaandtering",
    "dashboard-kortvaelger",
    "robotstoevsuger-efter-omraade",
    "mobilnotifikationer",
  ];
  const paths = guideSlugs.flatMap((slug) => [
    `src/content/docs/da/home-assistant/${slug}.mdx`,
    `src/content/docs/en/home-assistant/${slug}.mdx`,
  ]);
  const sources = await Promise.all(paths.map(read));

  for (const [index, source] of sources.entries()) {
    const slug = guideSlugs[Math.floor(index / 2)];
    const image = `/images/guides/${slug}.webp`;
    assert.equal((source.match(/^title:/gm) || []).length, 1);
    assert.equal((source.match(/^description:/gm) || []).length, 1);
    assert.ok((source.match(/^## /gm) || []).length >= 5);
    assert.match(source, /## (?:Officielle kilder|Official sources)/);
    assert.match(source, /https:\/\/www\.home-assistant\.io\//);
    assert.ok(source.includes(`](${image})`), `missing guide image reference: ${image}`);
    assert.doesNotMatch(source, /^# /m);
    assert.doesNotMatch(
      source,
      /in today's|game[- ]changer|dive into|delve|revolutionary|i denne omfattende guide|i en verden hvor|banebrydende/i,
      "guide contains generic promotional or AI-like filler",
    );
  }

  for (const slug of guideSlugs) {
    const asset = `public/images/guides/${slug}.webp`;
    assert.ok(existsSync(new URL(`../${asset}`, import.meta.url)), `missing guide asset: ${asset}`);
  }

  for (const source of sources.slice(0, 2)) {
    assert.match(source, /Activity|Aktivitet/);
    assert.match(source, /Trace|Spor/);
    assert.match(source, /Recorder/);
  }
  for (const source of sources.slice(2, 4)) {
    assert.match(source, /Update all|Opdatér alle/);
    assert.match(source, /outside|uden for/i);
    assert.match(source, /backup/i);
  }
  for (const source of sources.slice(4, 6)) {
    assert.match(source, /ZHA/);
    assert.match(source, /OTA/);
    assert.match(source, /USB 3\.0/);
  }
  for (const source of sources.slice(6, 8)) {
    assert.match(source, /card picker|kortvælger/i);
    assert.match(source, /tile|flise/i);
    assert.match(source, /mobile|mobil/i);
  }
  for (const source of sources.slice(8, 10)) {
    assert.match(source, /vacuum\.clean_area/);
    assert.match(source, /Map vacuum segments to areas|Knyt støvsugersegmenter til områder/);
    assert.match(source, /Run actions|Kør handlinger/);
  }
  for (const source of sources.slice(10, 12)) {
    assert.match(source, /notify\.send_message/);
    assert.match(source, /group helper|gruppehjælper/i);
    assert.match(source, /not a read receipt|ikke en læsekvittering/i);
  }

  const [config, daHub, enHub] = await Promise.all([
    read("astro.config.mjs"),
    read("src/content/docs/da/home-assistant/index.mdx"),
    read("src/content/docs/en/home-assistant/index.mdx"),
  ]);
  for (const slug of guideSlugs) {
    const route = `/home-assistant/${slug}/`;
    assert.ok(config.includes(route), `missing sidebar route: ${route}`);
    assert.ok(daHub.includes(`/da${route}`), `missing Danish hub route: ${route}`);
    assert.ok(enHub.includes(`/en${route}`), `missing English hub route: ${route}`);
  }
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
  assert.doesNotMatch(head, /rel="preload"\s+as="image"/);
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
  assert.match(headers, /script-src[^;]*https:\/\/static\.cloudflareinsights\.com/);
  assert.match(headers, /connect-src[^;]*https:\/\/cloudflareinsights\.com/);
  assert.doesNotMatch(headers, /(?:^|\s)'unsafe-eval'(?:\s|;)/);
  assert.match(packageJson.scripts.build, /finalize-build\.mjs/);
  assert.match(finalizeBuild, /pagefind-worker\.js/);
  assert.match(finalizeBuild, /createHash\("sha256"\)/);
  assert.match(finalizeBuild, /public\/_headers/);
  assert.match(finalizeBuild, /SmartBolig CSP fingerprint/);
});

test("deploy runs every local quality gate before publishing", async () => {
  const workflow = await read(".github/workflows/deploy.yml");
  const wrangler = JSON.parse(await read("wrangler.jsonc"));
  const gitignore = await read(".gitignore");
  assert.match(workflow, /pull_request:\s*\n\s+branches:\s*\[main\]/);
  assert.equal((workflow.match(/github\.event_name != 'pull_request'/g) || []).length, 2);
  for (const command of [
    "npm run site:test",
    "npm run ai-news:test",
    "npm run ai-news:validate",
    "python3 scripts/content-audit.py",
    "npm run build",
    "npm run seo:validate",
    // Back on 'high' (2026-08-13). The temporary 'critical' exception from
    // 2026-07-29 covered four high advisories in astro 6.4.8's dependency tree
    // that blocked every deploy; Astro 7 removes all four. See issue #104.
    "npm audit --omit=dev --audit-level=high",
  ]) {
    assert.ok(workflow.includes(command), `missing pre-deploy gate: ${command}`);
  }

  assert.equal(wrangler.pages_build_output_dir, undefined);
  assert.equal(wrangler.main, "./.worker/index.js");
  assert.deepEqual(wrangler.assets, {
    directory: "./dist",
    binding: "ASSETS",
    run_worker_first: ["/api/*"],
    not_found_handling: "404-page",
  });
  assert.deepEqual(
    wrangler.routes.map(({ pattern }) => pattern),
    ["smartbolig.net/*", "www.smartbolig.net/*"],
  );
  assert.match(gitignore, /^\.worker\/$/m);
  assert.match(workflow, /npm run worker:build/);
  assert.match(workflow, /wrangler deploy --dry-run/);
  assert.match(workflow, /wrangler deploy(?:\s|$)/);
  assert.doesNotMatch(workflow, /wrangler pages deploy/);
});

test("static redirect rules stay before dynamic rules for Workers limits", async () => {
  const redirectLines = (await read("public/_redirects"))
    .split("\n")
    .map((line) => line.replace(/\s+#.*$/, "").trim())
    .filter((line) => line && !line.startsWith("#"));

  let sawDynamicRule = false;
  let staticRules = 0;
  let dynamicRules = 0;

  for (const line of redirectLines) {
    const [source] = line.split(/\s+/);
    const isDynamic = source.includes("*") || /:[A-Za-z][A-Za-z0-9_]*/.test(source);
    if (isDynamic) {
      sawDynamicRule = true;
      dynamicRules += 1;
      continue;
    }

    assert.equal(
      sawDynamicRule,
      false,
      `static redirect appears after a dynamic redirect and would consume the 100-rule dynamic quota: ${line}`,
    );
    staticRules += 1;
  }

  assert.ok(staticRules <= 2_000, `static redirect limit exceeded: ${staticRules}`);
  assert.ok(dynamicRules <= 100, `dynamic redirect limit exceeded: ${dynamicRules}`);
});
