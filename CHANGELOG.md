# Changelog

## Unreleased

- Titles and links in the guides: 39 pages have a title that says what the page is about within 60 characters and in proper Danish on the Danish pages ("LED-strip med ESP32"). Section pages and the contact page keep a short heading ("Automationer") and get the fuller title in search results and on social cards through a new `seoTitle` field. 18 guides that few pages linked to are linked from related guides in both languages. Headings and callouts no longer carry a year that goes out of date, and eight product pages show plain lists where raw diagram code was printed as text. `CONTENT-GUIDE.md` has the rules for titles; `npm run seo:validate` checks a section page.
- Search engines: old addresses that answered 404 now redirect with 301 (`/kontakt`, `/sitemap.xml`, `/index.html`, `/produkter/*`, `/da/products/*`, `/en/products/*`). `robots.txt` no longer has groups for Googlebot and Bingbot, which made them skip the `Disallow` lines for `/api/` and `/pagefind/`; the crawlers allowed by name repeat those lines, and `Crawl-delay` is gone. The HowTo structured data (invalid on 50 of its 52 pages) and its component are removed. `og:type` is `article` only on guides and news issues, the homepage has no one-item breadcrumb list, the organization links to the YouTube channel, the logo links to `/da/` and `/en/` without a redirect, and there is one `generator` meta instead of two. A product address without the closing slash is one redirect instead of two. `robots.txt` now blocks Anthropic's training crawler (`ClaudeBot`), like the other training crawlers; `Claude-User` and `Claude-SearchBot` stay allowed. `npm run seo:validate` checks `robots.txt`, HowTo, `og:type`, breadcrumbs and the generator meta on the built pages. New guide: `docs/seo.md`.
- The homepage's 3D house is drawn in a worker (OffscreenCanvas), so the page can be scrolled and clicked while the model starts and while it moves. Measured in headless Chrome with a graphics card: the page's thread was blocked for 2,502 ms while the house started and is now blocked for about 30 ms; at rest it was busy 0.78 s per second and is now busy 0.15 s. The first picture is shown only when every shader is compiled, or after 2.5 s at the latest. Before anything is fetched, the page asks the browser where the house can be drawn (`probe.mjs`): a browser whose workers have no WebGL (Safari 16.4 to 16.6) draws on the page, and a browser that draws WebGL in software keeps the still picture without downloading three.js. See `docs/3d-hus.md`.
- The assistant searches the site's own index instead of Cloudflare AI Search (which is billed from 2026-12-01). The index is built from the built pages as the last step of `npm run build` (`scripts/site-index.mjs`) and is read by the Worker from its static files under `/_index/`: at most 19 small JSON files per question, no outside service. Ranking is BM25 with light Danish and English stemming (singular, plural and definite forms are one term) and splitting of Danish compound words. Sections without text, sections that are only links, the comments heading and text repeated on three pages or more are left out; every tab of a tabbed block is read. When a question names something the site has a page about, every result must be about it, and results far below the best one are dropped, so a weak match does not become a source link. A fixed set of questions is asked after every build and stops it if a page drops out of the three best answers. The `ai_search` binding is removed from `wrangler.jsonc`. The privacy policy (both languages) and the README now describe the site's own index instead of AI Search. See `docs/assistent.md`.
- The chat endpoint `functions/api/chat.js` is split into small modules under `functions/lib/chat/` (limits, responses, request, sources, prompt, search tool, YAML request and checks, answer, runtime, agent, handler). The split itself moved code without changing behaviour; `functions/api/chat.js` still exports `onRequest` and the names the tests use. The README lists where each part lives.
- Automatic dependency updates: Dependabot checks npm packages and GitHub Actions every Monday and waits 14 days before taking a new version (security fixes do not wait: Dependabot alerts and security updates are switched on for the repository). Small npm updates (a patch, or a minor of a package that has reached version 1) are merged by `.github/workflows/dependabot-automerge.yml` (rules tested by `scripts/site-dependabot.test.mjs`) once the `deploy` check has passed on that commit; the gates then run on `main` so the dependency audit follows. Major updates, minor updates of 0.x packages (`@astrojs/starlight`, `three`, `sharp`, `esbuild`) and GitHub Actions stay open for a human. See `docs/opdateringer.md`.
- Six new guides in Danish and English, each reviewed and corrected by an independent model against official sources: the electricity meter through the HAN port, choosing hardware for Home Assistant, solar panels and home battery, running appliances in the cheapest hours (Nord Pool), holiday mode, and a smart home in a rented flat without drilling. They are linked from their section pages and the sidebar. The ESP32 picture's alternative text now describes the development board it shows.
- Dependencies: Astro 7.2.8 to 7.4.7 (with `@astrojs/markdown-remark` 7.3.0, which Astro now requires) and updated transitive packages close the open `npm audit` findings in Astro, `postcss-selector-parser`, `smol-toml` and `fast-xml-parser`; `npm audit` now reports 0 vulnerabilities.
- Fixes from the independent review before release: the tour's inactive chapters step back in colour instead of opacity (their text keeps its contrast, and a chapter with keyboard focus is never dimmed); a table is a tab stop and a named region only while it is wider than the column, and is named after the heading above it; the homepage goes back to the still picture if the browser takes the graphics context away; the date a page was updated stands once (at the top), and English dates are British; the source list on the news overview has a heading; the assistant button no longer covers the open menu on phones; files under `/_astro/` are cached for a year; the banners for garden and energy guides are reframed.
- AI news pictures show the article's main story as the headline instead of "AI news, <date>", and carry no language-specific text (the brand, "AI", the date as `2026-11-14`, the sources), so the Danish and the English article share one picture. All 64 issues were re-rendered. The rule for the main story lives in one place (`scripts/lib/news-lead.mjs`) and is used by the picture, the news overview and the homepage.
- Homepage news: each of the three newest articles is named after its main story instead of "AI news, <date>" (the date already stands beside it). The rows come from the same selection as the news overview, so the separate homepage selection is removed.
- ESP32 has a close-up of its own: a development board on a breadboard with a sensor, a light diode, jumper wires and a phone showing the reading, rendered with the same kit and light as the 3D house. It replaces the living-room picture on the homepage's ESP32 card and at the top of the ESP32 and DIY guides. The scene lives behind `src/lib/house3d/stills.mjs`, which only the picture renderer bundles, so the homepage downloads nothing extra.
- AI news overview rebuilt: one line with the number of articles and the RSS feed, the newest article as a large card with its picture and its stories numbered below, and the earlier articles grouped by month with one row each (small picture, date, main story, the other stories on one line). The list of official sources is closed until it is opened. The page is at least 40 % shorter.
- AI news header images redrawn in the new graphite-and-green design, with all text as outlined paths from the site fonts so CI and local renders are identical. All 64 issues were re-rendered (30 MB to 11.5 MB).
- Guide pages: every guide opens with a breadcrumb, the title, the date it was updated and a picture rendered from the 3D house that fits the topic (twelve motifs, chosen from the path in `src/lib/guide-art.mjs`); a guide with a lead picture of its own keeps it. Headings, card titles and tab labels are shown without a leading emoji, tables fill the column and scroll sideways in a focusable wrapper, cards use one icon colour and tips use the brand colour. The sidebar opens on the section the reader is in, with the other sections collapsed below it. New footer with link columns (guides, about, follow: news, RSS, YouTube, GitHub) and the legal links. See "Guidesider" in `docs/designsystem.md`.
- Homepage rebuilt around a realistic 3D house (three.js, MIT, loaded on demand): a cut-away smart home with furniture, devices, garden, solar panels and an EV, lit for morning, day, evening and night. A still picture rendered from the same model shows at once; the live model replaces it after the page has loaded (on phones after the first touch or scroll, never unasked with Save-Data). The visitor can pick a time of day, turn the house and follow the tour "A day in a smart home", where the camera flies to what each chapter is about. Without WebGL or JavaScript the still picture and all text remain. New search field in the hero opens the site search.
- Homepage sections below the tour: the five topics are picture cards with stills rendered from the 3D house (one large, four small), the featured guides open with a morning picture of the house, and the order is now topics, three stages, featured guides, news, trust, closing. The animated SVG topic scenes are removed. `npm run house:posters` renders every still from one list (`PICTURES`), and a picture can have a camera of its own.
- Colour tokens v2: neutral graphite surfaces with one brand colour, a brand gradient, time-of-day colours and a stage colour for the 3D house. The browser theme colour, manifest and generated brand files follow the new values.
- Removed the CSS-only house illustration, the stock hero photo and its image script (`images:home`).
- New design for the whole site in both languages: an airy look in a dark theme (the default) and a light theme the visitor can pick with the theme switch. All colours, sizes, radii, shadows and motion come from one set of design tokens (`src/styles/tokens/`); the Galaxy theme and Tailwind are removed, and the two fonts (Figtree, Bricolage Grotesque, OFL-1.1) are served from the site itself. See `docs/designsystem.md`.
- Own header with a live SVG logo, redesigned 404 page, news overview, product cards, FAQ, comments and footer on the same tokens. `Head.astro`, the 404 page, the news feed and the AI assistant are split into small single-purpose files.
- Fixed: the AI assistant could not be clicked on wide screens because the table of contents covered it; its smallest text was 6 px and is now at least 13 px; ad links in tables were unreadable (blue text on a blue button) and are now a soft chip per merchant.
- Added `docs/oss.md` (the open source the site uses, with versions and licences) and the design decisions B20–B27 and B29 in `docs/redesign/BESLUTNINGER.md`.
- Accessibility and print: printing uses the light theme and leaves out the menus, the assistant and the comments; the chosen state on the homepage and in the header is no longer shown by colour alone; tap targets in the header, footer and assistant are at least 44 px; pages without a sidebar show the section links in a second header row on small screens; all text is at least 13 px. On phones narrower than 400 px, pages with a menu drop the language link from the header (the menu still has the language and theme choice), so the name and the buttons never overlap. A web manifest makes the generated app icons usable; the CSP no longer allows the Google Fonts hosts and now allows the comment widget's own stylesheet from giscus.app.
- Replaced every static brand file with the new house mark: favicon (SVG, ICO), touch icon, app icons, logos and the default social image are generated from one script (`npm run brand:build`) with the wordmark outlined from the site font; removed the old brand folders, loose logos and unused source images.
- Removed the host runners for AI News (Windows Scheduled Task, systemd timer, OpenClaw cron) with their installers, failure notifier, staleness shell check, PR-identity, retry-state and public-check helpers and their tests, plus the opt-in ComfyUI image path, the unused `scripts/indexnow-ping.sh` and a stale research note. GitHub Actions is the only publishing path; the workflow and deploy tests stay. The first real run in GitHub Actions published the 2026-11-14 issue (12 model calls, 3,282 neurons).
- AI News moved from a Windows Scheduled Task to GitHub Actions (`.github/workflows/ai-news.yml`) and now publishes on its own. Each story is written and fact-checked separately against its one source by a different model; a story that cannot be corrected is dropped without taking the others with it, and a day with fewer than three verified stories publishes nothing and does not block the next day. The same gates as a deploy run before anything is committed to `main`. Every run's summary shows the outcome and the reasons; one GitHub issue is opened only when nothing has been published for three days.
- Models run on Cloudflare Workers AI through a private relay Worker (`workers/news-llm/`) with a key, a model allowlist, a per-minute limit and a hard daily neuron ceiling below the free allowance. GitHub Models, the previous plan, was retired by GitHub.
- News sources: article text is now cut from `<article>`/`<main>` instead of the whole page (navigation used to fill most of the evidence the models saw), the Anthropic listing parser follows the current markup, and Google DeepMind, Mistral, the Home Assistant blog and Ollama releases were added as official sources.
- `deploy.yml` can be called by the news workflow, decides in one place whether a run publishes, runs production deploys one at a time and validates the relay Worker's configuration.
- Removed the one-off archive regeneration tool and the whole-issue copy module it used.

