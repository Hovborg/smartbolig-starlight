# SmartBolig Site Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a premium, compact bilingual SmartBolig guide portal with guided start pages, current AI-news highlights, stronger SEO/security/accessibility, repaired content examples, and no regression to the daily news pipeline.

**Architecture:** Keep Astro Starlight as the static documentation shell and keep locale copy in the two MDX homepages. Add small shared Astro presentation components, a read-only homepage news selector, and source/build-output regression tests. Preserve `AiNewsFeed.astro` and all generation scripts as the canonical archive/automation path.

**Tech Stack:** Astro 6, Starlight, MDX content collections, Node built-in test runner, Python content audit, Cloudflare Pages/Functions, GitHub Actions.

## Global Constraints

- Work from fresh `Hovborg/smartbolig-starlight` `main`; never use the stale `04-infra/02-ha-config/site` copy as source of truth.
- Preserve every AI-news article and image on current `origin/main`; rebase before the final test run.
- Do not change AI-news prompts, sources, date slugs, systemd installation, PR/merge flow or generated article templates unless a failing compatibility test requires it.
- Danish and English home/start routes must retain structural and metadata parity.
- Target WCAG 2.2 AA and usable layouts at 320 px width and 200% zoom.
- Add no client-side framework, remote font, autoplay media, tracking system, secret or private Home Assistant data.
- Production completion requires content, build, SEO, news, dependency, browser, deployment and live-site evidence.

---

## File responsibility map

- `src/content/docs/{da,en}/index.mdx`: locale copy and homepage composition only.
- `src/components/CustomHero.astro`: bilingual hero semantics and factual defaults.
- `src/components/HomePortal.astro`: reusable path, guide, trust and closing-action markup.
- `src/components/HomeLatestNews.astro`: read-only selection/rendering of the three newest news entries.
- `src/components/HomeStyles.astro`: all homepage-only visual rules and responsive behavior.
- `src/content/docs/da/start.mdx`, `src/content/docs/en/start.mdx`: guided onboarding pages linking to canonical guides.
- `src/components/Head.astro`: the single metadata and JSON-LD boundary.
- `scripts/site-quality.test.mjs`: source-level homepage, locale, news-isolation and security assertions.
- `scripts/seo-validate.mjs`: production-output metadata assertions.
- `scripts/content-audit.py`: existing syntax/link/image audit; behavior remains unchanged.
- `public/_headers`: Cloudflare security policy source.
- `.github/workflows/deploy.yml`: CI gates and least-privilege deployment.

---

### Task 1: Lock the baseline and repair the two content syntax defects

**Files:**
- Create: `scripts/site-quality.test.mjs`
- Modify: `package.json`
- Modify: `src/content/docs/da/home-assistant/node-red.mdx`
- Modify: `src/content/docs/en/home-assistant/node-red.mdx`
- Test: `scripts/site-quality.test.mjs`

**Interfaces:**
- Consumes: current MDX content and `scripts/content-audit.py`.
- Produces: `npm run site:test`, a stable non-news quality gate used by every later task.

- [ ] **Step 1: Add a failing regression test for executable JavaScript examples and protected news paths**

```js
// scripts/site-quality.test.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Node-RED function examples are valid inside a function body", async () => {
  for (const locale of ["da", "en"]) {
    const source = await read(`src/content/docs/${locale}/home-assistant/node-red.mdx`);
    assert.match(source, /function trackActiveRooms\(msg, global\)/);
    assert.doesNotMatch(source, /^return msg;$/m);
  }
});

test("daily news automation keeps append-only content and image boundaries", async () => {
  const source = await read("scripts/openclaw-ai-news-daily.sh");
  for (const path of [
    "src/content/docs/da/ai/nyheder",
    "src/content/docs/en/ai/nyheder",
    "public/images/ai-news",
  ]) assert.ok(source.includes(path));
  assert.ok(source.includes("Append-only content dirs"));
});
```

