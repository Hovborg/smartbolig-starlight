# Verification: Homepage "editorial smart-home field guide" redesign

Date: 2026-07-13
Branch: `feat/home-ai-editorial-spec` (origin/main `797271a` merged in, no conflicts)
Scope: total redesign of `/da/` and `/en/` front pages. AI News pipeline untouched.

## What changed

- New section order: hero → goal navigator → field guide → featured guides →
  trust/evidence → compact AI news → closing CTA.
- Components: thin `HomePortal.astro` orchestrator + single-purpose components in
  `src/components/home/`, driven by the typed DA/EN copy model `src/lib/home-copy.ts`
  (explicit `locale` prop, no URL sniffing). `CustomHero.astro` removed.
- Design system in `HomeStyles.astro`: system-serif display headings
  (Charter/Georgia stack), mono eyebrows, hairline rows instead of card grids,
  disciplined cyan/green + warm accents, complete dark and light themes.
- Theme conflicts fixed inside the portal scope: Galaxy's gradient heading fill
  (`background-clip: text`) and `sl-markdown-content li::before` counters are
  neutralised — this removes the doubled step markers and the blue-gradient H1.
- AI News is now a compact text-first list low on the page (3 items, read-only
  `selectLatestNews`, archive + RSS links kept). Thumbnails are 6.5rem,
  lazy-loaded, and hidden below 620px so text-embedded news images no longer
  dominate mobile.
- CTA discipline: max three start-route links with distinct wording (hero
  primary, beginner track, field-guide outro); the closing CTA now points to the
  guide library and contact instead of repeating "Start her".
- Only one number series on the page (field-guide stages 1–3).

## Fresh quality suite (2026-07-13, before push)

| Check | Result |
| --- | --- |
| `npm run site:test` | 25 pass, 0 fail |
| `npm run ai-news:test` | 23 pass, 0 fail |
| `npm run ai-news:validate` | 59 DA/EN pairs (58 + merged 2026-07-12 pair) |
| `python3 scripts/content-audit.py` | TOTAL ISSUES: 0 |
| `npm audit --omit=dev --audit-level=high` | passes (4 low, 0 high) |
| `npm run build` | 283 pages (281 + the merged 2026-07-12 DA/EN pair) |
| `npm run seo:validate` | passed (latest AI News 2026-07-12) |

## Browser matrix (production build served via `npm run preview`, playwright-cli)

Screenshots: `docs/verification/screenshots/homepage-field-guide/`
(`before-da-390-full.png` is the pre-redesign baseline).

| Measurement | Before | After |
| --- | --- | --- |
| `/da/` scrollHeight @390×844 | 8119 px | 5234 px (−36 %) |
| `/en/` scrollHeight @390×844 | ~8100 px | 5295 px |
| `/da/` scrollHeight @1440×1000 | 5135 px | 4366 px |
| Visible H1 count | 1 | 1 (`#home-hero-title`, skip-link target kept) |
| Number series | 01–05 **and** 01–03 + theme counters | one (1–3) |
| Links to `/start/` | 3 identical "Start her" flavours | 3 distinct roles/labels, none in closing |
| Horizontal overflow 320/390/768/1024/1440/720(≈200 % zoom) | — | none (scrollWidth = innerWidth) |
| Landmarks | main/nav/header/footer ×1 | unchanged |
| Console errors on `/da/`, `/en/`, start, guides, news archive + article | 0 | 0 |

Performance on fresh desktop load (cache cleared, local preview):

- LCP element: hero `IMG`, candidate `smart-home-editorial-960.avif`, ~144 ms locally.
- CLS: 0 (buffered layout-shift observer, no shifts without recent input).
- Transfer: HTML 9 KB, images 27 KB, CSS 31 KB, fonts 47 KB, JS 275 KB
  (JS is site-wide Starlight/Pagefind + GTM/AdSense; homepage-specific JS = 0,
  verified by test "home components stay static").
- Eager images: 3 (logo + hero); news thumbs lazy and verified to load on scroll.

Accessibility checks:

- Keyboard: Tab order runs skip-link → header → hero CTAs; focus outline
  3 px `var(--home-focus)` visible in both themes.
- Reduced motion: all transitions/hovers sit inside
  `@media (prefers-reduced-motion: no-preference)`; no animations otherwise
  (verified by source inspection — see Limitations).
- Dark and light themes fully styled (full-page screenshots at 390 and 1440).
- Locale switcher exposes `/da/` ↔ `/en/`; DA/EN structural parity enforced by
  the copy-model shape test.

## Known limitations

- Mobile height is 5234 px, above the 4200–4800 px working target. The remaining
  height is real content (5 trust/nav descriptions, 3-step field guide, 3 news
  rows); hitting the target would require cutting content or microtext, which
  the spec forbids. 8119 → 5234 px keeps every function.
- `prefers-reduced-motion` and forced-colors were verified by CSS-scope
  inspection, not by emulated browser profiles (playwright-cli has no media
  emulation command).
- News thumbnails reuse the pipeline's 1.5 MB PNGs (protected path — no
  derivatives generated); they are lazy, desktop-only and below the fold.
- Third-party JS (GTM/AdSense) is site-wide configuration, out of scope here.
