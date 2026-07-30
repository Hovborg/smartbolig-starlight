# SmartBolig AI Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers-autonomous:subagent-driven-development (recommended) or
> superpowers-autonomous:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a premium lower-right SmartBolig assistant whose Workers AI model
has broad homelab and smart-home knowledge while optionally using AI Search for
source-backed SmartBolig guidance.

**Architecture:** A same-origin Cloudflare Pages Function validates and
rate-limits chat requests, calls `@cf/google/gemma-4-26b-a4b-it` through the
native Workers AI binding, and supplements domain answers with bounded,
untrusted context from `smartbolig-ai-search` when available. A custom Astro
widget is mounted globally through the existing footer and keeps a bounded
conversation in session storage only.

**Tech Stack:** Astro 6, Starlight, Cloudflare Pages Functions, Workers AI, AI
Search, Cloudflare Rate Limiting, native `env.AI.run()`, Node's built-in test
runner.

**Design:** See
`docs/superpowers/specs/2026-07-31-smartbolig-ai-assistant-design.md`.

## Global constraints

- Workers AI is the broad expert brain; AI Search is optional retrieval and
  must never be described or implemented as the assistant's only knowledge.
- Do not create a second Vectorize index, D1 database, public admin page or
  separate chat hostname.
- Keep the endpoint same-origin and do not add broad CORS or weaken CSP.
- Never hardcode Cloudflare credentials or reuse credentials from chat history.
- No live service control, account mutation, purchase, deployment or push is
  implied by local implementation.
- Preserve all unrelated project files and existing quality gates.
- Follow strict red-green-refactor cycles for endpoint and widget behavior.

---

### Task 1: Lock the server contract with failing tests

**Files:**
- Create: `scripts/chat-api.test.mjs`
- Modify: `package.json`

- [ ] Add contract tests that import the chat handler with fake model/search
  dependencies and require POST-only behavior, same-origin enforcement,
  bounded JSON, allowed roles, a final user message and no-store responses.
- [ ] Add tests for a successful general-knowledge answer with no citations.
- [ ] Add tests for an AI Search tool result whose canonical SmartBolig sources
  are deduplicated while foreign URLs are discarded.
- [ ] Add tests for rate-limit rejection, missing bindings and sanitized
  internal errors.
- [ ] Include `scripts/chat-*.test.mjs` in `npm run site:test`.
- [ ] Run `npm run site:test`; confirm the new test fails because the endpoint
  contract is not implemented.

### Task 2: Implement the secure Workers AI endpoint

**Files:**
- Create: `functions/api/chat.js`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] Use the native Workers AI binding so the public endpoint does not add a
  second model SDK or its transitive network stack.
- [ ] Export constants and pure validation/citation helpers for deterministic
  tests.
- [ ] Implement the Pages Function and an injectable handler factory so tests
  never call paid AI services.
- [ ] Apply origin, method, content-type, byte, message-count, per-message and
  total-content limits before model invocation.
- [ ] Apply the rate-limiter binding using the connecting IP and return a
  localized 429 with `Retry-After`.
- [ ] Run the multilingual Workers AI model with one bounded final call,
  optionally preceded by one validated search lookup, and a system
  instruction covering Home Assistant, ESPHome, sensors, protocols, networking,
  containers, virtualization and homelab operations.
- [ ] Use `search_smartbolig` as supplemental AI Search retrieval; normalize
  its chunks, treat all retrieved text as untrusted, and return only allowlisted
  canonical SmartBolig citations.
- [ ] Return stable JSON and security headers; log only a generated request ID
  and generic error class.
- [ ] Run `npm run site:test`; confirm all endpoint tests pass.

### Task 3: Lock the global widget with failing tests

**Files:**
- Create: `scripts/chat-widget.test.mjs`

- [ ] Require a globally imported assistant component from `Footer.astro`.
- [ ] Require localized labels, four domain-specific starter prompts, dialog
  semantics, focus/close controls and an ARIA live status.
- [ ] Require same-origin `/api/chat`, bounded `sessionStorage`, copy control
  and source rendering.
- [ ] Reject `innerHTML`, `insertAdjacentHTML` and unsafe source link creation.
- [ ] Require responsive bottom-sheet styling, dark/light support and
  `prefers-reduced-motion`.