- [ ] **Step 2: Register and run the test to prove RED**

Add to `package.json`:

```json
"site:test": "node --test scripts/site-quality.test.mjs"
```

Run: `npm run site:test`  
Expected: FAIL because the current Node-RED snippets contain top-level `return msg;` and no wrapper function.

- [ ] **Step 3: Make both Node-RED examples syntactically executable**

Use the same JavaScript shape in Danish and English:

```js
function trackActiveRooms(msg, global) {
  let activeRooms = global.get("activeRooms") || [];
  const room = msg.data.entity_id.replace("binary_sensor.motion_", "");

  if (msg.payload === "on" && !activeRooms.includes(room)) {
    activeRooms.push(room);
  } else if (msg.payload !== "on") {
    activeRooms = activeRooms.filter((activeRoom) => activeRoom !== room);
  }

  global.set("activeRooms", activeRooms);
  msg.activeRooms = activeRooms;
  return msg;
}
```

Explain immediately below each block that Node-RED supplies `msg` and `global`, and the wrapper exists so the published example can be syntax-checked.

- [ ] **Step 4: Verify GREEN and the full content audit**

Run: `npm run site:test && python3 scripts/content-audit.py`  
Expected: all Node tests PASS and `TOTAL ISSUES: 0`.

- [ ] **Step 5: Commit the independently useful repair**

```bash
git add package.json scripts/site-quality.test.mjs src/content/docs/da/home-assistant/node-red.mdx src/content/docs/en/home-assistant/node-red.mdx
git commit -m "test: add site quality gate and fix Node-RED examples"
```

---

### Task 2: Build the compact bilingual guide-portal homepage

**Files:**
- Modify: `src/components/CustomHero.astro`
- Create: `src/components/HomePortal.astro`
- Modify: `src/components/HomeStyles.astro`
- Modify: `src/content/docs/da/index.mdx`
- Modify: `src/content/docs/en/index.mdx`
- Modify: `scripts/site-quality.test.mjs`
- Test: `scripts/site-quality.test.mjs`

**Interfaces:**
- Consumes: `locale: "da" | "en"` and existing canonical guide URLs.
- Produces: `<HomePortal locale="da|en" />` and one compact, structurally identical homepage per locale.

- [ ] **Step 1: Add failing tests for hierarchy, parity and truthful copy**

```js
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
  for (const key of ["home-assistant", "automationer", "esp32", "produkter", "ai"])
    assert.ok(portal.includes(`key: "${key}"`));
});
```

Run: `npm run site:test`  
Expected: FAIL because `HomePortal.astro` and its composition do not exist.

- [ ] **Step 2: Replace hero defaults with concise factual locale copy**

Retain the existing props but use these defaults:

```ts
const defaults = lang === "en" ? {
  title: "A smarter home you can understand and control",
  tagline: "Practical guides to Home Assistant, ESPHome and automation — with local control and privacy in focus.",
  badge: "Independent, practical guides",
  primaryLink: "/en/start/",
  primaryText: "Start here",
  secondaryLink: "/en/home-assistant/",
  secondaryText: "Explore guides",
} : {
  title: "Et smartere hjem, du selv forstår og styrer",
  tagline: "Praktiske guides til Home Assistant, ESPHome og automation — med lokal kontrol og privatliv i fokus.",
  badge: "Uafhængige, praktiske guides",
  primaryLink: "/da/start/",
  primaryText: "Start her",
  secondaryLink: "/da/home-assistant/",
  secondaryText: "Find guides",
};
```

Remove the three unsupported floating statistics. Keep the locally hosted hero image with explicit dimensions and eager loading.

- [ ] **Step 3: Create the shared portal data and semantic sections**

`HomePortal.astro` accepts only `locale` and builds locale-specific objects from one structural definition:

