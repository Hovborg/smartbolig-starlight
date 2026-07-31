# SmartBolig AI Console v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-autonomous:subagent-driven-development (recommended) or superpowers-autonomous:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Turn the existing bilingual SmartBolig assistant into a more useful technical console with truthful inference diagnostics, safe code/YAML rendering, visible edge-processing time and persistent expert work modes.

**Architecture:** Keep the existing Cloudflare Worker, same-origin `/api/chat` contract and single Astro widget. Extend the agent result with an allowlisted public model route, let the handler add bounded server duration and the existing request trace, and render only normalized diagnostics in the browser. Extend the existing DOM-only Markdown renderer for fenced code blocks and add static localized work-mode templates plus an honest client elapsed timer; never render model HTML or expose provider errors.

**Tech Stack:** Astro 5, browser DOM APIs, Cloudflare Workers AI, Cloudflare AI Search, Node `node:test`, Playwright CLI.

## Global Constraints

- Danish and English must remain structurally equivalent and natural.
- Do not add a dependency or a client framework.
- Do not use `innerHTML`, `insertAdjacentHTML`, `document.write` or an unsafe Markdown sink.
- Telemetry may expose only allowlisted public model keys, `primary|fallback|unknown`, bounded milliseconds, a bounded request trace and the count of already validated sources.
- Do not log or return prompts, model answers, provider free-text errors, credentials or private Home Assistant data.
- Conversation data and diagnostics remain session-only in `sessionStorage` with the existing ten-message bound.
- Keep keyboard access, focus restoration, reduced-motion behavior, light theme and 360-390 px mobile support.
- The live release is complete only after repository tests, build, Worker dry-run, independent diff review, production deployment, API checks and desktop/mobile browser checks pass.

---

### Task 1: Add a bounded public diagnostics contract

**Files:**
- Modify: `scripts/chat-api.test.mjs`
- Modify: `functions/api/chat.js`

**Interfaces:**
- Produces from `createWorkersAgent()`: `{ answer, diagnostics: { model, route } }` where `model` is `gemma-4-26b-a4b-it`, `llama-3.1-8b-instruct-fast` or `unknown`, and `route` is `primary`, `fallback` or `unknown`.
- Produces from `POST /api/chat`: existing fields plus `diagnostics: { model, route, durationMs, trace }`.
- `durationMs` is an integer clamped to `0..120000`; `trace` is the existing request ID, sliced to at most 64 characters.

- [x] **Step 1: Write failing agent-route tests**

Add assertions to the existing primary and fallback tests:

```js
assert.deepEqual(result.diagnostics, {
  model: "gemma-4-26b-a4b-it",
  route: "primary",
});

assert.deepEqual(fallbackResult.diagnostics, {
  model: "llama-3.1-8b-instruct-fast",
  route: "fallback",
});
```

- [x] **Step 2: Write a failing handler normalization test**

Create a handler with a controlled clock and a runner that returns a valid answer plus fallback diagnostics. Assert the response contains only allowlisted values and a bounded trace:

```js
assert.deepEqual(body.diagnostics, {
  model: "llama-3.1-8b-instruct-fast",
  route: "fallback",
  durationMs: 250,
  trace: "req-test-123",
});
```

Add a second assertion proving arbitrary model/route strings normalize to `unknown` rather than reaching the visitor.

- [x] **Step 3: Run the focused API tests and verify RED**

Run: `node --test scripts/chat-api.test.mjs`

Expected: failures on missing `result.diagnostics` and missing response `diagnostics`, while all pre-existing security tests still execute.

- [x] **Step 4: Implement minimal route tracking and normalization**

Make `runModel()` return a wrapper instead of a raw provider result:

```js
return {
  result: primaryResult,
  diagnostics: { model: "gemma-4-26b-a4b-it", route: "primary" },
};
```

Make `runFallback()` return the same wrapper with:

```js
diagnostics: {
  model: "llama-3.1-8b-instruct-fast",
  route: "fallback",
}
```

Carry the diagnostics from the model call that produced the final answer through every direct-search and tool-search return path. In the handler, normalize the two string fields against fixed sets, calculate elapsed time from an injected `now` dependency that defaults to `Date.now`, clamp it, and add the existing request ID as `trace`.

- [x] **Step 5: Run focused tests and verify GREEN**

