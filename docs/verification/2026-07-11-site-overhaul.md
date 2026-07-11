# SmartBolig site overhaul verification — 2026-07-11

## Scope

- Bilingual homepage portal and guided start routes
- Read-only latest-news surface; daily AI-news generation remains append-only
- Page metadata, structured data, sitemap and Cloudflare security headers
- Dependency remediation and deployment quality gates
- Responsive, theme, keyboard, language and search checks
- Four bilingual guide pairs: Matter/Thread 2026, local Assist, ESPHome
  Bluetooth Proxy and an internationally applicable Energy Dashboard

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

## Four-guide series checks

The eight locale pages were checked at 390×844 and 1440×1000. For every page,
Chromium returned HTTP 200, found one `main` and one visible H1, matched the
document language, exposed a canonical URL plus three hreflang alternates, and
reported no document-level horizontal overflow.

The four guide types each render a semantic HTML table in both languages. A
browser regression found that the first build displayed GitHub-flavoured
Markdown table syntax as literal pipe characters. The fix enables
`remark-gfm` in Astro, adds it as a direct dependency and protects the setup
with a site-quality test. The rebuilt pages contain one `<table>` each and no
literal table separator text.

Pagefind checks against the production build returned the intended guide as
the first result for all four representative terms:

| Search term | First result |
|---|---|
| `matter.js` | `/en/home-assistant/thread-matter/` |
| `Speech-to-Phrase` | `/en/home-assistant/local-voice-assist/` |
| `bluetooth proxy` | `/en/esp32/bluetooth-proxy/` |
| `energy dashboard` | `/en/home-assistant/energy-dashboard/` |

The Energy guide was also checked for scope: it supports grid consumption,
solar, batteries, gas, water, appliances and EV charging without requiring a
Danish provider or referring to DK1/DK2. Regional prices and tariffs are an
optional layer, not a prerequisite.

## Protected automation boundaries

Before integration, compare the branch with the current upstream `main` and
confirm that the overhaul did not delete or rewrite files in:

- `src/content/docs/da/ai/nyheder/`
- `src/content/docs/en/ai/nyheder/`
- `public/images/ai-news/`

The final integration must be rebased onto the latest `main` so a daily news
commit that arrived during development is retained.