```ts
interface Props { locale: "da" | "en" }
const { locale } = Astro.props;
const copy = locale === "da" ? daCopy : enCopy;
const paths = [
  { key: "home-assistant", href: `/${locale}/home-assistant/`, accent: "cyan" },
  { key: "automationer", href: `/${locale}/automationer/`, accent: "blue" },
  { key: "esp32", href: `/${locale}/esp32/`, accent: "green" },
  { key: "produkter", href: `/${locale}/produkter/`, accent: "amber" },
  { key: "ai", href: `/${locale}/ai/`, accent: "violet" },
];
```

Render, in order: `choose-path`, `new-here`, `recommended-guides`, a `<slot name="latest-news" />`, `trust-method`, and `closing-action`. Use native `section`, `h2`, `article`, `ol`, `ul` and `a` elements; no click handlers or client hydration.

- [ ] **Step 4: Compose minimal locale homepages**

Each MDX page becomes:

```mdx
import CustomHero from "../../../components/CustomHero.astro";
import HomePortal from "../../../components/HomePortal.astro";
import HomeStyles from "../../../components/HomeStyles.astro";

<HomeStyles />
<CustomHero />
<HomePortal locale="da" />
```

Use `locale="en"` for English. Update frontmatter descriptions to factual, intent-focused copy under roughly 160 characters.

- [ ] **Step 5: Replace homepage CSS with the focused portal system**

Keep the styles scoped under `.home-*`. Define consistent tokens, a 1120 px content width, five path-card accents, a two-column desktop/touch-safe mobile layout, visible `:focus-visible`, `@media (prefers-reduced-motion: no-preference)`, `@media (max-width: 720px)`, and `@media (forced-colors: active)`. Remove `.home-trust` and `.home-hero__stats` rules.

- [ ] **Step 6: Verify source tests and production rendering**

Run: `npm run site:test && npm run build`  
Expected: PASS; `dist/da/index.html` and `dist/en/index.html` each contain one visible homepage hero heading and the five portal paths.

- [ ] **Step 7: Commit the homepage shell**

```bash
git add src/components/CustomHero.astro src/components/HomePortal.astro src/components/HomeStyles.astro src/content/docs/da/index.mdx src/content/docs/en/index.mdx scripts/site-quality.test.mjs
git commit -m "feat: redesign the bilingual SmartBolig homepage"
```

---

### Task 3: Add an isolated read-only latest-news module

**Files:**
- Create: `src/lib/home-news.ts`
- Create: `src/components/HomeLatestNews.astro`
- Modify: `src/content/docs/da/index.mdx`
- Modify: `src/content/docs/en/index.mdx`
- Modify: `scripts/site-quality.test.mjs`
- Test: `scripts/site-quality.test.mjs`

**Interfaces:**
- Consumes: Astro `docs` collection entries and `locale`.
- Produces: `selectLatestNews(entries, locale, limit)` returning immutable `{ title, description, href, date, dateString }[]`.

- [ ] **Step 1: Add failing tests for selection and write isolation**

```js
test("homepage news selector is read-only, bounded and deterministic", async () => {
  const source = await read("src/lib/home-news.ts");
  assert.match(source, /export function selectLatestNews/);
  assert.match(source, /slice\(0, limit\)/);
  assert.doesNotMatch(source, /writeFile|mkdir|rmSync|unlink|fetch\(/);
});

test("homepage news component links to archive and RSS in both locales", async () => {
  const source = await read("src/components/HomeLatestNews.astro");
  for (const href of ["/da/ai/nyheder/", "/en/ai/nyheder/", "/da/ai/nyheder/rss.xml", "/en/ai/news/rss.xml"])
    assert.ok(source.includes(href));
});
```

Run: `npm run site:test`  
Expected: FAIL because the selector/component do not exist.

- [ ] **Step 2: Implement the pure selector**

