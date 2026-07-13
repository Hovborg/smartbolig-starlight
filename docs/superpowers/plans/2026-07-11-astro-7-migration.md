# Astro 7 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the site to a supported Astro 7/Starlight stack and remove the four low esbuild advisories without route, content, SEO or deployment regression.

**Architecture:** Perform the migration on its own branch after content/UI work is merged. Capture an Astro 6 baseline manifest, update only mutually supported packages from official migration guidance, then resolve config/compiler incompatibilities through tests rather than `npm audit fix --force`.

**Tech Stack:** Astro 7, compatible Starlight/MDX/RSS/Tailwind, Vite 8, Sharp, Node/npm, Cloudflare Pages.

## Global Constraints

- Preserve all routes, redirects, RSS, sitemap, schema, Pagefind and Cloudflare behavior.
- Update package manifest, lockfile, config and README together.
- Final production audit must contain zero known low/moderate/high/critical findings.
- Do not mix unrelated homepage/content changes into this branch.

---

### Task 1: Record the Astro 6 compatibility baseline

**Files:**
- Create: `scripts/astro-migration-baseline.mjs`
- Create: `docs/verification/YYYY-MM-DD-astro-7-migration.md`
- Modify: `scripts/site-quality.test.mjs`

- [ ] Add a script that reads `dist` and emits sorted routes, canonical/hreflang/schema markers, RSS URLs and Pagefind asset presence as JSON.
- [ ] Add a failing test requiring the baseline artifact schema version `1`.
- [ ] Run the full Astro 6 build and save `docs/verification/astro-6-baseline.json`.
- [ ] Record `node --version`, `npm --version`, `npm ls astro @astrojs/starlight @astrojs/mdx vite esbuild` and audit output.
- [ ] Commit with `git commit -m "test: capture Astro 6 migration baseline"`.

### Task 2: Resolve the official compatibility matrix

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `docs/verification/YYYY-MM-DD-astro-7-migration.md`

- [ ] Read official Astro 7 migration notes and current Starlight peer dependency ranges; record direct links and selected versions.
- [ ] Run `npm install astro@^7 @astrojs/starlight@latest @astrojs/rss@latest @tailwindcss/vite@latest tailwindcss@latest sharp@latest remark-gfm@latest`.
- [ ] Run `npm ls`; expected: no `invalid` or unmet peer dependency lines.
- [ ] Run `npm audit --omit=dev`; expected: `found 0 vulnerabilities`.
- [ ] Commit package/lock/evidence with `git commit -m "build: upgrade SmartBolig to Astro 7"`.

### Task 3: Migrate configuration and content boundaries

**Files:**
- Modify: `astro.config.mjs`
- Modify: `src/content.config.ts`
- Modify: custom components named in Astro/Starlight errors
- Modify: `scripts/site-quality.test.mjs`

- [ ] Run `npm run build`; capture every migration error before editing.
- [ ] Add a regression assertion for each observed incompatibility.
- [ ] Update deprecated Markdown plugin configuration, content loader/schema or component override signatures according to official APIs.
- [ ] Rerun the focused test after each minimal fix.
- [ ] Run `npm run build`; expected: no Astro deprecation warnings or route collisions.
- [ ] Commit with `git commit -m "fix: adapt site config to Astro 7"`.

### Task 4: Prove output parity

**Files:**
- Modify: `scripts/astro-migration-baseline.mjs`
- Modify: `docs/verification/YYYY-MM-DD-astro-7-migration.md`

- [ ] Generate the Astro 7 manifest and compare it to `astro-6-baseline.json`.
- [ ] Classify any intended new daily news routes separately; fail on missing old routes or SEO markers.
- [ ] Run all site, AI News, content, build, SEO and audit gates.
- [ ] Serve production output and browser-check both homepages, start pages, news index/current/legacy article, representative guide, 404, search and locale switching.
- [ ] Record console/network results and screenshots at desktop/mobile.
- [ ] Commit with `git commit -m "test: verify Astro 7 output parity"`.

### Task 5: Update docs and deploy through a gated PR

**Files:**
- Modify: `README.md`
- Modify: `docs/verification/YYYY-MM-DD-astro-7-migration.md`

- [ ] Update technical stack and remove the documented four-low-advisory exception.
- [ ] Fetch current `origin/main`, incorporate news-only commits, rerun the entire gate matrix and review protected paths.
- [ ] Push, open PR, wait for successful GitHub checks, merge and observe Cloudflare deployment.
- [ ] Verify live canonical routes, RSS, sitemap, headers, images and search.
- [ ] Record exact merge/deploy/live evidence and commit any documentation-only evidence update separately.
