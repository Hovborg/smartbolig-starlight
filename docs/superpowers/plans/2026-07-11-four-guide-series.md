# Four-Guide SmartBolig Series Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish, integrate, test, and deploy four complete bilingual guide tracks for current Matter/Thread, fully local Assist, ESPHome Bluetooth Proxy, and a globally applicable Home Assistant Energy Dashboard.

**Architecture:** Guide pairs live in the existing locale-mirrored Starlight content tree. A source-level contract test protects routes, bilingual parity, mandatory sections, navigation, and the global Energy scope; the existing content, build, SEO, news, and browser gates protect rendered behavior. The current Matter URLs are updated in place while the other three tracks add six new canonical locale routes.

**Tech Stack:** Astro 6, Starlight 0.39, MDX, Node test runner, Pagefind, GitHub Actions, Cloudflare Pages.

## Global Constraints

- Danish and English files must have equivalent structure and technical meaning.
- Official Home Assistant, Open Home Foundation, ESPHome, and standards documentation are the primary technical sources.
- The Energy Dashboard guide is international and cannot require a Danish provider, tariff, or integration.
- Commands and YAML must remain directly pasteable and pass `scripts/content-audit.py`.
- Preserve `src/content/docs/da/ai/nyheder/`, `src/content/docs/en/ai/nyheder/`, `public/images/ai-news/`, and the daily news automation.
- Preserve `/da/home-assistant/thread-matter/` and `/en/home-assistant/thread-matter/` as the Matter canonical routes.
- Do not add another homepage section.

---

### Task 1: Add the bilingual guide-series contract

**Files:**
- Modify: `scripts/site-quality.test.mjs`
- Test: `scripts/site-quality.test.mjs`

**Interfaces:**
- Consumes: repository-relative `read(path)` helper already defined in the test file.
- Produces: a contract that later tasks satisfy with eight guide files and sidebar entries.

- [ ] **Step 1: Write a failing route and parity test**

Add a test with this route matrix:

```js
const guidePairs = [
  ["src/content/docs/da/home-assistant/thread-matter.mdx", "src/content/docs/en/home-assistant/thread-matter.mdx"],
  ["src/content/docs/da/home-assistant/lokal-stemmestyring-assist.mdx", "src/content/docs/en/home-assistant/local-voice-assist.mdx"],
  ["src/content/docs/da/esp32/bluetooth-proxy.mdx", "src/content/docs/en/esp32/bluetooth-proxy.mdx"],
  ["src/content/docs/da/home-assistant/energy-dashboard.mdx", "src/content/docs/en/home-assistant/energy-dashboard.mdx"],
];
```

For every pair, assert both sources have one frontmatter `title`, one `description`, at least five `##` sections, an official `https://` source section, and no top-level Markdown H1. Assert the new routes occur in `astro.config.mjs`.

- [ ] **Step 2: Add topic-specific invariants**

Assert both Matter files contain `matter.js`, `Matter 1.5.1`, `Thread 1.4`, migration, network visualization, commissioning, and troubleshooting. Assert both Assist files contain `Speech-to-Phrase`, `Whisper`, `Piper`, entity exposure, pipeline verification, and troubleshooting. Assert both Bluetooth files contain `bluetooth_proxy`, `esp-idf`, `connection_slots`, passive/active distinctions, and troubleshooting. Assert both Energy files contain grid, solar, battery, gas, water, EV, long-term statistics, power-versus-energy, and troubleshooting.

- [ ] **Step 3: Protect global Energy scope**

Assert the English Energy file does not contain `Energi Data Service`, `DK1`, `DK2`, or wording that makes Denmark a prerequisite. Assert both Energy files contain a sentence that regional price integrations are optional.

- [ ] **Step 4: Run the test and confirm RED**

Run `npm run site:test`. Expected: failure because the six new guide files and routes do not exist.

- [ ] **Step 5: Commit the failing contract**

```bash
git add scripts/site-quality.test.mjs
git commit -m "test: define bilingual guide series contract"
```

### Task 2: Replace the Matter and Thread guide pair

**Files:**
- Modify: `src/content/docs/da/home-assistant/thread-matter.mdx`
- Modify: `src/content/docs/en/home-assistant/thread-matter.mdx`
- Test: `scripts/site-quality.test.mjs`

**Interfaces:**
- Consumes: canonical routes and topic invariants from Task 1.
- Produces: current Danish and English Matter/Thread guides linked by later overview work.

- [ ] **Step 1: Rewrite matching frontmatter and section skeletons**

Use locale-correct titles and descriptions, followed by these equivalent sections: decision summary; protocol model; prerequisites; backup and Matter Server 9 migration; add a new device; share an existing fabric; bridges and multi-admin; network visualization; safe removal/recovery; troubleshooting; Zigbee/Z-Wave decision; official sources.

- [ ] **Step 2: Write verified migration and setup procedures**

Explain automatic migration only after a current Home Assistant backup, app update, first-start wait, integration/device validation, and rollback boundary. Cover Bluetooth commissioning, IPv6/mDNS, border routers, mobile permissions, fabrics, device sharing, certificate checks, and unsupported device-class caveats.

