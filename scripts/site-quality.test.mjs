import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { selectLatestNews } from "../src/lib/home-news.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
// The sidebar lives in config/sidebar/ (one file per section); concatenate them all.
const readSidebarConfig = async (dir = "config/sidebar") => {
  const entries = await readdir(new URL(`../${dir}/`, import.meta.url), { withFileTypes: true });
  const parts = await Promise.all(entries.map((e) => (e.isDirectory() ? readSidebarConfig(`${dir}/${e.name}`) : read(`${dir}/${e.name}`))));
  return parts.join("\n");
};

// Homepage styles live in src/styles/home/ (one file per area); concatenate them all.
const readHomeStyles = async () => {
  const names = (await readdir(new URL("../src/styles/home/", import.meta.url))).filter((name) => name.endsWith(".css")).sort();
  return (await Promise.all(names.map((name) => read(`src/styles/home/${name}`)))).join("\n");
};

const HOME_COMPONENTS = [
  "src/components/home/HomeHero.astro",
  "src/components/home/HomeStage.astro",
  "src/components/home/HomeTour.astro",
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
  const order = ["<HomeGoalNavigator", "<HomeFieldGuide", "<HomeFeaturedGuides", 'slot name="editorial-news"', "<HomeTrustEvidence", "<HomeClosingCta"];
  const positions = order.map((needle) => portal.indexOf(needle));
  for (const [index, position] of positions.entries()) {
    assert.ok(position >= 0, `portal missing section: ${order[index]}`);
    if (index > 0) assert.ok(position > positions[index - 1], `section out of order: ${order[index]}`);
  }
  assert.doesNotMatch(portal, /<\/?main\b/);
});

