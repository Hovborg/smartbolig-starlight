# Homepage editorial verification — 2026-07-11

## Scope

Verified the Danish and English homepage hero, early AI News editorial rail,
responsive image family, mobile stacking, keyboard focus, reduced motion and
production output in the local Astro preview.

## Automated evidence

- `npm run site:test`: 21 tests passed, 0 failed.
- Focused selector/image/structure tests were observed RED before implementation
  and GREEN afterwards.
- `npm run images:home`: generated six responsive derivatives.
- ImageMagick `identify`: 640×360, 960×540 and 1440×810 for AVIF and WebP.
- Largest production derivative: 44,170 bytes (`1440.webp`), below 250 KiB.
- `npm run build`: 281 pages built; Pagefind indexed 281 HTML files;
  `BUILD_EXIT=0`.
- `npm run seo:validate`: passed with latest AI News date 2026-07-11.

## Browser evidence

Tool: `playwright-cli`, production preview at `http://127.0.0.1:4322`.

| Route / viewport | Result |
| --- | --- |
| `/da/`, 1440×1000 | One visible `h1`; hero uses `smart-home-editorial-960.avif`; editorial rail begins before topic paths; 3 news cards; no horizontal overflow. |
| `/en/`, 1440×1000 | Same structure and image behavior; one visible `h1`; 3 news cards; no horizontal overflow. |
| `/da/`, 390×844 | 390 px document width; single-column news grid; heading in block flow; no overflow. |
| `/da/`, 320×800 | 320 px document width; both hero actions are 236 px wide; no overflow. |
| `/en/`, 390×844 and 320×800 | Same single-column structure and no overflow. |
| 720 px layout (200% desktop-zoom equivalent) | Document and viewport both 720 px wide; no horizontal overflow. |

The mobile editorial heading measurements were `eyebrow.bottom = 147` and
`title.top = 148`, proving that the text is adjacent rather than overlapping.
All three cards were 306 px wide at the 390 px viewport. Reduced-motion
emulation returned `animationName: none`. Keyboard focus produced a visible
solid outline on the editorial archive link.

An initial browser run exposed a stale `front.webp` preload. A regression test
was added, the old preload was removed, and the hero keeps native
`fetchpriority="high"` on its responsive `<picture>` image.
The post-fix 390×844 reloads for both locales reported zero image preloads,
zero console errors, zero console warnings, one visible `h1`, and matching
`scrollWidth`/`clientWidth` values of 390 px.

## Visual evidence

- `screenshots/homepage-editorial/da-desktop.png`
- `screenshots/homepage-editorial/en-desktop.png`
- `screenshots/homepage-editorial/da-mobile-390.png`
- `screenshots/homepage-editorial/da-mobile-320.png`
- `screenshots/homepage-editorial/en-mobile-390.png`
- `screenshots/homepage-editorial/en-mobile-320.png`
- `screenshots/homepage-editorial/da-news-mobile-390.png`
- `screenshots/homepage-editorial/en-news-mobile-390.png`

Visual inspection found no hero or heading overlap, malformed room geometry,
embedded branding, or horizontal clipping. Existing historical AI News images
remain text-heavy; replacing them is deliberately owned by the separate AI News
editorial/image-pipeline plan.