- Blocked numeric-prefixed and Markdown-escaped URL autolinks in AI News text, restored plain news-overview headlines and matching section links, and limited Windows PR CI polling to workflow runs whose head repository is SmartBolig itself.

- Added Danish/English guides for secure Home Assistant remote access, motion lighting with explicit manual override and sensor health monitoring. Linked all three pairs from translated sidebar entries and category overviews, with official sources, practical verification steps and documented restart or connectivity limits.

- Centralized approved Partner-Ads merchants and validated deeplink destinations for Proshop, Specialkamera, RobotterOnline, WATTOO and Batteribyen. Purchase buttons now disclose advertising in both locales, Danish product guides disclose before purchase links, raw commercial links use the shared component, and partner disclosures reflect the active agreements.

- AI News now starts GitHub release evidence at the release notes instead of site navigation, reads current Anthropic listing titles with the displayed calendar date, and has source health count only parseable articles. A factual rejection can trigger at most two corrected candidates with complete bounded feedback; every candidate receives a fresh independent review, and a final rejection or process failure still stops the draft. Release-note bullets cannot justify invented file names, error wording or test procedures.
- Kept native stdout, stderr and the failing stage in Windows AI News task transcripts, including tasks without an attached console. Harmless GitHub CLI notices no longer abort Windows PowerShell 5.1 polling; genuine failures and exact commit checks remain enforced.
- Fixed the Windows AI News runner leaking live Claude-generation flags and its result path into fixture tests. Generation still requires independently reviewed LLM copy; temporary result state is cleaned up even on failure. Both Windows shells have a regression check.
- Updated Astro to 7.2.8, Sharp to 0.35.4 and Wrangler to 4.131.0, including patched js-yaml/SVGO dependencies. Preserved the existing Markdown/GFM processor with Astro's explicit compatible peer dependency. The daily runner audits all dependencies before spending time on news generation.
- Gave the three latest published AI news articles a prominent section directly below the homepage hero, with images, dates, archive/RSS links and a direct news link in the hero in both languages.
- Expanded homepage motion with five distinct animated SVG topic scenes, travelling signals and light/radar effects in the hero, scroll entrances, interactive news/guide cards and an animated starter journey. A visible, shared Start/Pause control supports explicit reduced-motion opt-in, saved preferences and device-setting reset; offscreen scenes and hidden tabs pause. Static content remains visible without JavaScript.
- Redesigned the homepage around Galaxy's existing blue/gray visual identity, with a custom animated SVG connected-home scene, a native pause control, reduced-motion support, larger topic cards, a connected starter journey and photographic guide imagery. Shared header and guide styling remain theme-owned.
- Fixed Windows news-runner argument forwarding: Git's `-C` no longer binds to the wrapper's command parameter, and quoted GitHub JSON field lists survive script adapters. Added regressions in Windows PowerShell 5.1 and PowerShell 7, including paths with spaces and native failures.
- Refreshed both homepages with a larger home photograph, green accents, clearer typography, topic icons, an illustrated featured guide and responsive news cards. Preserved guide navigation, search, chat, light/dark themes and reduced-motion support without adding client JavaScript or dependencies.