```ts
export function selectLatestNews(entries, locale: "da" | "en", limit = 3) {
  return entries
    .filter((entry) => {
      const slug = entry.slug || entry.id;
      return slug.startsWith(`${locale}/ai/nyheder/`) && !slug.endsWith("/index") && entry.data.title;
    })
    .map((entry) => {
      const slug = entry.slug || entry.id;
      const rawDate = entry.data.date || entry.data.lastUpdated;
      const date = rawDate instanceof Date ? rawDate : new Date(rawDate);
      return {
        title: entry.data.title,
        description: entry.data.description || "",
        href: `/${slug}/`,
        date,
        dateString: date.toISOString().slice(0, 10),
      };
    })
    .filter((entry) => !Number.isNaN(entry.date.getTime()))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, limit);
}
```

Use an explicit generic/type derived from `getCollection("docs")` during implementation so there is no `any` in production code.

- [ ] **Step 3: Implement graceful Astro rendering**

`HomeLatestNews.astro` calls `getCollection("docs")`, passes entries to the selector, formats dates in UTC, renders no more than three semantic article cards, and shows a quiet empty-state link to the archive if there are no issues. It must not import generation scripts or source-feed configuration.

Compose it through the existing portal slot in each homepage:

```mdx
import HomeLatestNews from "../../../components/HomeLatestNews.astro";

<HomePortal locale="da">
  <HomeLatestNews slot="latest-news" locale="da" />
</HomePortal>
```

Use `locale="en"` on the English page.

- [ ] **Step 4: Run both new and protected news gates**

Run: `npm run site:test && npm run ai-news:test && npm run ai-news:validate && npm run build`  
Expected: all tests PASS, validator reports paired issues through the latest date, and both homepages show the latest three matching entries.

- [ ] **Step 5: Commit the read-only integration**

```bash
git add src/lib/home-news.ts src/components/HomeLatestNews.astro src/content/docs/da/index.mdx src/content/docs/en/index.mdx scripts/site-quality.test.mjs
git commit -m "feat: surface latest news without touching automation"
```

---

### Task 4: Add bilingual guided start pages

**Files:**
- Create: `src/content/docs/da/start.mdx`
- Create: `src/content/docs/en/start.mdx`
- Modify: `scripts/site-quality.test.mjs`
- Test: `scripts/site-quality.test.mjs`

**Interfaces:**
- Consumes: existing canonical installation, integration, automation and security guide URLs.
- Produces: `/da/start/` and `/en/start/` with matching six-step structures.

- [ ] **Step 1: Add failing locale-parity and link tests**

```js
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
    assert.doesNotMatch(source, /target=["']_blank/);
  }
});
```

Run: `npm run site:test`  
Expected: FAIL with missing start-page files.

- [ ] **Step 2: Write the Danish journey**

Use frontmatter `title`, intent-focused `description`, and six `Card` sections:

1. Choose Home Assistant hardware/platform.
2. Install using Raspberry Pi, Proxmox or Docker.
3. Add devices using Zigbee, Wi-Fi or Matter.
4. Build the first automation.
5. Create backup and security routines.
6. Continue with dashboards, energy and ESPHome.

Every action links to an existing canonical Danish guide; do not repeat full installation instructions.

- [ ] **Step 3: Write the English structural equivalent**

Use natural English copy while retaining the repository’s existing English canonical slugs. Do not translate slugs opportunistically because that would create duplicate content and redirect work.

- [ ] **Step 4: Verify links, routes and content output**

Run: `npm run site:test && python3 scripts/content-audit.py && npm run build`  
Expected: PASS and generated `dist/da/start/index.html` plus `dist/en/start/index.html`.

- [ ] **Step 5: Commit the guided journeys**

```bash
git add src/content/docs/da/start.mdx src/content/docs/en/start.mdx scripts/site-quality.test.mjs
git commit -m "feat: add guided smart-home start journeys"
```

---

### Task 5: Strengthen homepage/start-page SEO and structured data

**Files:**
- Modify: `src/components/Head.astro`
- Modify: `scripts/seo-validate.mjs`
- Modify: `scripts/site-quality.test.mjs`
- Test: `scripts/seo-validate.mjs`

