# SmartBolig site overhaul verification — 2026-07-11

## Scope

- Bilingual homepage portal and guided start routes
- Read-only latest-news surface; daily AI-news generation remains append-only
- Page metadata, structured data, sitemap and Cloudflare security headers
- Dependency remediation and deployment quality gates
- Responsive, theme, keyboard, language and search checks

## Automated gates

Run from the repository root:

```bash
npm run site:test
npm run ai-news:test
npm run ai-news:validate
python3 scripts/content-audit.py
npm audit --omit=dev --audit-level=high
npm run build
npm run seo:validate
```

Expected completion bar: every command exits `0`. The dependency audit may
still report low-severity development-server advisories, but the production
gate rejects moderate, high and critical findings.

## Browser and endpoint checks

The built site was served with `astro preview` and checked in Chromium at
390×844 and 1440×1000. The checked routes included both homepages, both start
routes, both news archives, the newest bilingual news pair, a representative
Home Assistant guide and the custom 404 route.

Verified interactions and invariants:

- one main landmark and one visible H1 per checked page
- no horizontal overflow at the checked viewports
- homepage skip link targets the visible hero heading
- light/dark toggle has a localised accessible name and persists the choice
- language selection navigates between the Danish and English homepage
- Pagefind returns results for `ESPHome`
- five homepage paths and three latest-news cards render in each locale
- expected routes return HTTP 200 and the missing route returns HTTP 404

Giscus may log an expected 404 while looking up a discussion that does not yet
exist. Its own client identifies that state as “Discussion not found” and will
create the discussion only if a visitor submits a comment or reaction.

## Protected automation boundaries

Before integration, compare the branch with the current upstream `main` and
confirm that the overhaul did not delete or rewrite files in:

- `src/content/docs/da/ai/nyheder/`
- `src/content/docs/en/ai/nyheder/`
- `public/images/ai-news/`

The final integration must be rebased onto the latest `main` so a daily news
commit that arrived during development is retained.
