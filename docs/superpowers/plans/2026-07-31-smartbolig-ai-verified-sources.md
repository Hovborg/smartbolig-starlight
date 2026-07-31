# SmartBolig AI Verified Sources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-autonomous:subagent-driven-development (recommended) or superpowers-autonomous:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Home Assistant automation answers explicitly source-bound when an official fact is available, fix the known YAML trace error, and prove the behavior locally and on the live site.

**Architecture:** Add a small, version-controlled official-evidence registry that selects only reviewed Home Assistant automation facts and injects them into the model as authoritative reference data. The API returns only server-generated allowlisted official links, while the widget distinguishes official, SmartBolig-assisted, and general AI answers. Other smart-home topics keep broad model knowledge without receiving a misleading official badge.

**Tech Stack:** Cloudflare Workers AI, Cloudflare AI Search, JavaScript ES modules, Node test runner, Astro/Starlight, GitHub Actions, Cloudflare Workers.

## Global Constraints

- The public assistant must never receive access to the private Home Assistant installation.
- Only `https://www.home-assistant.io` and `https://esphome.io` may be emitted as official external sources.
- SmartBolig AI Search content remains untrusted reference data and may expose only canonical `https://smartbolig.net` links.
- Exact UI paths, YAML keys, services, and version-sensitive behavior without reviewed evidence must be described as unverified/current-version-dependent.
- Model temperature is `0.1`; retrieval and deterministic evaluation remain the primary correctness controls.
- Existing request limits, rate limiting, same-origin checks, no-store responses, text-only rendering, and timeout behavior must remain unchanged.

---

### Task 1: Official Home Assistant Evidence Registry

**Files:**
- Create: `functions/lib/official-evidence.js`
- Modify: `functions/api/chat.js`
- Test: `scripts/chat-official-evidence.test.mjs`
- Test: `scripts/chat-api.test.mjs`

**Interfaces:**
- Produces: `selectOfficialEvidence(message, locale)` returning `{ facts, sources, evidenceIds }`.
- Produces: server-generated source objects `{ title, url, type: "official" }`.
- Consumes: the last user message before the model call and before the API response is serialized.

- [ ] **Step 1: Write the failing selector tests**

Add 50 Danish/English positive and negative prompts. Positive automation/trace/YAML questions must select `ha-automation-troubleshooting`; unrelated homelab questions must return no evidence.

- [ ] **Step 2: Verify the selector tests fail**

Run: `node --test scripts/chat-official-evidence.test.mjs`

Expected: FAIL because `functions/lib/official-evidence.js` does not exist.

- [ ] **Step 3: Implement the reviewed registry and selector**

The registry contains only these reviewed facts:

```js
{
  id: "ha-automation-troubleshooting",
  facts: {
    da: [
      "YAML-oprettede automationer skal have et unikt id, før debug-spor gemmes.",
      "Kør handlinger springer triggere og betingelser over.",
      "Kontrollér YAML-syntaks via Udviklerværktøjer > YAML > Kontrollér konfiguration før genstart."
    ],
    en: [
      "YAML-created automations need a unique id before debug traces are stored.",
      "Run actions skips triggers and conditions.",
      "Check YAML syntax with Developer tools > YAML > Check configuration before restarting."
    ]
  },
  sources: [
    { title: "Home Assistant: Testing and troubleshooting automations", url: "https://www.home-assistant.io/docs/automation/troubleshooting/", type: "official" },
    { title: "Home Assistant: Automation YAML", url: "https://www.home-assistant.io/docs/automation/yaml/", type: "official" }
  ]
}
```

- [ ] **Step 4: Write failing API/model-contract tests**

Require official evidence to be injected after untrusted SmartBolig context, require `temperature: 0.1`, require returned official sources to be server-controlled, and require `sourceMode: "official"`.

- [ ] **Step 5: Verify API/model-contract tests fail**

Run: `node --test scripts/chat-api.test.mjs`

Expected: FAIL on missing official evidence, source mode, and the old `0.35` temperature.

- [ ] **Step 6: Implement evidence injection and response classification**

Pass reviewed evidence to the model in `<official_reference_data>`, state that it overrides conflicting general knowledge, return the evidence sources from the agent runner, and set `sourceMode` to `official` whenever reviewed evidence was used.

- [ ] **Step 7: Run the focused tests**