**Interfaces:**
- Consumes: Starlight route metadata and canonical localized paths.
- Produces: canonical, hreflang, Open Graph and truthful JSON-LD for home/start pages without altering AI-news `NewsArticle` data.

- [ ] **Step 1: Extend the production SEO validator before metadata changes**

Add validation cases for `dist/da/index.html`, `dist/en/index.html`, `dist/da/start/index.html`, and `dist/en/start/index.html`:

```js
await validatePage(issues, path.join(distDir, "da/index.html"), {
  required: [
    { needle: '<link rel="canonical" href="https://smartbolig.net/da/"', label: "Danish homepage canonical" },
    { needle: 'hreflang="en" href="https://smartbolig.net/en/"', label: "Danish homepage English alternate" },
    { needle: '"@type":"WebSite"', label: "WebSite JSON-LD" },
    { needle: '"@type":"WebPage"', label: "homepage WebPage JSON-LD" },
  ],
  forbidden: [
    { needle: "100% dansk", label: "unsupported language claim" },
    { needle: "0 Cloud", label: "unsupported cloud claim" },
  ],
});
```

Mirror locale assertions for English and require breadcrumb/start-page metadata. Run `npm run build && npm run seo:validate`; expected RED until titles/schema handling are aligned.

- [ ] **Step 2: Make start routes first-class metadata pages**

Add start-page recognition and breadcrumb labels:

```ts
const isStartPage = /^\/(?:da|en)\/start\/?$/.test(pathname);
// labels
start: lang === "da" ? "Start her" : "Start here",

```

Keep `webPageType` as `WebPage`, keep organization/website entities, and ensure the page’s `isPartOf`, `inLanguage`, canonical and reciprocal alternates remain Starlight-compatible. Do not add fake `Review`, `Rating`, `FAQPage` or author credentials.

- [ ] **Step 3: Preserve AI-news schema invariants**

Add source tests asserting `NewsArticle`, `citation`, date-specific images and AI-news RSS handling remain present in `Head.astro`. Do not refactor the existing AI-news schema during this task.

- [ ] **Step 4: Verify generated SEO, sitemap and routes**

Run: `npm run build && npm run seo:validate && rg -n "(?:da|en)/start" dist/sitemap-0.xml`
Expected: validator PASS; both new canonical routes appear in the sitemap.

- [ ] **Step 5: Commit metadata improvements**

```bash
git add src/components/Head.astro scripts/seo-validate.mjs scripts/site-quality.test.mjs
git commit -m "feat: strengthen portal SEO and structured data"
```

---

### Task 6: Patch dependencies and lock security/deployment invariants

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `public/_headers`
- Modify: `.github/workflows/deploy.yml`
- Modify: `scripts/site-quality.test.mjs`
- Test: `scripts/site-quality.test.mjs`

**Interfaces:**
- Consumes: current npm advisory resolution and live Cloudflare header contract.
- Produces: patched dependency graph, reproducible CI security checks and unchanged strong runtime headers.

- [ ] **Step 1: Add failing security source tests**

```js
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
  ]) assert.ok(headers.includes(value), value);
});

test("deploy runs every local quality gate before publishing", async () => {
  const workflow = await read(".github/workflows/deploy.yml");
  for (const command of ["npm run site:test", "npm run ai-news:test", "npm run ai-news:validate", "python3 scripts/content-audit.py", "npm run build", "npm run seo:validate", "npm audit --omit=dev --audit-level=high"])
    assert.ok(workflow.includes(command), command);
});
```

Run: `npm run site:test`  
Expected: FAIL because the deploy workflow does not run all new gates.

- [ ] **Step 2: Resolve the dependency graph deliberately**

Run:

