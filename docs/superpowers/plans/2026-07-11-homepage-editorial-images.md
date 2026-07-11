# Homepage Editorial Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move an image-led AI editorial rail directly below a new smart-home hero on both localized homepages without text overlap or content writes.

**Architecture:** Keep locale copy in the MDX-facing Astro components, extend the pure `selectLatestNews()` boundary with image metadata, and use one image pipeline script to produce deterministic AVIF/WebP variants. `HomePortal` owns ordering, while `HomeLatestNews` remains a read-only collection consumer.

**Tech Stack:** Astro 6 baseline, Starlight, TypeScript, Sharp, Node test runner, local AVIF/WebP assets.

## Global Constraints

- Smart-home identity remains primary; AI News is early but not the page hero.
- Lead editorial images are 16:9 and at least 1200 px wide.
- Danish and English pages have structural parity and one visible `h1`.
- Layout must work at 320 px, 200% zoom, keyboard navigation and reduced motion.
- News selection never writes content or image files.
- No generic AI brains, fake dashboards, embedded text or logos in generated art.

---

### Task 1: Extend the read-only homepage news model

**Files:**
- Modify: `src/lib/home-news.ts`
- Modify: `scripts/site-quality.test.mjs`

**Interfaces:**
- Consumes: Starlight docs entries with `data.heroImage.src`, `alt` and optional `caption`.
- Produces: `HomeNewsItem.image: { src: string; alt: string } | null` and unchanged `selectLatestNews(entries, locale, limit)`.

- [ ] **Step 1: Add a failing fixture assertion**

```js
assert.deepEqual(items[0].image, {
  src: "/images/ai-news/2026-07-11-16x9.webp",
  alt: "Concrete AI story image",
});
assert.equal(items[1].image, null);
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `node --test scripts/site-quality.test.mjs --test-name-pattern="homepage news selector"`  
Expected: FAIL because `image` is absent.

- [ ] **Step 3: Add the typed mapping**

```ts
export interface HomeNewsItem {
  title: string;
  description: string;
  href: string;
  date: Date;
  dateString: string;
  image: { src: string; alt: string } | null;
}

const hero = entry.data.heroImage;
image: hero?.src && hero?.alt ? { src: hero.src, alt: hero.alt } : null,
```

Also extend `NewsDocument.data.heroImage` with the same optional shape.

- [ ] **Step 4: Run GREEN and regression suite**

Run: `npm run site:test`  
Expected: all site tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/home-news.ts scripts/site-quality.test.mjs
git commit -m "feat: expose homepage news images"
```

### Task 2: Generate and optimize the new hero image family

**Files:**
- Create: `scripts/optimize-home-images.mjs`
- Create: `public/images/hero/smart-home-editorial-master.png`
- Create: `public/images/hero/smart-home-editorial-640.avif`
- Create: `public/images/hero/smart-home-editorial-960.avif`
- Create: `public/images/hero/smart-home-editorial-1440.avif`
- Create: matching `.webp` variants
- Modify: `package.json`
- Test: `scripts/site-quality.test.mjs`

**Interfaces:**
- Consumes: one approved 16:9 PNG master generated with the `imagegen` skill.
- Produces: `npm run images:home` and six deterministic responsive derivatives.

- [ ] **Step 1: Add failing asset-contract assertions**

```js
for (const width of [640, 960, 1440]) {
  for (const format of ["avif", "webp"]) {
    assert.ok(existsSync(`public/images/hero/smart-home-editorial-${width}.${format}`));
  }
}
```

- [ ] **Step 2: Confirm RED**

Run: `node --test scripts/site-quality.test.mjs --test-name-pattern="hero image family"`  
Expected: FAIL with the first missing derivative.

- [ ] **Step 3: Generate the master image**

Use `imagegen` with this exact art direction:

```text
Editorial architectural photograph of a warm lived-in modern European home at dusk, subtle practical smart-home details: wall tablet, lighting, temperature sensor, energy monitor and a small Home Assistant-style local hub, realistic materials, calm cyan and amber accents, no people, no logos, no readable interface text, no floating holograms, no circuit brain, premium documentary lighting, clean negative space for adjacent website copy, 16:9, 1536x864.
```

Inspect the output and reject it if it contains text, brands, malformed devices or an implausible room.

- [ ] **Step 4: Implement deterministic optimization**

```js
import sharp from "sharp";
const widths = [640, 960, 1440];
for (const width of widths) {
  const base = sharp(input).resize({ width, aspectRatio: "16:9", fit: "cover" });
  await base.clone().avif({ quality: 58, effort: 6 }).toFile(`${out}-${width}.avif`);
  await base.clone().webp({ quality: 76, effort: 6 }).toFile(`${out}-${width}.webp`);
}
```

Add `"images:home": "node scripts/optimize-home-images.mjs"` to `package.json`.

- [ ] **Step 5: Generate, inspect and verify budgets**