- All news fetchers share host, redirect, DNS-address, deadline and streamed response-size controls. HTTPS connections use the validated addresses, including archive regeneration and source-health checks.
- Updated Wrangler to 4.129.0; CI audits development dependencies as well as site dependencies.
- Fixed native Windows Bash checks and URL path handling in the content audit, empty remote branch handling in the daily publisher, and English-only changed-issue quality checks.
- RSS omits navigation indexes and unavailable publication dates instead of inventing dates. Both languages use the same selection rules.
- Chat Enter respects text composition. Theme controls tolerate unavailable browser storage and reconnection.
- Removed mutable repository MCP startup entries, consolidated the build task, and refreshed contributor documentation.

## 2026-07-31

- Extended the Gemma timeout after production tail logs proved that otherwise
  valid English requests could hit the previous 40-second limit under load.
  The Qwen fallback prompt now selects a separate Home Assistant YAML contract
  for editor output, `configuration.yaml`, `automations.yaml`, or an automation
  blueprint. Post-inference validators enforce each requested root shape,
  current `triggers`/`actions` keys, top-level mode placement, and reject
  invalid wrappers, list roots, singular legacy keys, and invented `max_runs`.
  Non-Home-Assistant YAML remains outside this specialist validation, and
  malformed model output fails closed. The browser/diagnostic ceiling is
  aligned at 180 seconds.