Run: `node --test scripts/chat-api.test.mjs`

Expected: all chat API tests pass with zero failures and no provider text in the response/log leakage tests.

- [x] **Step 6: Commit the API contract**

```bash
git add functions/api/chat.js scripts/chat-api.test.mjs
git commit -m "feat(ai): expose safe response diagnostics"
```

### Task 2: Render technical answers as safe console output

**Files:**
- Modify: `scripts/chat-widget.test.mjs`
- Modify: `src/components/SmartBoligAssistant.astro`

**Interfaces:**
- Consumes `result.diagnostics` and existing `result.requestId` from Task 1.
- Stores an assistant message with normalized `{ diagnostics: { model, route, durationMs, trace } }`.
- Produces DOM-only fenced code blocks through `createSafeCodeBlock(code, language)`.

- [x] **Step 1: Write failing code-block renderer tests**

Require the component source to contain `createSafeCodeBlock`, `document.createElement("pre")`, `document.createElement("code")`, a language allowlist regex, `textContent`, a code-copy control and no HTML sink:

```js
assert.match(source, /function createSafeCodeBlock\(code,\s*language\)/);
assert.match(source, /document\.createElement\(["']pre["']\)/);
assert.match(source, /document\.createElement\(["']code["']\)/);
assert.match(source, /navigator\.clipboard\.writeText\(content\)/);
assert.doesNotMatch(source, /\.innerHTML\s*=/);
```

- [x] **Step 2: Write failing diagnostics UI tests**

Require localized labels for model, route, edge time, trace and source count; require allowlisted model/route normalization and the visible console rail:

```js
for (const copy of ["MODEL", "RUTE", "ROUTE", "EDGE", "SPOR", "TRACE", "KILDER", "SOURCES"]) {
  assert.match(source, new RegExp(copy));
}
assert.match(source, /smartbolig-ai__diagnostics/);
assert.match(source, /data-diagnostic-route/);
```

- [x] **Step 3: Run widget tests and verify RED**

Run: `node --test scripts/chat-widget.test.mjs`

Expected: the new code-block and diagnostics-console tests fail because neither feature exists yet.

- [x] **Step 4: Implement safe fenced-code rendering**

Extend `createSafeRichText()` with a fence state. A line matching ``/^```([a-zA-Z0-9_+-]{0,20})\s*$/`` opens a code block; the next exact fence closes it. Preserve raw indentation inside the fence. `createSafeCodeBlock()` must build:

```html
<div class="smartbolig-ai__code-shell">
  <div class="smartbolig-ai__code-head"><span>YAML</span><button type="button">Kopiér kode</button></div>
  <pre><code><!-- textContent only --></code></pre>
