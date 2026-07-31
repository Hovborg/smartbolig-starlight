# SmartBolig AI Official Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-autonomous:subagent-driven-development (recommended) or superpowers-autonomous:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand SmartBolig AI's reviewed official coverage from one Home Assistant automation package to seven narrowly scoped Home Assistant and ESPHome packages without copying third-party documentation or weakening the broad AI assistant.

**Architecture:** Refactor the frozen official-evidence registry into data entries plus narrow server-side matchers. Merge and deduplicate all selected bilingual facts and fixed official sources before the existing bounded Workers AI call; expose the oldest review date and generalize the official widget badge.

**Tech Stack:** JavaScript ES modules, Node test runner, Cloudflare Workers AI, Cloudflare AI Search, Astro/Starlight, GitHub Actions, Cloudflare Workers.

## Global Constraints

- Do not bulk-copy Home Assistant or ESPHome documentation into SmartBolig or AI Search.
- Do not add Cloudflare resources, dependencies, model calls, secrets, user-controlled URL fetching, or private Home Assistant access.
- Official links must remain HTTPS URLs on `www.home-assistant.io` or `esphome.io`.
- A reviewed fact package overrides broad model knowledge only for the exact facts it contains.
- Preserve request bounds, rate limiting, same-origin checks, no-store responses, timeouts, safe text rendering, and temperature `0.1`.
- Update README and CHANGELOG with the user-visible evidence behavior.

---

### Task 1: Generic Multi-Topic Evidence Registry

**Files:**
- Modify: `functions/lib/official-evidence.js`
- Modify: `scripts/chat-official-evidence.test.mjs`

**Interfaces:**
- Produces: `selectOfficialEvidence(message, locale)` returning `{ facts, sources, evidenceIds, verifiedAt }`.
- Produces: seven frozen registry entries identified by `ha-automation-troubleshooting`, `ha-automation-modes`, `ha-template-states`, `ha-security`, `esphome-security`, `esphome-safe-mode`, and `esphome-sensors`.

- [ ] **Step 1: Add failing selector tests**

Add bilingual positive prompts for each new package, compound questions expecting multiple IDs, and negatives such as `Min GitHub Actions automation bruger mode: parallel`, `Hvordan sikrer jeg Docker?`, and `Min Arduino-sensor støjer`.

The registry assertion must require exactly seven unique IDs, valid `YYYY-MM-DD` review dates, bilingual facts, and only the two official allowlisted hosts.

- [ ] **Step 2: Run the selector tests and confirm RED**

Run: `node --test scripts/chat-official-evidence.test.mjs`

Expected: FAIL because only `ha-automation-troubleshooting` exists and the return value has no `verifiedAt`.

- [ ] **Step 3: Implement the generic registry and narrow matchers**

Use one matcher per entry. Require explicit Home Assistant or ESPHome context;
even `safe mode` plus boot-loop/OTA is ambiguous across operating systems and
must not imply ESPHome on its own. Merge selected entries in registry order and
deduplicate sources by URL.

Return this exact empty shape:

```js
{ facts: [], sources: [], evidenceIds: [], verifiedAt: null }
```

Return the oldest selected date with lexical ISO comparison:

```js
verifiedAt: selected.reduce(
  (oldest, entry) => (!oldest || entry.lastVerified < oldest ? entry.lastVerified : oldest),
  null,
)
```

- [ ] **Step 4: Run selector tests and confirm GREEN**

Run: `node --test scripts/chat-official-evidence.test.mjs`

Expected: all selector, source, content, and false-positive assertions pass.

### Task 2: API and Widget Evidence Contract

**Files:**
- Modify: `functions/api/chat.js`
- Modify: `src/components/SmartBoligAssistant.astro`
- Modify: `scripts/chat-api.test.mjs`
- Modify: `scripts/chat-widget.test.mjs`

**Interfaces:**
- Consumes: `officialEvidence.verifiedAt` from the selector.
- Produces: API field `officialVerifiedAt` as an ISO date or `null`.
- Produces: localized badges `Officielle kilder kontrolleret` and `Official sources checked`.

- [ ] **Step 1: Add failing API and widget tests**

Require the agent prompt to state that the official packages may cover Home Assistant or ESPHome, require `officialVerifiedAt`, verify two selected packages remain deduplicated, and require generalized badge copy in both locales.

- [ ] **Step 2: Run the focused tests and confirm RED**

Run: `node --test scripts/chat-api.test.mjs scripts/chat-widget.test.mjs`

Expected: FAIL on the missing review-date field and old HA-only badge text.

- [ ] **Step 3: Implement the minimal API and widget changes**

Include `verifiedAt` inside `<official_reference_data>`, return
`officialVerifiedAt: officialEvidence.verifiedAt`, and keep source classification based only on non-empty `evidenceIds`. Rename only the localized badge copy; keep the existing client-side URL validation and rendering.

- [ ] **Step 4: Run the focused tests and confirm GREEN**

Run: `node --test scripts/chat-api.test.mjs scripts/chat-widget.test.mjs`

Expected: all focused tests pass with no warnings.

### Task 3: Documentation and Change Record

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `scripts/chat-official-evidence.test.mjs`

**Interfaces:**
- Produces: public repository documentation matching the seven-package runtime contract.

- [ ] **Step 1: Add failing documentation assertions**

Require README to name Home Assistant modes/templates/security and ESPHome security/safe mode/sensors, explain that official corpora are not mirrored, and use the generalized official badge. Require CHANGELOG to record the expanded coverage.

- [ ] **Step 2: Run the documentation assertions and confirm RED**

Run: `node --test scripts/chat-official-evidence.test.mjs`

Expected: FAIL because README still documents one HA-only package and the old badge.

- [ ] **Step 3: Update README and CHANGELOG**

Describe all seven reviewed packages, the conservative no-mirroring decision, `officialVerifiedAt`, and the unchanged distinction between broad model knowledge, SmartBolig retrieval, and reviewed facts.

- [ ] **Step 4: Run documentation and content checks**

Run: `node --test scripts/chat-official-evidence.test.mjs && python3 scripts/content-audit.py && npm run site:test`

Expected: all commands exit 0.

### Task 4: Security Review, Full Verification, and Live Deployment

**Files:**
- Verify only: owned diff, generated site, Worker bundle, GitHub Actions, and production endpoint.

**Interfaces:**
- Produces: reviewed commit, merged pull request, successful Cloudflare deployment, and live answer evidence for five topic families.

- [ ] **Step 1: Review security invariants and owned diff**

Run:

```bash
git diff --check
git diff --stat
git status --short
rg -n '(token|api[_-]?key|password)\s*[:=]' functions scripts README.md CHANGELOG.md
```

Expected: no secret, new fetch, new binding, unsafe link host, or unrelated file change.

- [ ] **Step 2: Run the complete local gate**

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

Expected: every command exits 0; known non-critical dependency advisories remain documented under issue #104.

- [ ] **Step 3: Commit, audit, push, open PR, and merge when green**

Commit message: `feat(ai): expand verified smart-home evidence`

Run the workspace GitHub audit, push `codex/smartbolig-ai-official-coverage`, open a ready PR to `main`, wait for checks, and merge only when all required checks pass.

- [ ] **Step 4: Verify the production API and widget**

POST one question for automation modes, template conversion, ESPHome security, ESPHome safe mode, and ESPHome sensor filters to `https://smartbolig.net/api/chat`. Require HTTP 200, `sourceMode: "official"`, a non-null `officialVerifiedAt`, and only matching official links. Verify the live widget at desktop and mobile widths with no console errors or horizontal overflow.