- Prevented broad technical answers from ending mid-sentence by increasing the
  reasoning-aware completion budgets, tightening the response-length prompt,
  treating provider token-limit finish reasons as invalid, and recognizing
  dangling legacy responses even when finish metadata is absent. A truncated
  primary answer now uses Qwen; a truncated fallback fails closed. Oversized
  answers are rejected instead of being silently cut at the public character
  cap, while explicit provider `stop` reasons remain authoritative.
- Replaced the weak 8B fallback with Cloudflare-hosted Qwen3 30B-A3B and added
  strict final-answer checks for internal retrieval leakage and explicitly
  requested fenced YAML or automation modes.
- Separated the tool-enabled planning prompt from the post-retrieval answer
  prompt. Final primary and fallback calls can no longer be told to invoke a
  search tool that is not actually available, closing the live
  `search_smartbolig` command leak.
- Tightened technical-answer instructions against invented UI controls and
  related-but-noncompliant code examples. Invalid fallback output now fails
  closed rather than being displayed as a plausible answer. Explicit YAML
  mode requirements accept only active top-level keys, handle every requested
  mode and do not turn conceptual questions into literal syntax requirements.
- Turned the bilingual assistant into a technical AI console with four visible,
  editable work modes for debugging, building, explaining and comparing. The
  modes add no hidden system prompt or permissions.