Run: `node --test scripts/chat-official-evidence.test.mjs scripts/chat-api.test.mjs`

Expected: 0 failures.

### Task 2: Honest Source Badges in the Chat Widget

**Files:**
- Modify: `src/components/SmartBoligAssistant.astro`
- Test: `scripts/chat-widget.test.mjs`

**Interfaces:**
- Consumes: API `sourceMode` values `general`, `mixed`, and `official` plus allowlisted source URLs.
- Produces: localized badge copy and safe clickable source chips.

- [ ] **Step 1: Write failing widget tests**

Require Danish/English official badge copy, support for `sourceMode: "official"`, and strict client allowlisting of `smartbolig.net`, `www.home-assistant.io`, and `esphome.io`.

- [ ] **Step 2: Verify the widget tests fail**

Run: `node --test scripts/chat-widget.test.mjs`

Expected: FAIL because the widget currently collapses every non-mixed result to `general` and rejects official hosts.

- [ ] **Step 3: Implement the badges and safe links**

Use `Officielle HA-kilder kontrolleret` / `Official HA sources checked`, change the source heading to `Kilder` / `Sources`, derive link type from hostname, and style official links and badges with the existing green verification signal.

- [ ] **Step 4: Run widget tests**

Run: `node --test scripts/chat-widget.test.mjs`

Expected: 0 failures.

### Task 3: Correct the SmartBolig Guides and Documentation

**Files:**
- Modify: `src/content/docs/da/home-assistant/aktivitet-og-spor.mdx`
- Modify: `src/content/docs/en/home-assistant/aktivitet-og-spor.mdx`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Test: `scripts/chat-official-evidence.test.mjs`

**Interfaces:**
- Produces: crawlable first-party content that agrees with the reviewed official registry.
- Consumes: the same official troubleshooting and YAML URLs used by the registry.

- [ ] **Step 1: Add failing content assertions**

Require both guides to say that YAML-created automations need a unique `id` for stored traces and to link the official Automation YAML page.

- [ ] **Step 2: Verify the content assertions fail**

Run: `node --test scripts/chat-official-evidence.test.mjs`

Expected: FAIL because both guides currently omit the `id` requirement.

- [ ] **Step 3: Correct both guides and document the evidence contract**

Add the `id` requirement immediately below the default trace-count explanation, add the official YAML source, document the three source modes and 50-case selector suite in README, and record the user-visible accuracy change in CHANGELOG.

- [ ] **Step 4: Run content and site checks**

Run: `node --test scripts/chat-official-evidence.test.mjs && python3 scripts/content-audit.py && npm run site:test`

Expected: 0 failures.

### Task 4: Full Verification and Live Deployment

**Files:**
- Verify only: repository diff, generated site, Worker bundle, GitHub Actions, and production endpoint.

**Interfaces:**
- Consumes: all outputs from Tasks 1–3.
- Produces: one reviewed commit, merged pull request, successful Cloudflare deployment, and live regression evidence.

- [ ] **Step 1: Run the complete local gate**

Run:

```bash
npm run site:test
npm run ai-news:test
npm run ai-news:validate
python3 scripts/content-audit.py
npm audit --omit=dev --audit-level=critical
npm run build
npm run seo:validate
npm run worker:build
npm exec --no -- wrangler deploy --dry-run
```

Expected: every command exits 0.

- [ ] **Step 2: Review the owned diff and commit**

Run: `git diff --check && git diff --stat && git status --short`

Expected: only plan, evidence registry, API, widget, tests, guides, README, and CHANGELOG changes.

Commit: `feat(ai): add verified Home Assistant evidence`

- [ ] **Step 3: Run the repository GitHub audit, push, open and merge the PR**

Run the workspace audit, push `codex/smartbolig-ai-verified-sources`, open a PR to `main`, wait for required checks, and merge only when green.

- [ ] **Step 4: Verify deployment and production behavior**

Wait for the `Deploy to Cloudflare Workers` run on `main`. Then post the three known automation questions to `https://smartbolig.net/api/chat` and verify HTTP 200, `sourceMode: "official"`, official source URLs, the YAML `id` requirement, the Run actions limitation, and the configuration-check path.

- [ ] **Step 5: Verify the production widget**

Load the live site at desktop and mobile widths, send one trace question, and verify the official badge and official source chips are visible without console errors or layout overflow.
