# SmartBolig homepage and AI editorial redesign

**Date:** 2026-07-11  
**Status:** Approved direction; written-spec review pending  
**Repository:** `Hovborg/smartbolig-starlight`  
**Base:** `main` at `bfe6256` after AI News source-of-truth repair (PR #87)

## 1. Outcome

SmartBolig becomes a smart-home-first guide portal with a stronger editorial
front page. Visitors must immediately understand that the site helps them build
and operate a better smart home, while current AI developments appear early and
visibly without turning the whole site into a generic AI-news publication.

The work combines five coordinated tracks:

1. a clearer, image-led Danish and English homepage;
2. a higher-quality, still-automatic AI News pipeline;
3. six new durable AI guide pairs;
4. a separately gated Astro 7 migration that removes the four remaining low
   esbuild advisories;
5. Google AdSense readiness review and reapplication as the final external
   action.

The previously approved site-overhaul and four-guide specifications remain in
force. In particular, the Energy Dashboard guide is international and must not
be framed as Denmark-only.

## 2. Evidence behind the direction

The 2026-07-11 audit found:

- the live desktop AI News section begins far below the first viewport;
- homepage news cards have no images;
- the hero uses an old generic blue smart-home image;
- recent articles repeatedly use the same source and paragraph patterns;
- the 2026-07-10 issue repeated all six sources from 2026-07-09;
- the AI News image directory is roughly 364 MiB for 216 files;
- daily publication works, but its stale local overlay briefly reverted tracked
  safeguards on `main`; PR #87 removed that unsafe boundary.

Google's current guidance favours people-first content with original value,
clear authorship, useful navigation, appropriate `NewsArticle` structured data,
and relevant large images. Discover-oriented images should be at least 1200 px
wide, preferably 16:9, non-generic and enabled by
`max-image-preview:large`. AdSense readiness likewise depends on unique useful
content and a usable, transparent site rather than publication volume alone.

## 3. Chosen homepage direction

Use a **smart-home guide portal with an early editorial rail**.

The homepage must not become a chronological news wall. Its first screen keeps
the smart-home identity, primary guide action and search/topic access. Current
AI developments then appear directly after the hero as a compact editorial
surface with one lead story and two supporting stories.

### Page order

1. **Smart-home hero:** concise promise, primary start action, secondary search
   or guide action, and a new locally hosted image that depicts an inhabited,
   practical smart home rather than abstract blue technology.
2. **Latest strip:** a compact line for the newest update and archive/RSS route.
3. **AI editorial rail:** one image-led lead article plus two supporting cards,
   with publication date, clear topic label and useful summary.
4. **Choose your path:** Home Assistant, automations, ESPHome, products and AI.
5. **New here and recommended guides:** focused next steps, including selected
   new AI guides when published.
6. **Trust and method:** sources, testing approach, corrections/contact and
   disclosures.
7. **Final action:** start, search or browse all guides.

### Visual rules

- Create a coherent hero and editorial image family rather than isolated stock
  images.
- Prefer warm, real-world rooms, visible devices and subtle interface cues;
  avoid people where identity adds no value, fake dashboards, text baked into
  images, logos and generic glowing circuit brains.
- Preserve readable contrast and reserve decorative effects for backgrounds.
- Use local AVIF/WebP derivatives, explicit dimensions, `srcset` and `sizes`.
- The lead image is 16:9 and at least 1200 px wide; smaller responsive variants
  are generated from the same approved master.
- Mobile stacks lead story before supporting cards without overlapping text.
- Reduced motion, keyboard navigation, 200% zoom and 320 px width remain usable.

## 4. Homepage component boundaries

- Danish and English pages own translated editorial copy.
- Shared Astro components own layout, query logic and styling so the locales
  cannot drift structurally.
- The homepage news query is read-only, bounded and deterministic. It reads
  validated content from the existing collection and never writes article or
  image files.
- Zero, one, two and three-or-more available stories all render intentionally.
- One visible `h1` remains; section eyebrow text stays in normal flow and cannot
  overlap the heading.
- `Head.astro` remains the single metadata and structured-data boundary.

## 5. AI News editorial model

The goal is fewer, stronger editorial decisions while keeping unattended daily
operation. Automation may skip a date when there is no sufficiently important,
well-supported story. A skipped day is success, not an outage.

### Source discovery and selection

- Start with official release notes, documentation, system cards, research
  papers and company announcements.
- Use secondary reporting only when it adds independent context, criticism or
  operational impact.
- Fetch and analyse the underlying source pages; do not draft from titles and
  snippets alone.
- Track canonical URL, publisher, event date, retrieval date, topic, entities
  and a stable story fingerprint.
- Deduplicate against a configurable recent window using canonical URLs plus
  semantic story/entity similarity. Reusing a source is allowed only for a
  genuinely new development and must be justified by new facts.
- Rank candidates for significance, SmartBolig relevance, evidence quality,
  novelty, practical consequence and source diversity.

### Article contract

Every issue must answer:

1. What changed?
2. What is directly supported by the sources?
3. Why does it matter to a SmartBolig reader?
4. What should the reader verify, try or watch next?
5. What remains uncertain?

Articles must contain original synthesis, specific facts and source-linked
claims. Repeated boilerplate such as “official source”, “for SmartBolig
readers” and “next step” cannot be mandatory prose. Headings and shape should
follow the story rather than a fixed paragraph template.

The Danish and English versions must have equivalent evidence and meaning, but
may use natural language-specific phrasing. Public copy must not expose internal
automation labels, scores or agent terminology.

### Quality gates

Publication is allowed only when automated checks confirm:

- at least one primary source and sufficient corroboration for material claims;
- no near-duplicate story or source set within the recent window;
- source URLs resolve and publication/event dates are plausible;
- all required frontmatter, paired locales, images and structured data exist;
- summaries, titles and body text pass similarity/boilerplate thresholds;
- no unsupported certainty, invented quotation or internal operational text;
- production build, SEO, content and AI News suites pass.

Borderline candidates produce an internal skip/report result. They do not open
an empty PR or fabricate a daily issue to satisfy cadence.

### Image pipeline

- Generate or select one story-specific master image only after the story is
  approved by the editorial gate.
- Prompts describe the concrete subject and consequence of the story; generic
  “AI brain” art is rejected.
- Create 16:9 responsive AVIF/WebP variants and a social fallback with explicit
  dimensions and meaningful alt text.
- Enforce file-size budgets and reject oversized, duplicate or missing assets.
- Keep legacy images addressable, but handle bulk recompression as a measured
  migration with visual comparison and rollback, not an unreviewed rewrite.

## 6. Automation architecture and safety

`origin/main` is the only source of tracked code and configuration for daily AI
News jobs. The stable local systemd path may launch the job, but it must never
copy its checkout files over a fresh repository worktree.

The runner sequence is:

1. fetch and hard-reset the isolated worktree to `origin/main`;
2. discover and rank candidate stories;
3. exit successfully with a recorded reason when no candidate passes;
4. draft both locales and generate responsive assets;
5. run all editorial, content, audit, build and SEO gates;
6. commit only the intended dated content/assets and necessary generated index
   data;
7. open a PR, wait for GitHub checks and merge only on success;
8. notify through the existing failure path on genuine failures.

Tests must permanently reject `SYNC_ITEMS`-style overlays, unbounded rsync from
a local site root, unintended changes outside allowlisted generated paths,
duplicate dates, partial locale pairs and publication after a failed gate.

## 7. SEO, Discover and trust

- Preserve canonical, reciprocal `hreflang`, sitemap, RSS and
  `max-image-preview:large` behavior.
- AI News articles retain `NewsArticle` with headline, dates, image variants,
  author/publisher and canonical URL.
- Add visible and accurate author/editorial-method information, source links,
  correction route and AI-assistance disclosure without pretending an AI is a
  human author.
- Avoid scaled-content signals: novelty and usefulness outrank daily volume.
- Strengthen internal links from news to durable guides only when the guide
  genuinely helps with the reported development.
- Validate rendered HTML and Google's rich-result requirements; schema alone is
  not proof of ranking or Discover inclusion.

## 8. Six new bilingual AI guide pairs

Create Danish and English versions with matching technical meaning:

1. **AI in Home Assistant: local Ollama versus cloud models** — architecture,
   hardware, privacy, latency, costs, fallback and verification.
2. **Safe AI agents and tool access in the home** — least privilege, approvals,
   secrets, logs, rollback and safe automation boundaries.
3. **MCP explained** — servers, clients, tools, resources, authentication,
   permissions and household-security examples.
4. **ChatGPT, Claude and Gemini privacy controls** — current data controls,
   retention/training caveats, sensitive-data decisions and official sources.
5. **Local AI with Ollama** — hardware sizing, model selection, context limits,
   updates, network exposure and realistic limitations.
6. **From prompt to reliable workflow** — sources, structured outputs, human
   review, evaluations, failure handling and repeatability.

Each guide must be source-backed, practical, clear about changing vendor
behavior, contain verification checkpoints and avoid unsupported security,
privacy or performance claims. Vendor-specific facts require current official
sources during implementation. Routes and final titles are fixed in the later
implementation plan after checking existing information architecture and slug
collisions.

## 9. Astro 7 migration

Astro 7 is a separate breaking-change workstream, not an incidental
`npm audit fix --force` inside the homepage diff.

The migration must:

- update Astro, Starlight and coupled integrations to mutually supported
  versions using official migration notes;
- address Vite 8/Rust compiler, content collections, Markdown plugins, custom
  components, image handling and build-hook changes;
- update `package.json`, lockfile, config and documentation together;
- retain all routes, redirects, RSS, sitemap, schema, search and Cloudflare
  deployment behavior;
- pass the complete automated and browser matrix before merge.

Success removes the four low esbuild advisories. Until that separate migration
is green, they remain documented as Windows development-server-only findings;
there are no known moderate, high or critical production audit findings in the
verified Astro 6 baseline.

## 10. AdSense final phase

AdSense reapplication occurs only after the redesign, editorial pipeline,
guides, Astro migration, production deployment and live checks are complete.

Before the external submission:

- verify live navigation, useful original content, about/contact/editorial
  method, privacy/cookie/legal pages and mobile usability;
- verify no placeholder, thin, duplicated or broken pages in the submitted
  experience;
- confirm ads.txt, consent/CMP and publisher/account identifiers against the
  live AdSense account without exposing identifiers in reports;
- inspect Search Console/indexing signals and recent policy messages where
  accessible;
- record screenshots/URLs and the exact readiness evidence.

The actual reapplication is an external write. The user has explicitly placed
it in scope as the final task, but the submission must still be reported with
its exact result; approval by Google can never be claimed until Google confirms
it.

## 11. Delivery sequence

Implementation is split into independent, reviewable plans and PRs:

1. homepage structure, images and responsive editorial rail;
2. AI News discovery, deduplication, editorial gates and image optimization;
3. six bilingual AI guide pairs;
4. Astro 7 migration and dependency remediation;
5. combined production QA and live verification;
6. AdSense readiness evidence and reapplication.

The four-guide series from the existing specification may proceed alongside
the six AI guides only when file ownership does not overlap. One writer owns a
branch at a time, and current `origin/main` is incorporated before every final
gate so daily news is never lost.

## 12. Verification and completion bar

Every implementation PR must run the relevant subset, and final production QA
must run all of:

- `npm ci`;
- `npm run site:test`;
- `npm run ai-news:test`;
- `npm run ai-news:validate`;
- `python3 scripts/content-audit.py`;
- `npm audit --omit=dev --audit-level=high`;
- `npm run build`;
- `npm run seo:validate`;
- `git diff --check` and a protected-path diff;
- browser E2E on Danish and English homepages, news index, current article,
  representative old article, new guides, navigation/search, locale switching,
  404 and legal pages;
- desktop, mobile, keyboard, reduced-motion, console/network and layout-shift
  checks;
- GitHub PR checks, merge verification, Cloudflare deployment and live canonical
  URL/header/image smoke tests.

Image checks include intrinsic dimensions, responsive candidates, file budgets,
alt text and visual inspection for cropping, text overlap and mobile stacking.
AI News checks include an accepted strong-story fixture, duplicate rejection,
weak-day skip, source failure, image failure, partial-locale rejection and
unintended-diff rejection.

The work is not complete while any known failure is hidden, any claim is
unverified, documentation/config/dependencies are out of sync, or the AdSense
submission result has not been recorded.

## 13. Non-goals

- turning SmartBolig into a general-purpose AI news site;
- guaranteeing search rank, Discover inclusion, ad approval or revenue;
- publishing daily when evidence quality is weak;
- country-locking the Energy Dashboard guide;
- uploading private Home Assistant data or secrets;
- rewriting every historical AI News article before measuring the benefit;
- changing production models/providers or spending money without a separate
  explicit decision where costs arise.