- Added an honest active-request display that measures elapsed browser wait
  time without claiming access to internal model progress.
- Added per-answer operational diagnostics for the allowlisted model route,
  bounded edge duration, request trace and validated source count. Traces carry
  no prompt or answer data, and the rail is explicitly not a correctness score.
- Added DOM-only fenced code and YAML consoles with preserved indentation and a
  dedicated copy button; model-generated HTML remains prohibited.
- Fixed follow-up questions after long answers by bounding persisted and
  retransmitted context to the API contract while keeping the fresh answer
  fully visible.
- Fixed live chat failures in the primary 26B Workers AI inference path. Gemma
  remains the quality-first model with a 55-second budget and 2,400-token cap;
  each Gemma call can make one bounded 25-second Qwen3 30B-A3B fallback attempt
  with 1,600 tokens. The browser's 180-second cap covers the conservative
  two-run AI Search path, both possible fallbacks and network overhead. Empty
  primary responses also fall back, and every fallback stage emits a sanitized
  request-correlated log.
- Rebuilt the 404 page as a Home Assistant "entity unavailable" card in the
  site's own palette, replacing the off-brand indigo page. It shows the path
  that failed, and suggests the closest real guides from a build-time index of
  every page instead of the same four static links.
- Gave the 404 page a logbook, a `device_class: skuffelse` / `disappointment`
  attribute, and a "Restart Home Assistant" button that restarts, fails, and
  says so. Danish and English are written separately rather than translated,
  and a path with no language prefix now follows the browser's language.
- Expanded reviewed official coverage to seven Home Assistant and ESPHome
  evidence packages: automation troubleshooting, automation modes, template
  states, Home Assistant security, ESPHome security, safe mode, and sensors.
- Generalized the official source badge for both products and added the API
  field `officialVerifiedAt` so clients can see the oldest review date used.
- Kept the official documentation out of AI Search; the registry stores only
  short reviewed paraphrases and direct allowlisted source links.
- Tightened evidence matching so generic internet, alarm-state, Raspberry Pi,
  GitHub Actions, Node-RED, ordinary post-update restarts, sensor class/filter
  choice, template-card styling, standalone non-HA YAML, trigger/condition
  selection, operational meanings of secure/recover, entity exposure, and
  non-ESPHome safe-mode questions cannot receive an official badge.
- Added verified Home Assistant evidence for automation troubleshooting. The
  assistant now distinguishes reviewed official facts, SmartBolig-assisted
  answers, and general AI knowledge.
- Corrected the Danish and English trace guides: YAML-created automations need
  a unique `id` before Home Assistant stores debug traces.
- Added a 50-prompt Danish/English regression suite and lowered model
  temperature from `0.35` to `0.1` for less variable technical answers.