- [ ] **Step 3: Add pasteable diagnostic examples**

Use UI paths rather than invented shell commands. Any YAML example must use current `triggers`, `conditions`, and `actions` syntax and be directly pasteable.

- [ ] **Step 4: Run focused gates**

Run `npm run site:test` and `python3 scripts/content-audit.py`. Expected: series test still fails only for the other missing guide pairs; content audit reports zero issues for the Matter files.

- [ ] **Step 5: Commit**

```bash
git add src/content/docs/da/home-assistant/thread-matter.mdx src/content/docs/en/home-assistant/thread-matter.mdx
git commit -m "docs: update Matter and Thread guide for 2026"
```

### Task 3: Add the fully local Assist guide pair

**Files:**
- Create: `src/content/docs/da/home-assistant/lokal-stemmestyring-assist.mdx`
- Create: `src/content/docs/en/home-assistant/local-voice-assist.mdx`
- Test: `scripts/site-quality.test.mjs`

**Interfaces:**
- Consumes: Assist invariants and paths from Task 1.
- Produces: a phone-first, hardware-second local voice journey.

- [ ] **Step 1: Create equivalent guide skeletons**

Use these sections: outcome and locality boundary; hardware/software prerequisites; pipeline architecture; install Speech-to-Phrase or Whisper and Piper; create the pipeline; expose and name entities; verify on Companion app; add Voice hardware or ESPHome satellite; Danish-language notes/localized English notes; privacy; stage-by-stage troubleshooting; official sources.

- [ ] **Step 2: Write the phone-first setup**

Require a working Companion-app Assist test before dedicated hardware. Separate five checkpoints: audio input, transcription, intent match, Home Assistant action, spoken response. Explain when Speech-to-Phrase is preferable to Whisper and state that optional LLM/cloud integrations change the locality boundary.

- [ ] **Step 3: Write safe entity exposure guidance**

Expose only necessary entities, use areas/aliases, avoid exposing locks or security-critical actions without understanding confirmation behavior, and provide locale-correct example names without claiming unsupported Danish sentences.

- [ ] **Step 4: Run focused gates and commit**

Run `npm run site:test` and `python3 scripts/content-audit.py`, then:

```bash
git add src/content/docs/da/home-assistant/lokal-stemmestyring-assist.mdx src/content/docs/en/home-assistant/local-voice-assist.mdx
git commit -m "docs: add fully local Assist guides"
```

### Task 4: Add the ESPHome Bluetooth Proxy guide pair

**Files:**
- Create: `src/content/docs/da/esp32/bluetooth-proxy.mdx`
- Create: `src/content/docs/en/esp32/bluetooth-proxy.mdx`
- Test: `scripts/site-quality.test.mjs`

**Interfaces:**
- Consumes: Bluetooth invariants and paths from Task 1.
- Produces: ready-made and YAML-based proxy setup for the ESP32 library.

- [ ] **Step 1: Create equivalent guide skeletons**

Use these sections: use-case/limits; architecture; hardware choice; ready-made WebSerial path; manual YAML; adoption and verification; active connections and slots; placement and multiple proxies; safe framework/partition migration; troubleshooting; official sources.

- [ ] **Step 2: Add the current minimal Wi-Fi YAML**

Include `esp32` with `framework.type: esp-idf`, `wifi`, `logger`, encrypted `api`, platform-form `ota`, `esp32_ble_tracker`, and `bluetooth_proxy` with current defaults explained. Never include real credentials; reference `secrets.yaml`.

- [ ] **Step 3: Add Ethernet/PoE decision guidance**

Explain radio-sharing trade-offs without presenting one board's pins as universal. Explain passive advertisements versus active GATT connections, slot memory cost, service cache, supported-integration requirement, and resource conflicts with web server/voice.

- [ ] **Step 4: Run focused gates and commit**

Run `npm run site:test` and `python3 scripts/content-audit.py`, then:

```bash
git add src/content/docs/da/esp32/bluetooth-proxy.mdx src/content/docs/en/esp32/bluetooth-proxy.mdx
git commit -m "docs: add ESPHome Bluetooth Proxy guides"
```

### Task 5: Add the global Energy Dashboard guide pair

**Files:**
- Create: `src/content/docs/da/home-assistant/energy-dashboard.mdx`
- Create: `src/content/docs/en/home-assistant/energy-dashboard.mdx`
- Test: `scripts/site-quality.test.mjs`

**Interfaces:**
- Consumes: Energy invariants and global-scope rules from Task 1.
- Produces: an incremental measurement-first Energy Dashboard journey.

- [ ] **Step 1: Create equivalent guide skeletons**

Use these sections: measurement model; prerequisites and entity quality; grid first; optional solar; optional battery; optional gas/water; optional individual devices and EV; prices and tariffs by region; validation; trustworthy automations; troubleshooting; official sources.

- [ ] **Step 2: Explain power, energy, and statistics precisely**