```bash
npm outdated
npm audit --omit=dev
npm install astro@latest @astrojs/starlight@latest @astrojs/rss@latest @tailwindcss/vite@latest tailwindcss@latest sharp@latest starlight-theme-galaxy@latest
npm audit --omit=dev
```

Accept only versions compatible with Node 24 and each other. If `latest` introduces a major migration, select the newest patched compatible version and record the exact remaining advisory/exposure in the commit message and final report. Do not use `npm audit fix --force`.

- [ ] **Step 3: Run the complete suite after dependency changes**

Run: `npm run site:test && npm run ai-news:test && npm run ai-news:validate && python3 scripts/content-audit.py && npm run build && npm run seo:validate && npm audit --omit=dev --audit-level=high`  
Expected: PASS, no high/critical production advisory.

- [ ] **Step 4: Keep strong headers and document intentional CSP allowances**

Retain the current header values. Remove a CSP origin only if a source scan proves it is unused; do not tighten `script-src` blindly because Starlight and the existing Google CMP require intentional allowances. Add short comments next to ad/CMP/Giscus groups without weakening directives.

- [ ] **Step 5: Put every local gate before Cloudflare deployment**

Insert before `Deploy to Cloudflare Pages`:

```yaml
      - name: Test site invariants
        run: npm run site:test
      - name: Test AI News automation
        run: npm run ai-news:test
      - name: Audit content
        run: python3 scripts/content-audit.py
      - name: Audit production dependencies
        run: npm audit --omit=dev --audit-level=high
```

Retain `permissions: contents: read, deployments: write`; do not add pull-request or repository-write permission to deployment.

- [ ] **Step 6: Verify workflow syntax and commit**

Run: `npm run site:test && ruby -e 'require "yaml"; YAML.load_file(".github/workflows/deploy.yml")'`  
Expected: tests PASS and YAML parses. If Ruby is unavailable, use the repository’s existing YAML parser through Python with GitHub’s `on` key handled as a string.

```bash
git add package.json package-lock.json public/_headers .github/workflows/deploy.yml scripts/site-quality.test.mjs
git commit -m "chore: harden dependencies and deployment gates"
```

---

### Task 7: Perform production browser, accessibility and visual QA

**Files:**
- Modify as findings require: homepage/start components and styles only.
- Create: `docs/verification/2026-07-10-site-overhaul.md`
- Test: production preview and live-like Cloudflare headers.

**Interfaces:**
- Consumes: built `dist/` output and all prior automated gates.
- Produces: a reproducible verification record with URLs, viewports, observations and resolved findings.

- [ ] **Step 1: Run all automated gates from a clean install**

```bash
rm -rf node_modules .astro dist
npm ci
npm run site:test
npm run ai-news:test
npm run ai-news:validate
python3 scripts/content-audit.py
npm run build
npm run seo:validate
npm audit --omit=dev --audit-level=high
git diff --check
```

Expected: every command exits 0; `dist` contains all bilingual routes and the latest news date.

- [ ] **Step 2: Start the production preview**

Run: `npm run preview -- --host 127.0.0.1 --port 4321` in a persistent local process. Verify `curl -I http://127.0.0.1:4321/da/` returns 200 before browser work.

- [ ] **Step 3: Inspect required routes in the browser**

Check:

- `/da/`, `/en/`
- `/da/start/`, `/en/start/`
- `/da/ai/nyheder/`
- the newest Danish and English daily news article
- `/da/home-assistant/kom-godt-i-gang/`
- `/404`

At desktop and mobile widths, verify first-viewport clarity, no horizontal overflow, image aspect ratios, light/dark themes, locale switching, internal search, footer/legal links, keyboard traversal, visible focus, reduced-motion behavior, console errors and failed requests.

- [ ] **Step 4: Run an accessibility scan and fix material findings test-first**

Use the available browser accessibility snapshot/axe path. Any fix first gets a source or output assertion in `scripts/site-quality.test.mjs` or `scripts/seo-validate.mjs`, then the minimal implementation. Repeat until no critical/serious issue remains on the required routes.