</div>
```

Render an unclosed final fence as a code block rather than dropping content. Reuse a parameterized clipboard button helper, and keep all output in `textContent`/text nodes.

- [x] **Step 5: Implement diagnostics normalization and rail**

Normalize stored/API diagnostics with fixed model/route sets, integer time clamping and a trace regex/length bound. Render a compact rail under each assistant response:

```text
MODEL GEMMA 4 26B | ROUTE PRIMARY | EDGE 18.2S | TRACE 452898D0 | SOURCES 5
```

Map internal keys to fixed visitor labels; never display raw API strings. Style fallback amber, official source counts green and all values in monospace. Do not hide the rail on 360 px mobile; allow horizontal scrolling inside the rail without widening the document.

- [x] **Step 6: Run widget tests and verify GREEN**

Run: `node --test scripts/chat-widget.test.mjs`

Expected: all widget tests pass; unsafe sink assertions remain green.

- [x] **Step 7: Commit safe technical output**

```bash
git add src/components/SmartBoligAssistant.astro scripts/chat-widget.test.mjs
git commit -m "feat(ai): render code and response telemetry"
```

### Task 3: Add honest live processing and persistent work modes

**Files:**
- Modify: `scripts/chat-widget.test.mjs`
- Modify: `src/components/SmartBoligAssistant.astro`

**Interfaces:**
- Produces four static localized buttons with `data-chat-mode` and visible `data-template` text.
- Produces a loading card with `data-chat-elapsed` updated from `performance.now()` and cleared on success, failure, reset and close.

- [x] **Step 1: Write failing work-mode tests**

Require four buttons and natural DA/EN templates for Debug, Build, Explain and Compare. Require that clicking writes the visible template to the textarea and dispatches `input` without adding a hidden system instruction.

- [x] **Step 2: Write failing elapsed-console tests**

Require `performance.now()`, a bounded interval handle, `data-chat-elapsed`, `clearInterval` in cleanup paths and localized `EDGE REQUEST ACTIVE`/`EDGE-FORESPØRGSEL AKTIV` copy.

- [x] **Step 3: Run widget tests and verify RED**

Run: `node --test scripts/chat-widget.test.mjs`

Expected: new work-mode and elapsed-console tests fail for missing selectors and functions.

- [x] **Step 4: Implement persistent work modes**

Place a compact `RUN MODE` rail above the composer so it remains available after messages replace the welcome screen. Each button fills a localized visible scaffold only when selected, focuses the textarea and leaves the visitor free to edit it. Add `aria-label` and pressed-state styling; do not change the server system prompt.

- [x] **Step 5: Implement and clean up the elapsed timer**

Make `renderLoading()` return the loading article. Add a visible elapsed value updated every 100 ms from `performance.now()`. Keep the normal `role=log` behavior, mark the fast-changing number `aria-hidden=true`, and clear the interval in `finally`, reset and abort paths. Use CSS animation only for the visual signal line and honor reduced-motion.

- [x] **Step 6: Run widget tests and the full site baseline**

Run:

```bash
node --test scripts/chat-widget.test.mjs
npm run site:test
```

Expected: all widget tests and all site tests pass with zero failures.

- [x] **Step 7: Commit the interactive console**

```bash
git add src/components/SmartBoligAssistant.astro scripts/chat-widget.test.mjs
git commit -m "feat(ai): add expert modes and live edge timing"
```

### Task 4: Synchronize docs and prove the live bilingual result

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/superpowers/plans/2026-07-31-smartbolig-ai-console-v2.md`

**Interfaces:**
- Documents the exact public diagnostics fields, their privacy boundary, code rendering, work modes and the distinction between server duration and model correctness.

- [x] **Step 1: Update README and changelog**

Document that diagnostics are operational transparency, not a quality score; trace values contain no prompt data; code blocks are rendered without model HTML; and all work-mode scaffolds are visible/editable before submission. Add a dated changelog entry in the existing style.

- [x] **Step 2: Run the complete local release gate**

Run:

```bash
npm run site:test
npm run ai-news:test
npm run ai-news:validate
python3 scripts/content-audit.py
npm audit --audit-level=critical
npm run build
npm run seo:validate
npm run worker:build
npx wrangler deploy --dry-run
git diff --check
```

Expected: every command exits zero. Report existing non-critical dependency advisories separately rather than hiding them.

- [x] **Step 3: Review the complete diff for security and regressions**

Check that no new secret, raw provider error, prompt, answer, untrusted model name, HTML sink, global shortcut conflict or unbounded interval/storage value was introduced. Verify only the scoped files changed.

- [x] **Step 4: Commit docs and final fixes**

```bash
git add README.md CHANGELOG.md docs/superpowers/plans/2026-07-31-smartbolig-ai-console-v2.md
git commit -m "docs(ai): document console diagnostics"
```

- [ ] **Step 5: Push, open the PR, merge and watch the exact production run**

Push `codex/smartbolig-ai-console-v2`, open a non-draft PR to `main`, verify its workflow, merge only while green, and watch the deployment for the exact merge SHA.

- [ ] **Step 6: Verify the live API contract in both knowledge paths**

POST one official Home Assistant question and one broad homelab question to `https://smartbolig.net/api/chat`. Require HTTP 200, a non-empty answer, expected source mode, allowlisted diagnostics, bounded duration and a trace matching the response request ID.

- [ ] **Step 7: Verify the live Danish and English UI with Playwright**

In isolated named sessions, test `/da/` and `/en/` at 1440x900 and 390x844. Open the assistant, use one work mode, submit a fenced-code question, and require:

- localized work-mode and diagnostics labels;
- visible model/route/edge/trace/source rail;
- visible safe code shell and working code-copy button;
- official badge/link on a matched question;
- input and send controls visible;
- document `scrollWidth <= clientWidth`;
- zero console errors/warnings and zero page errors.

Close every Playwright session and stop any Wrangler tail process.
