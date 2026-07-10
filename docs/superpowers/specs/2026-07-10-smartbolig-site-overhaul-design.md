# SmartBolig Site Overhaul Design

**Status:** Approved direction, written specification pending final user review  
**Date:** 2026-07-10  
**Repository:** `Hovborg/smartbolig-starlight`  
**Base:** Fresh GitHub `main` at `f979e77` (`Draft AI news for 2026-07-10 (#79)`)

## 1. Outcome

SmartBolig.net becomes a fast, trustworthy Danish smart-home guide portal with a
premium, compact homepage that works for both first-time and experienced users.
The redesign must make the next useful action obvious, preserve the full
Danish/English documentation library, strengthen Google discoverability and
security, and keep the daily AI-news pipeline append-only and operational.

The work is complete only when the production build, content audit, SEO checks,
AI-news tests, accessibility/browser checks, security review, GitHub deployment,
and live-site smoke tests all pass.

## 2. Audiences and primary journeys

### New smart-home users

They need one low-friction route from “I am new” to choosing a Home Assistant
installation method, adding devices, and creating a first automation. The
homepage gives them a prominent start action and links to a dedicated
`start-her`/`start-here` page that explains the sequence without overloading the
homepage.

### Experienced Home Assistant and ESPHome users

They need fast access to search, troubleshooting, integrations, protocols,
automation examples, and reference material. The homepage provides topic entry
cards and curated high-value guides without forcing them through beginner copy.

### Returning readers

They need visible recent material and a reliable route to the AI-news archive.
The homepage shows a small, read-only latest-news module sourced from the
existing content collection. It never owns or rewrites news articles.

## 3. Chosen product direction

Use a **guide portal with editorial freshness**, not a dashboard simulation or
a news-first magazine.

The visual language remains recognizably SmartBolig: dark, technical, local and
privacy-oriented. It becomes calmer and more editorial through stronger
typography, restrained gradients, consistent card hierarchy, better whitespace,
fewer emoji, and purposeful micro-interactions. Decorative effects must never
reduce contrast, readability or mobile performance.

## 4. Information architecture

### Homepage order

1. **Hero:** one factual promise, two actions, and a compact visual system
   signal. No duplicated statistic row.
2. **Choose your path:** Home Assistant, automations, ESPHome, product guidance,
   and AI. Each card has a distinct purpose and one destination.
3. **New here:** a three-step preview leading to the dedicated start page.
4. **Recommended guides:** a small curated set, grouped by user intent rather
   than a long undifferentiated grid.
5. **Latest AI news:** up to three current entries plus archive/RSS links. This
   section degrades gracefully when there are no entries.
6. **Trust and method:** practical testing, source transparency, local-first
   focus, corrections/contact, and disclosure links. Claims must be verifiable.
7. **Final action:** start with Home Assistant or search the guide library.

The homepage must not claim “100% Danish” because the site is bilingual, “zero
cloud” because the public site and some integrations use cloud services, or a
fixed publishing cadence unless the cadence is programmatically true.

### New start pages

- `/da/start-her/`: Danish guided entry point.
- `/en/start-here/`: English equivalent.

Each page explains platform choice, installation, first integrations, device
protocols, first automation, backup/security, and recommended next steps. It
links to existing canonical guides rather than duplicating their instructions.

No other new section is added unless implementation evidence shows a genuine
navigation gap. Existing Home Assistant, ESP32, products, automation, AI,
security, legal, about and contact sections remain canonical.

## 5. Components and boundaries

### Homepage shell

The Danish and English MDX pages own locale-specific editorial copy and compose
focused Astro components. Shared layout and styling live in components so the
two locales cannot drift structurally.

### Hero

The hero accepts locale-specific title, description and action labels. Its
illustration is lightweight, locally hosted and decorative where appropriate.
The heading hierarchy contains one visible page `h1`.

### Path and guide cards

Cards use semantic links, concise descriptions and consistent focus/hover
states. They are usable with keyboard, touch, reduced motion and 200% zoom.

### Latest-news module

The module reads the existing AI-news collection at build time, filters index
pages, sorts by validated publication date and renders at most three entries.
It does not write files, fetch remote feeds, alter article frontmatter or change
the automation’s date-based naming convention.

### Metadata

Existing custom `Head.astro` remains the single metadata/schema boundary. New
homepage/start-page metadata extends that boundary instead of introducing a
second competing SEO system.

## 6. AI-news safety contract

The daily automation is a protected subsystem.

- Preserve all content already present on fresh GitHub `main`, including daily
  issues through 2026-07-10.
- Preserve the existing Danish/English paired article model, date slugs, RSS
  routes, images and append-only automation behavior.
- Do not modify generation prompts, source selection, systemd installation,
  PR/merge flow or article templates unless a failing test proves that a change
  is required for compatibility with the homepage.
- Add regression coverage proving homepage rendering works with zero, one and
  multiple news entries and does not write to news directories.