Define W/kW versus Wh/kWh, cumulative totals, `device_class`, `state_class`, long-term statistics, import/export direction, and reset behavior. Do not tell users to convert power with a helper unless the source is compatible with the official integration/Riemann-sum method.

- [ ] **Step 3: Build the dashboard incrementally**

Require validation of grid consumption against a real meter before adding solar, battery, gas, water, device, EV, price, or tariff layers. Explain duplicate counting, negative values, unavailable samples, unit mismatches, source naming, and cloud-backed privacy caveats.

- [ ] **Step 4: Enforce international scope**

State that price integrations and tariff models vary by region. Link the existing Danish el-price guide only from a clearly optional Danish example in the Danish file; do not place Denmark-specific text in the English guide.

- [ ] **Step 5: Run focused gates and commit**

Run `npm run site:test` and `python3 scripts/content-audit.py`, then:

```bash
git add src/content/docs/da/home-assistant/energy-dashboard.mdx src/content/docs/en/home-assistant/energy-dashboard.mdx
git commit -m "docs: add global Energy Dashboard guides"
```

### Task 6: Integrate navigation and discovery

**Files:**
- Modify: `astro.config.mjs`
- Modify: `src/content/docs/da/home-assistant/index.mdx`
- Modify: `src/content/docs/en/home-assistant/index.mdx`
- Modify: `src/content/docs/da/esp32/index.mdx`
- Modify: `src/content/docs/en/esp32/index.mdx`
- Modify: `src/components/HomePortal.astro`
- Test: `scripts/site-quality.test.mjs`

**Interfaces:**
- Consumes: all routes produced in Tasks 2–5.
- Produces: locale-correct sidebar, overview, homepage, and cross-guide discovery.

- [ ] **Step 1: Add sidebar routes**

Add Matter/Thread, local Assist, and Energy Dashboard under appropriate Home Assistant groups, and Bluetooth Proxy under ESP32. Use `translations` for English labels and the route convention already used by the locale-aware sidebar.

- [ ] **Step 2: Add overview cards and restrained homepage discovery**

Add locale-correct overview cards. Replace existing homepage recommended cards only when one of the new guides is a stronger entry point; do not create another homepage section or increase the six-card count.

- [ ] **Step 3: Add intentional crosslinks**

Matter may link to protocol comparison; Assist to Bluetooth Proxy only when discussing ESPHome voice resource conflicts; Bluetooth Proxy to ESPHome getting started; Energy to the existing price and automation guides. Avoid circular “see also” lists with no next action.

- [ ] **Step 4: Run tests and commit**

Run `npm run site:test`, then:

```bash
git add astro.config.mjs src/content/docs/da/home-assistant/index.mdx src/content/docs/en/home-assistant/index.mdx src/content/docs/da/esp32/index.mdx src/content/docs/en/esp32/index.mdx src/components/HomePortal.astro scripts/site-quality.test.mjs
git commit -m "feat: integrate new bilingual guide series"
```

### Task 7: Verify, document, publish, and prove live behavior

**Files:**
- Modify: `docs/verification/2026-07-11-site-overhaul.md`
- Verify: all files changed since `origin/main`

**Interfaces:**
- Consumes: rendered guide series and all repository gates.
- Produces: auditable verification record, merged main commit, and live pages.

- [ ] **Step 1: Run the complete local gate chain**

Run, read, and record exit status for:

```bash
npm run site:test
npm run ai-news:test
npm run ai-news:validate
python3 scripts/content-audit.py
npm audit --omit=dev --audit-level=high
npm run build
npm run seo:validate
git diff --check
```

- [ ] **Step 2: Verify rendered routes and search**

Serve `dist` with `npm run preview`. In Chromium at 390×844 and 1440×1000, check all eight locale pages for one visible H1, one main landmark, no horizontal overflow, working source/internal links, and readable code blocks. Use the built Pagefind API to assert results for `matter.js`, `Speech-to-Phrase`, `bluetooth proxy`, and `energy dashboard`.

- [ ] **Step 3: Prove protected news boundaries**

Run:

```bash
git diff --name-status origin/main...HEAD -- \
  src/content/docs/da/ai/nyheder \
  src/content/docs/en/ai/nyheder \
  public/images/ai-news
```

Expected: no output.

- [ ] **Step 4: Update verification documentation and commit**

Record exact test counts, content-audit totals, built page count, browser route matrix, search results, and remaining low-severity audit findings.

```bash
git add docs/verification/2026-07-11-site-overhaul.md
git commit -m "docs: record four-guide series verification"
```

- [ ] **Step 5: Integrate through GitHub**

Fetch `origin/main`, rebase without dropping any new daily news commit, rerun affected gates, push the feature branch, create a PR, wait for the PR gate, merge only when green, and retain the worktree until deployment is verified.

- [ ] **Step 6: Verify Cloudflare and live pages**

Wait for the `main` deploy workflow. Verify HTTP 200 for all eight routes, canonical/hreflang metadata, live Pagefind results, and a current screenshot at mobile and desktop widths. Only then mark the goal complete.