- [ ] **Step 5: Record evidence**

Write `docs/verification/2026-07-10-site-overhaul.md` with commit SHA, command results, route/viewports checked, screenshots or artifact paths, accessibility results, known low-risk limitations and exact live checks still pending deployment.

- [ ] **Step 6: Commit verified polish and evidence**

```bash
git add src scripts docs/verification/2026-07-10-site-overhaul.md
git commit -m "test: verify SmartBolig portal experience"
```

---

### Task 8: Synchronize, review, push, deploy and verify production

**Files:**
- Modify only conflict-resolved files from current `origin/main`.
- Update: `docs/verification/2026-07-10-site-overhaul.md` with production evidence.

**Interfaces:**
- Consumes: fully verified feature branch and newest daily-news commits.
- Produces: merged GitHub `main`, successful Cloudflare deployment and verified canonical live site.

- [ ] **Step 1: Fetch and inspect concurrent remote work**

```bash
git fetch origin main --prune
git log --oneline --left-right HEAD...origin/main
git diff --name-status HEAD...origin/main -- src/content/docs/da/ai/nyheder src/content/docs/en/ai/nyheder public/images/ai-news
```

Expected: any new automation commits are clearly identified; no article deletion is accepted.

- [ ] **Step 2: Rebase onto current main and prove news preservation**

```bash
git rebase origin/main
git diff --diff-filter=D --name-only origin/main...HEAD -- src/content/docs/da/ai/nyheder src/content/docs/en/ai/nyheder public/images/ai-news
```

Expected: the deletion check prints nothing. Resolve conflicts by preserving remote news content and replaying only the portal changes.

- [ ] **Step 3: Run the complete post-rebase gate**

Run the clean-install command chain from Task 7 Step 1 again. Expected: all PASS against the latest news corpus.

- [ ] **Step 4: Review the exact GitHub-bound diff**

```bash
git status --short
git diff --check origin/main...HEAD
git diff --stat origin/main...HEAD
git diff --name-status origin/main...HEAD
git log --oneline origin/main..HEAD
```

Inspect every changed file. Confirm no secrets, caches, build output, news deletions or unrelated content rewrites.

- [ ] **Step 5: Push the feature branch and open a PR**

```bash
git push --set-upstream origin feat/homepage-security-seo-overhaul
gh pr create --repo Hovborg/smartbolig-starlight --base main --head feat/homepage-security-seo-overhaul --title "Redesign and harden the SmartBolig guide portal" --body-file docs/verification/2026-07-10-site-overhaul.md
```

Expected: GitHub returns the PR URL. Wait for checks and inspect failures rather than merging blindly.

- [ ] **Step 6: Merge after green checks and observe deployment**

```bash
pr_number=$(gh pr view --repo Hovborg/smartbolig-starlight --json number --jq .number)
gh pr checks "$pr_number" --repo Hovborg/smartbolig-starlight --watch
gh pr merge "$pr_number" --repo Hovborg/smartbolig-starlight --squash --delete-branch
gh run list --repo Hovborg/smartbolig-starlight --workflow "Deploy to Cloudflare Pages" --limit 1
```

Expected: all required checks pass, PR merges, and the resulting main deployment succeeds.

- [ ] **Step 7: Verify canonical production**

Verify with live HTTP and browser evidence:

```bash
curl -fsSI https://smartbolig.net/da/
curl -fsSI https://smartbolig.net/en/
curl -fsSI https://smartbolig.net/da/start/
curl -fsSI https://smartbolig.net/en/start/
curl -fsS https://smartbolig.net/sitemap-index.xml
curl -fsS https://smartbolig.net/robots.txt
```

Expected: canonical routes return 200; the security header contract remains present; sitemap/robots are valid. Repeat the Task 7 browser smoke test on `https://smartbolig.net`, update the verification document with deployment URL/SHA, and only then claim completion.