- [ ] Run `npm run site:test`; confirm the widget tests fail because the
  component does not yet exist.

### Task 4: Build the premium bilingual assistant widget

**Files:**
- Create: `src/components/SmartBoligAssistant.astro`
- Modify: `src/components/Footer.astro`

- [ ] Build the non-auto-opening lower-right orb and desktop/mobile panel with
  SmartBolig-aligned glass, orange, cyan and teal styling.
- [ ] Add Danish and English titles, descriptions, privacy note, errors and
  starter prompts selected from the current locale.
- [ ] Render every message and source through safe DOM properties, not HTML
  parsing.
- [ ] Keep at most ten messages in `sessionStorage`; recover safely from
  malformed or unavailable storage.
- [ ] Submit only bounded message history to `/api/chat`, show loading/retry
  states, handle 429/503 responses and prevent duplicate submissions.
- [ ] Add copy-answer controls and canonical source chips with safe external
  link attributes.
- [ ] Implement focus restoration, Escape-to-close, ARIA state updates and
  reduced-motion behavior.
- [ ] Mount the component once through the custom footer.
- [ ] Run `npm run site:test`; confirm all widget and existing site tests pass.

### Task 5: Configure Cloudflare bindings and deployment compilation

**Files:**
- Modify: `wrangler.jsonc`

- [ ] Raise the compatibility date to at least the AI Search binding requirement.
- [ ] Add the Workers AI binding `AI`.
- [ ] Add the direct AI Search binding `SMARTBOLIG_SEARCH` for instance
  `smartbolig-ai-search`.
- [ ] Add a unique positive Rate Limiting namespace for `CHAT_RATE_LIMITER`
  with a conservative anonymous-chat limit.
- [ ] Run Wrangler's Pages Function build/validation command and resolve schema
  or bundle errors without weakening the endpoint contract.

### Task 6: Document privacy and operation

**Files:**
- Modify: `src/content/docs/da/juridisk/privatlivspolitik.mdx`
- Modify: `src/content/docs/en/juridisk/privatlivspolitik.mdx`
- Modify: `README.md`

- [ ] Explain that chat questions and bounded recent history are processed by
  Cloudflare Workers AI and, when relevant, AI Search.
- [ ] State session-only browser storage, no SmartBolig chat account/history,
  no passwords/tokens/personal data, purpose, legal basis and operational
  retention boundaries without promising unverifiable provider deletion.
- [ ] Document model/bindings, broad-knowledge plus optional-RAG architecture,
  local commands, limits, failure behavior and the fact that no API key belongs
  in source.
- [ ] Run content audit and site tests; fix policy numbering or link issues.

### Task 7: Complete deterministic and visual verification

**Files:**
- Create: `docs/verification/2026-07-31-smartbolig-ai-assistant.md`

- [ ] Run and record `npm run site:test`.
- [ ] Run and record `npm run ai-news:test` and `npm run ai-news:validate`.
- [ ] Run and record `python3 scripts/content-audit.py`.
- [ ] Run and record `npm audit --omit=dev --audit-level=critical`.
- [ ] Run and record `npm run build` and `npm run seo:validate`.
- [ ] Run and record the Pages Function compilation check.
- [ ] Serve the built site and inspect the assistant at desktop and mobile
  sizes, including dark/light, keyboard open/close, starter prompt, loading,
  error, copy, overflow and reduced-motion states.
- [ ] Confirm `git diff --check`, inspect the complete diff and run a secret
  scan over task-owned files.
- [ ] Clearly separate mocked endpoint proof from any real Cloudflare
  Workers AI/AI Search roundtrip; do not claim live behavior without a real
  production or remote-binding response.

### Task 8: Security review and branch completion

- [ ] Use the required Sol/high reviewer for the public AI endpoint, focusing
  on prompt injection, origin trust, XSS, URL allowlisting, abuse controls,
  sensitive logging, cost amplification, dependency/build compatibility and
  privacy copy.
- [ ] Fix every critical/high finding with a new failing regression test first,
  then rerun the full deterministic and visual verification.
- [ ] Use the verification-before-completion and finishing-a-development-branch
  workflows; make a scoped local commit only after all required evidence is
  green.
- [ ] Do not push, merge or deploy until the external-write boundary is
  explicitly satisfied.