Run: `npm run images:home && identify public/images/hero/smart-home-editorial-*`  
Expected: 640/960/1440 variants at 16:9; each derivative below 250 KiB.

- [ ] **Step 6: Commit**

```bash
git add package.json scripts/optimize-home-images.mjs public/images/hero scripts/site-quality.test.mjs
git commit -m "feat: add responsive homepage artwork"
```

### Task 3: Render responsive hero and early editorial rail

**Files:**
- Modify: `src/components/CustomHero.astro`
- Modify: `src/components/HomeLatestNews.astro`
- Modify: `src/components/HomePortal.astro`
- Modify: `src/components/HomeStyles.astro`
- Modify: `src/content/docs/da/index.mdx`
- Modify: `src/content/docs/en/index.mdx`
- Modify: `scripts/site-quality.test.mjs`

**Interfaces:**
- Consumes: `HomeNewsItem.image` and the responsive hero assets.
- Produces: compact latest strip plus one lead/two supporting story layout directly after hero.

- [ ] **Step 1: Add failing structural assertions**

```js
assert.match(daHome, /<HomeLatestNews slot="editorial-news" locale="da"/);
assert.ok(portal.indexOf('slot name="editorial-news"') < portal.indexOf('home-paths'));
assert.match(hero, /<picture>/);
assert.match(news, /home-news-card__media/);
```

- [ ] **Step 2: Confirm RED**

Run: `npm run site:test`  
Expected: FAIL on missing early slot/picture/media.

- [ ] **Step 3: Replace hero `<img>` with responsive `<picture>`**

```astro
<picture>
  <source type="image/avif" srcset="/images/hero/smart-home-editorial-640.avif 640w, /images/hero/smart-home-editorial-960.avif 960w, /images/hero/smart-home-editorial-1440.avif 1440w" sizes="(max-width: 720px) 100vw, 52vw" />
  <source type="image/webp" srcset="/images/hero/smart-home-editorial-640.webp 640w, /images/hero/smart-home-editorial-960.webp 960w, /images/hero/smart-home-editorial-1440.webp 1440w" sizes="(max-width: 720px) 100vw, 52vw" />
  <img src="/images/hero/smart-home-editorial-960.webp" alt={imageAlt} width="1440" height="810" loading="eager" fetchpriority="high" decoding="async" />
</picture>
```

- [ ] **Step 4: Move and render the editorial slot**

Place the latest strip and `<slot name="editorial-news" />` before `.home-paths`. In `HomeLatestNews.astro`, render the first item with `<picture>` when `item.image` exists; render supporting cards without empty media wrappers.

- [ ] **Step 5: Implement responsive layout rules**

```css
.home-news-grid { grid-template-columns: minmax(0, 1.55fr) repeat(2, minmax(0, .72fr)); }
.home-news-card__media { aspect-ratio: 16 / 9; overflow: hidden; border-radius: 1rem 1rem 0 0; }
.home-news-card__media img { width: 100%; height: 100%; object-fit: cover; }
@media (max-width: 760px) {
  .home-news-grid { grid-template-columns: 1fr; }
  .home-news-shell .home-section__heading { display: block; }
}
```

Keep eyebrow elements in normal flow and avoid absolute positioning for text.

- [ ] **Step 6: Run automated gates**

Run: `npm run site:test && npm run build && npm run seo:validate`  
Expected: all commands exit 0; build reports all pages generated.

- [ ] **Step 7: Commit**

```bash
git add src/components src/content/docs/da/index.mdx src/content/docs/en/index.mdx scripts/site-quality.test.mjs
git commit -m "feat: add homepage editorial rail"
```

### Task 4: Browser and documentation verification

**Files:**
- Modify: `README.md`
- Create: `docs/verification/YYYY-MM-DD-homepage-editorial.md`

**Interfaces:**
- Consumes: production build served locally.
- Produces: browser evidence for both locales and asset behavior.

- [ ] **Step 1: Document the new homepage contract**

Update README portal bullets to state: smart-home hero, early image-led AI editorial rail, read-only news selection and `npm run images:home`.

- [ ] **Step 2: Start production preview**

Run: `npm run build && npm run preview -- --host 127.0.0.1`  
Expected: preview URL is printed and responds with HTTP 200.

- [ ] **Step 3: Verify with `playwright-cli`**

Inspect `/da/` and `/en/` at 1440×1000, 390×844 and 320×800. Verify hero, latest strip, lead/supporting order, no overlaps, one `h1`, keyboard focus, locale links, image requests, no console errors and reduced-motion behavior. Save screenshots and exact observations in the verification document.

- [ ] **Step 4: Run final scoped gates**

Run: `npm run site:test && npm run ai-news:test && npm run ai-news:validate && python3 scripts/content-audit.py && npm run build && npm run seo:validate && git diff --check`  
Expected: every command exits 0 and content audit reports `TOTAL ISSUES: 0`.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/verification
git commit -m "docs: verify homepage editorial redesign"
```