test("hero takes an explicit locale and owns the homepage h1", async () => {
  const hero = await read("src/components/home/HomeHero.astro");
  assert.doesNotMatch(hero, /Astro\.url/, "hero must use an explicit locale prop, not URL sniffing");
  assert.match(hero, /<h1 id="_top">/);
  assert.match(hero, /aria-labelledby="_top"/);
  for (const part of ["HomeStage", "HomeTour", "HomeHouseScript"]) {
    assert.match(hero, new RegExp(`<${part}\\b`), `hero must compose ${part}`);
  }
  const skipLink = await read("src/components/SkipLink.astro");
  assert.match(skipLink, /href=["']#_top["']/);
});

test("the 3D house starts as a still picture: the largest picture on the page, in every size", async () => {
  const stage = await read("src/components/home/HomeStage.astro");
  assert.match(stage, /<picture>/);
  assert.match(stage, /\[640, 960, 1440\]/);
  assert.match(stage, /house-evening-\$\{width\}\.\$\{format\} \$\{width\}w/);
  for (const format of ["avif", "webp"]) assert.match(stage, new RegExp(`srcset\\("${format}"\\)`));
  assert.match(stage, /width="1440"/);
  assert.match(stage, /height="1080"/);
  assert.match(stage, /loading="eager"/);
  assert.match(stage, /fetchpriority="high"/, "the still picture is the LCP element");
  assert.match(stage, /decoding="async"/);
  assert.match(stage, /alt=\{copy\.imageAlt\}/);
  for (const width of [640, 960, 1440]) {
    for (const format of ["avif", "webp"]) {
      const asset = `public/images/home/house-evening-${width}.${format}`;
      assert.ok(existsSync(new URL(`../${asset}`, import.meta.url)), `missing still picture: ${asset}`);
    }
  }
});

test("every picture rendered from the 3D house exists in every size and is used", async () => {
  const { PICTURES, pictureFolder } = await import("./house-posters.mjs");
  const { homeCopy } = await import("../src/lib/home-copy.ts");
  for (const picture of PICTURES) {
    for (const width of picture.widths) {
      for (const format of ["avif", "webp"]) {
        const asset = `public/${pictureFolder(picture)}/${picture.name}-${width}.${format}`;
        assert.ok(existsSync(new URL(`../${asset}`, import.meta.url)), `missing picture: ${asset} (run npm run house:posters)`);
      }
    }
  }
  const names = PICTURES.map((picture) => picture.name);
  for (const locale of ["da", "en"]) {
    for (const row of homeCopy[locale].navigator.rows) {
      assert.ok(names.includes(`topic-${row.id}`), `${locale}: no picture for topic ${row.id}`);
    }
  }
  const navigatorSource = await read("src/components/home/HomeGoalNavigator.astro");
  assert.match(navigatorSource, /loading="lazy"/, "topic pictures are below the fold");
  assert.match(navigatorSource, /alt=""/, "topic pictures are decoration; the card has its own text");
});

test("every guide opens with a picture that exists, and news issues keep their own", async () => {
  const { PICTURES } = await import("./house-posters.mjs");
  const { GUIDE_ARTS, GUIDE_ART_NAMES, guideArt, guideSection } = await import("../src/lib/guide-art.mjs");
  const rendered = PICTURES.filter((picture) => picture.folder === "guide").map((picture) => picture.name).sort();
  assert.deepEqual(rendered, GUIDE_ART_NAMES.map((name) => `guide-${name}`).sort(), "guide-art.mjs and house-posters.mjs must list the same pictures");
  for (const name of GUIDE_ART_NAMES) {
    assert.ok(GUIDE_ARTS[name]?.da && GUIDE_ARTS[name]?.en, `guide picture ${name} needs alternative text in both languages`);
  }
  assert.equal(guideArt("ai/nyheder/2026-11-14"), null);
  assert.equal(guideArt("ai/nyheder"), null, "the news overview opens with the newest article's picture");
  assert.equal(guideArt("ai/ai-cli").name, "guide-ai");
  assert.equal(guideArt("esp32/led-strip").name, "guide-diy");
  assert.equal(guideArt("home-assistant/zigbee2mqtt").name, "guide-network");
  assert.equal(guideArt("kontakt").name, "guide-overview");
  assert.equal(guideArt("home-assistant/energy-dashboard", "en").alt, GUIDE_ARTS.energy.en);
  assert.deepEqual(guideSection("esp32/led-strip", "en"), { label: "ESP32 & ESPHome", href: "/en/esp32/" });
  assert.equal(guideSection("esp32"), null);
  const { hasLeadPicture } = await import("../src/lib/guide-art.mjs");
  assert.equal(hasLeadPicture("import x from 'y';\n\n![LED strip](/images/guides/led.png)\n\nText"), true);
  assert.equal(hasLeadPicture("Text without a picture.\n\n## Heading"), false);

  const [head, pageTitle] = await Promise.all([read("src/components/guide/GuideHead.astro"), read("src/components/PageTitle.astro")]);
  assert.match(head, /<h1 id="_top">/);
  assert.match(head, /width="1600"\s+height="640"/, "a fixed size keeps the page from jumping when the picture arrives");
  assert.match(head, /fetchpriority="high"/);
  assert.match(pageTitle, /<GuideHead \/>/);
});

test("the footer links to pages that exist, in both languages", async () => {
  const { siteFooter, YOUTUBE_URL } = await import("../src/lib/site-footer.mjs");
  for (const locale of ["da", "en"]) {
    const footer = siteFooter(locale);
    const links = [...footer.columns.flatMap((column) => column.links), ...footer.legal];
    assert.ok(links.length >= 14, `${locale}: expected the full footer`);
    for (const link of links.filter((item) => !item.external && !item.href.endsWith(".xml"))) {
      assert.ok(link.href.startsWith(`/${locale}/`), `${locale} footer has a cross-language link: ${link.href}`);
      const base = `src/content/docs${link.href.replace(/\/$/, "")}`;
      const found = [`${base}.mdx`, `${base}.md`, `${base}/index.mdx`, `${base}/index.md`].some((path) => existsSync(new URL(`../${path}`, import.meta.url)));
      assert.ok(found, `footer links to a page that does not exist: ${link.href}`);
    }
    assert.ok(links.some((link) => link.href === YOUTUBE_URL && link.external));
    assert.ok(links.some((link) => link.href === (locale === "da" ? "/rss.xml" : "/en/rss.xml")));
  }
  const source = await read("src/components/Footer.astro");
  assert.match(source, /siteFooter\(locale\)/);
  assert.match(source, /class="legal-links"/, "print.css hides the legal links by this class");
});

test("headings are shown without a leading emoji", async () => {
  const { stripLeadingEmoji, rehypePlainHeadings } = await import("../config/markdown/plain-headings.mjs");
  assert.equal(stripLeadingEmoji("\u{1F4CB} Forudsætninger"), "Forudsætninger");
  assert.equal(stripLeadingEmoji("\u{1F6E0}\uFE0F Værktøj"), "Værktøj");
  assert.equal(stripLeadingEmoji("\u{1F468}\u200D\u{1F4BB} Kode"), "Kode");
  assert.equal(stripLeadingEmoji("Trin 1: Installation"), "Trin 1: Installation");
  assert.equal(stripLeadingEmoji("5 GHz og 2,4 GHz"), "5 GHz og 2,4 GHz");
  const tree = { type: "root", children: [
    { type: "element", tagName: "h2", children: [{ type: "text", value: "\u{1F680} Næste skridt" }] },
    { type: "element", tagName: "p", children: [{ type: "text", value: "\u{2705} Færdig" }] },
  ] };
  rehypePlainHeadings()(tree);
  assert.equal(tree.children[0].children[0].value, "Næste skridt");
  assert.equal(tree.children[1].children[0].value, "\u{2705} Færdig", "only headings change");
  assert.match(await read("astro.config.mjs"), /rehypePlugins: \[rehypePlainHeadings\b/);
});

test("the sidebar opens on the section the reader is in", async () => {
  const { scopeSidebar } = await import("../src/lib/sidebar-scope.mjs");
  const link = (href, isCurrent = false) => ({ type: "link", label: href, href, isCurrent });
  const group = (label, entries) => ({ type: "group", label, entries, collapsed: false });
  const sidebar = (current) => [
    group("Home Assistant", [link("/da/home-assistant/", current === "ha"), group("Installation", [link("/da/home-assistant/docker/", current === "docker")])]),
    group("AI", [link("/da/ai/"), link("/da/ai/nyheder/")]),
    group("Produkter", [link("/da/produkter/", current === "produkter")]),
  ];

  const products = scopeSidebar(sidebar("produkter"), "/da/produkter/");
  assert.deepEqual(products.map((entry) => entry.label), ["Produkter", "Home Assistant", "AI"]);
  assert.deepEqual(products.map((entry) => entry.collapsed), [false, true, true]);

  const nested = scopeSidebar(sidebar("docker"), "/da/home-assistant/docker/");
  assert.equal(nested[0].label, "Home Assistant");
  assert.equal(nested[0].entries[1].collapsed, false, "groups inside the section keep their own state");

  const issue = scopeSidebar(sidebar(), "/da/ai/nyheder/2026-11-14/");
  assert.equal(issue[0].label, "AI", "a news issue belongs to the news page above it");
  assert.equal(issue[0].collapsed, false);

  const outside = scopeSidebar(sidebar(), "/da/start/");
  assert.deepEqual(outside.map((entry) => entry.label), ["Home Assistant", "AI", "Produkter"]);
  assert.ok(outside.every((entry) => entry.collapsed), "no section is open on a page outside them");

  const original = sidebar("produkter");
  scopeSidebar(original, "/da/produkter/");
  assert.equal(original[0].collapsed, false, "the sidebar it was given is left unchanged");

  assert.match(await read("config/site.mjs"), /routeMiddleware: "\.\/src\/route-data\.ts"/);
  assert.match(await read("src/route-data.ts"), /scopeSidebar\(route\.sidebar, context\.url\.pathname\)/);
});

test("tables scroll sideways in a wrapper that can take keyboard focus", async () => {
  const { rehypeTableScroll } = await import("../config/markdown/table-scroll.mjs");
  const table = () => ({ type: "element", tagName: "table", properties: {}, children: [] });
  const tree = { type: "root", children: [
    table(),
    { type: "element", tagName: "blockquote", properties: {}, children: [table()] },
    { type: "element", tagName: "p", properties: {}, children: [{ type: "text", value: "tekst" }] },
  ] };
  rehypeTableScroll()(tree, { path: "/repo/src/content/docs/en/produkter/index.mdx" });
  const wrapper = tree.children[0];
  assert.equal(wrapper.tagName, "div");
  assert.deepEqual(wrapper.properties.className, ["table-scroll"]);
  assert.equal(wrapper.properties.tabIndex, 0);
  assert.equal(wrapper.properties.ariaLabel, "Table");
  assert.equal(wrapper.children[0].tagName, "table");
  assert.equal(tree.children[1].children[0].properties.className[0], "table-scroll", "nested tables are wrapped too");
  assert.equal(tree.children[2].tagName, "p");
  const danish = { type: "root", children: [table()] };
  rehypeTableScroll()(danish, { path: "C:\\repo\\src\\content\\docs\\da\\produkter\\index.mdx" });
  assert.equal(danish.children[0].properties.ariaLabel, "Tabel");
  assert.match(await read("astro.config.mjs"), /rehypePlugins: \[rehypePlainHeadings, rehypeTableScroll\]/);
  assert.match(await read("src/styles/content/blocks.css"), /\.table-scroll\s*\{[^}]*overflow-x:\s*auto/);
});

test("cards and tabs are shown without a leading emoji", async () => {
  const { remarkPlainLabels } = await import("../config/markdown/plain-labels.mjs");
  const attribute = (name, value) => ({ type: "mdxJsxAttribute", name, value });
  const tree = { type: "root", children: [
    { type: "mdxJsxFlowElement", name: "Tabs", attributes: [], children: [
      { type: "mdxJsxFlowElement", name: "TabItem", attributes: [attribute("label", "\u{1F4F1} Via UI")], children: [] },
    ] },
    { type: "mdxJsxFlowElement", name: "Card", attributes: [attribute("title", "\u{1F6E0}️ Værktøj"), attribute("icon", "setting")], children: [] },
    { type: "mdxJsxFlowElement", name: "LinkCard", attributes: [attribute("title", "\u{1F680} Start"), attribute("description", "\u{2705} Klar")], children: [] },
    { type: "mdxJsxFlowElement", name: "Aside", attributes: [attribute("title", "\u{26A0}️ Pas på")], children: [] },
  ] };
  remarkPlainLabels()(tree);
  assert.equal(tree.children[0].children[0].attributes[0].value, "Via UI");
  assert.equal(tree.children[1].attributes[0].value, "Værktøj");
  assert.equal(tree.children[2].attributes[0].value, "Start");
  assert.equal(tree.children[2].attributes[1].value, "\u{2705} Klar", "only the title changes");
  assert.equal(tree.children[3].attributes[0].value, "\u{26A0}️ Pas på", "other components are left alone");
  assert.match(await read("astro.config.mjs"), /remarkPlugins: \[remarkGfm, remarkPlainLabels\]/);
});

test("the 3D library loads on demand and the controls work without it", async () => {
  const [stage, controller, script] = await Promise.all([
    read("src/lib/home-house-stage.mjs"),
    read("src/lib/home-house.mjs"),
    read("src/components/home/HomeHouseScript.astro"),
  ]);
  assert.match(stage, /import\("\.\/house3d\/index\.mjs"\)/, "three.js must stay out of the first page load");
  assert.doesNotMatch(stage + controller + script, /from ["']three/);
  assert.match(stage, /saveData/, "data-saving visitors must not get the model unasked");
  assert.match(controller, /homeMotion !== "on"/, "the day only passes by itself while motion is on");
  const markup = await read("src/components/home/HomeStage.astro");
  for (const hook of ["data-house-spots hidden", "data-house-turn hidden", "data-house-modes hidden"]) {
    assert.ok(markup.includes(hook), `control must stay hidden until the script runs: ${hook}`);
  }
});

test("the tour, the hotspots and the 3D house agree on chapters and times of day", async () => {
  const { homeCopy } = await import("../src/lib/home-copy.ts");
  const { modes, views } = await import("../src/lib/house3d/modes.mjs");
  for (const locale of ["da", "en"]) {
    const { tour, stage, scene } = homeCopy[locale].hero;
    assert.deepEqual(scene.modes.map((mode) => mode.id).sort(), Object.keys(modes).sort());
    for (const chapter of tour.chapters) {
      assert.ok(views[chapter.id], `${locale}: no camera view for chapter ${chapter.id}`);
      assert.ok(modes[chapter.mode], `${locale}: no time of day ${chapter.mode}`);
      assert.match(chapter.time, /^\d\d:\d\d$/);
    }
    const chapterIds = tour.chapters.map((chapter) => chapter.id);
    for (const spot of stage.spots.filter((item) => item.href.startsWith("#"))) {
      assert.ok(chapterIds.includes(spot.href.replace("#tour-", "")), `${locale}: hotspot ${spot.id} points at a missing chapter`);
    }
  }
});

test("every internal link in the homepage copy leads to a page that exists", async () => {
  const { homeCopy } = await import("../src/lib/home-copy.ts");
  const collect = (value, out = []) => {
    if (Array.isArray(value)) value.forEach((item) => collect(item, out));
    else if (value && typeof value === "object") Object.values(value).forEach((item) => collect(item, out));
    else if (typeof value === "string" && value.startsWith("/")) out.push(value);
    return out;
  };
  for (const href of new Set([...collect(homeCopy.da), ...collect(homeCopy.en)])) {
    const base = `src/content/docs${href.replace(/\/$/, "")}`;
    const found = [`${base}.mdx`, `${base}.md`, `${base}/index.mdx`, `${base}/index.md`].some((path) => existsSync(new URL(`../${path}`, import.meta.url)));
    assert.ok(found, `homepage links to a page that does not exist: ${href}`);
  }
});

test("homepage keeps one number series and neutralises theme list counters", async () => {
  const [navigatorSource, fieldGuide, styles] = await Promise.all([
    read("src/components/home/HomeGoalNavigator.astro"),
    read("src/components/home/HomeFieldGuide.astro"),
    readHomeStyles(),
  ]);
  assert.doesNotMatch(navigatorSource, /"0[0-9]"|__number/, "navigator rows must not carry a competing number series");
  assert.match(fieldGuide, /<ol/);
  assert.match(styles, /\.home-portal li::(?:before|marker)\s*\{[^}]*content:\s*none/s, "theme list counters must be neutralised inside the portal");
  assert.match(styles, /\.home-hero h1[^{]*\{[^}]*background:\s*none/s, "theme gradient heading must be reset in the hero");
});

test("editorial home components stay static with motion owned by the separate controller", async () => {
  for (const path of HOME_COMPONENTS) {
    const source = await read(path);
    assert.doesNotMatch(source, /<script/i, `${path} must not ship client JavaScript`);
  }
});

test("homepage news module defers its below-hero images", async () => {
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
    readHomeStyles(),
    read("config/components.mjs"),
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
  assert.match(styles, /var\(--sb-bg-subtle\)/, "homepage must use the design tokens, which follow the active theme");
  assert.match(styles, /var\(--sb-ink-strong\)/, "homepage must use the design tokens, which follow the active theme");
  assert.doesNotMatch(styles, /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\(/i, "homepage styles must not hard-code colours");
  assert.doesNotMatch(styles, /--sl-color-|--home-(?:bg|panel|line|text|muted|accent)\b/, "homepage must not keep its own colour aliases");
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

  const config = await readSidebarConfig();
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
    readSidebarConfig(),
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
    readSidebarConfig(),
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
  assert.match(config, /markdown:\s*\{[\s\S]*remarkPlugins:\s*\[remarkGfm\b/);
  assert.equal(JSON.parse(packageJson).dependencies["remark-gfm"], "^4.0.1");
});

test("head metadata treats start pages as pages and preserves AI news schema", async () => {
  // Head.astro is a thin component; the page-type and schema logic lives in src/lib/seo/.
  const seoFiles = (await readdir(new URL("../src/lib/seo/", import.meta.url))).filter((name) => name.endsWith(".ts")).sort();
  const head = (await Promise.all(["src/components/Head.astro", ...seoFiles.map((name) => `src/lib/seo/${name}`)].map(read))).join("\n");
  assert.match(head, /isStartPage:\s*\//);
  assert.match(head, /!kind\.isStartPage/);
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
  // One definition of "this run publishes", used by exactly the two publishing
  // steps. A pull request or a manual run can never satisfy it.
  assert.ok(workflow.includes("SHOULD_DEPLOY: ${{ github.ref == 'refs/heads/main' && (github.event_name == 'push' || inputs.publish == true) }}"));
  assert.equal((workflow.match(/if: env\.SHOULD_DEPLOY == 'true'/g) || []).length, 2);
  assert.equal((workflow.match(/SHOULD_DEPLOY/g) || []).length, 3);
  // A call for a commit that is no longer the tip of main publishes nothing.
  assert.equal((workflow.match(/if: env\.SHOULD_DEPLOY == 'true' && \(inputs\.publish != true \|\| steps\.tip\.outputs\.current == 'true'\)/g) || []).length, 2);
  assert.match(workflow, /id: tip\r?\n\s+if: inputs\.ref != ''/);
  assert.match(workflow, /git fetch --quiet origin main/);
  assert.match(workflow, /echo "::notice::main has moved on/);
  assert.doesNotMatch(workflow, /github\.event_name != 'pull_request'/);
  assert.match(workflow, /group: \$\{\{ github\.event_name == 'pull_request' && format\('deploy-pr-\{0\}', github\.event\.number\) \|\| 'deploy-production' \}\}/);
  for (const command of [
    "npm run site:test",
    "npm run ai-news:test",
    "npm run ai-news:validate",
    "npm run ai-news:pending-images -- --fail-on-pending",
    "python3 scripts/content-audit.py",
    "npm run build",
    "npm run seo:validate",
    "python3 -m unittest discover -s scripts -p 'test_*.py'",
    'npm run security:audit -- --auto --base "$AUDIT_BASE"',
  ]) {
    assert.ok(workflow.includes(command), `missing pre-deploy gate: ${command}`);
  }
  // The audit gate needs full history and must never be downgraded to a report.
  assert.match(workflow, /fetch-depth: 0/);
  assert.doesNotMatch(workflow, /security:audit[^\n]*--report/);
  assert.match(workflow, /AUDIT_BASE: \$\{\{ steps\.audit-base\.outputs\.sha \}\}/);

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