- Run the existing `ai-news:test` and `ai-news:validate` gates before and after
  implementation.
- Before push, compare the branch against current `origin/main`; incorporate any
  news-only commits that arrived during development before final validation.

## 7. SEO and discoverability

### Page metadata

- Unique, useful Danish and English titles and descriptions.
- Self-referencing canonical URLs.
- Reciprocal `da`/`en` hreflang plus `x-default` where appropriate.
- Valid Open Graph and social images with descriptive alt text where images are
  content-bearing.
- No unsupported freshness, scale or independence claims.

### Structured data

Keep the existing organization and website entities. Homepage markup should
describe the site as a guide/educational portal without inventing ratings,
reviews or author credentials. Start pages use appropriate `WebPage` and
breadcrumb entities. AI-news pages retain their existing `NewsArticle` and
source citation handling.

### Internal linking and crawlability

The homepage links directly to the primary topic hubs and start pages. All new
routes appear in the generated sitemap. Navigation and content links remain
usable without client-side JavaScript. `robots.txt`, RSS endpoints and legacy
redirect behavior remain intact.

### Performance signals

Avoid new client-side frameworks, remote font dependencies and autoplay media.
Use responsive local images with explicit dimensions. Keep homepage JavaScript
minimal and prevent layout shifts. Validate production output rather than only
development mode.

## 8. Security and privacy

- Update vulnerable direct dependencies to patched, compatible releases and
  regenerate the lockfile. Confirm remediation with `npm audit --omit=dev`.
- Treat development-server-only advisories separately from production exposure,
  but do not leave a patched direct dependency unapplied without evidence.
- Preserve strong live headers: HSTS, CSP, `nosniff`, frame protection,
  referrer policy, permissions policy and cross-origin policies.
- Add automated assertions for security headers/middleware so future deploys do
  not silently regress them.
- Keep GitHub workflow permissions at minimum required scope and pin/update
  actions deliberately.
- No secrets, analytics IDs, tokens or private Home Assistant data enter source,
  generated HTML, logs or documentation.
- External links that open new contexts use safe relationship attributes.
- Consent/analytics behavior remains compatible with the existing Google CMP;
  no tracking is added as part of the redesign.

## 9. Accessibility and responsive behavior

- WCAG 2.2 AA is the implementation target for contrast, focus visibility,
  semantics, keyboard operation and motion preferences.
- Touch targets remain comfortably usable on small phones.
- Layouts must work at 320 px width and at 200% browser zoom.
- Decorative visuals are hidden from assistive technology; meaningful images
  have concise alternative text.
- Heading levels are sequential and links make sense out of context.
- Dark and light themes remain usable even if the dark theme is visually
  primary.

## 10. Known defects included in scope

- Correct the JavaScript examples in both Danish and English Node-RED guides
  that currently fail the content syntax audit.
- Remove homepage duplication and misleading static claims.
- Verify all homepage/start-page links and both locale routes.
- Resolve production dependency advisories where compatible patches exist.
- Investigate any additional build, browser, accessibility, SEO or security
  failures found by the expanded gates and fix root causes within this site.

Unrelated rewrites of the 199-page content library are out of scope. Findings
outside the touched surfaces are fixed only when they are clear correctness,
security or broken-user-journey defects.

## 11. Testing and completion evidence

### Automated gates

- Existing AI-news test suite and news-content validator.
- Existing content audit with zero syntax, link and image issues.
- Existing production Astro build and SEO validator.
- New tests for homepage information hierarchy, truthful copy, start-page
  parity, latest-news isolation, security headers and required metadata.
- Dependency audit with no known high or critical production vulnerability;
  any lower-severity exception must be documented with exposure and upstream
  status.

### Browser verification

Run the production site locally and inspect Danish and English homepages, both
start pages, the AI-news index, one recent AI-news article, a representative
guide, navigation/search, 404, legal links and locale switching. Verify desktop
and mobile layouts, keyboard navigation, visible focus, reduced motion, console
errors and network failures.

### Delivery verification

Review the scoped diff for secrets, generated artifacts and accidental article
deletions. Rebase or merge current remote `main`, rerun all gates, commit with a
clear history, push the feature branch, merge through GitHub, observe the
Cloudflare deployment, then smoke-test the live canonical URLs and headers.

## 12. Success criteria

The redesign succeeds when:

1. A new visitor can choose a useful path from the first viewport.
2. An experienced visitor can reach search or a topic hub immediately.
3. The homepage is shorter, more deliberate and visually coherent than the
   current catalogue layout.
4. Danish and English routes have structural and metadata parity.
5. Daily AI news continues to publish without data loss or template breakage.
6. The two known Node-RED syntax defects are gone.
7. Automated content, build, SEO, news and security gates pass.
8. Mobile, keyboard and accessibility checks pass without material issues.
9. The final commit is on GitHub and the successful production deployment is
   verified on `https://smartbolig.net`.

