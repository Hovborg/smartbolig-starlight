# AI News Editorial Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace formulaic daily aggregation with source-deep, duplicate-resistant AI News that can safely skip weak days while remaining unattended.

**Architecture:** Split discovery, scoring/deduplication and article rendering into pure modules with fixture tests. The shell runner remains the orchestration and security boundary; only an accepted editorial result may reach image generation, build, PR and auto-merge.

**Tech Stack:** Node ESM, built-in test runner/fetch/crypto, Astro content collections, Sharp/ComfyUI fallback, Bash, GitHub CLI/systemd.

## Global Constraints

- `origin/main` is the only tracked code/config source.
- A no-signal day exits successfully and creates no article, image, commit or PR.
- At least one primary source is required; material claims must be source-backed.
- Danish/English pairs must have equivalent evidence and meaning.
- Do not publish near-duplicate stories, source sets or boilerplate-heavy prose.
- Public content never exposes internal scores, prompts or agent labels.

---

### Task 1: Extract canonical story discovery

**Files:**
- Create: `scripts/lib/ai-news-discovery.mjs`
- Create: `scripts/ai-news-discovery.test.mjs`
- Modify: `scripts/ai-news-publish.mjs`

**Interfaces:**
- Produces: `canonicalizeUrl(url): string`, `parseFeed(xml, source): Candidate[]`, `fetchCandidates(feeds, fetchImpl): Promise<Candidate[]>`.
- `Candidate`: `{ sourceId, sourceName, primary, title, url, canonicalUrl, summary, published, bodyText }`.

- [ ] Write fixture tests for tracking-parameter removal, Atom alternate links, CDATA, failed non-critical feeds and fetched article body.
- [ ] Run `node --test scripts/ai-news-discovery.test.mjs`; expect FAIL because the module is missing.
- [ ] Implement exported pure functions and inject `fetchImpl`; accept only HTTP(S), strip fragments and `utm_*`, and cap fetched body text at 40,000 characters.
- [ ] Rewire `ai-news-publish.mjs` to consume `fetchCandidates()` without changing output yet.
- [ ] Run `npm run ai-news:test`; expect all tests to pass.
- [ ] Commit with `git commit -m "refactor: isolate AI news discovery"`.

### Task 2: Add novelty and editorial acceptance

**Files:**
- Create: `scripts/lib/ai-news-editorial.mjs`
- Create: `scripts/ai-news-editorial.test.mjs`
- Modify: `scripts/ai-news-publish.mjs`

**Interfaces:**
- Produces: `storyFingerprint(candidate): string`, `tokenSimilarity(a,b): number`, `selectEditorialPackage(candidates, history, options): { status: "publish", items, reasons } | { status: "skip", reason }`.
- Options: `{ minScore: 14, maxItems: 4, duplicateThreshold: 0.72, recentDays: 14 }`.

- [ ] Add fixtures for a strong primary-source story, repeated URL, semantically repeated story, repeated six-source set and weak release-only day.
- [ ] Run focused test; expect missing exports.
- [ ] Implement normalized token/Jaccard similarity, canonical URL matching, entity/title fingerprinting, source-diversity and smart-home relevance scoring.
- [ ] Require one `primary === true`; return `skip` when nothing survives.
- [ ] Load the prior 14 days of frontmatter/source/title history in `ai-news-publish.mjs` and pass it into the selector.
- [ ] Run `npm run ai-news:test`; expect strong fixture publishes and weak/duplicate fixtures skip.
- [ ] Commit with `git commit -m "feat: gate AI news on novelty and evidence"`.

### Task 3: Replace boilerplate rendering with evidence-led sections

**Files:**
- Create: `scripts/lib/ai-news-render.mjs`
- Create: `scripts/ai-news-render.test.mjs`
- Modify: `scripts/ai-news-publish.mjs`
- Modify: `src/content.config.ts`

**Interfaces:**
- Produces: `renderIssue({ locale, date, editorialPackage }): string`.
- Frontmatter adds `news.storyFingerprint`, `news.sourceSetFingerprint`, `news.editorialVersion: 2`, and preserves `news.sources`.

- [ ] Add tests requiring “what changed”, evidence, relevance, next verification and uncertainty content while rejecting three known repeated stock phrases in more than one section.
- [ ] Confirm RED against current renderer.
- [ ] Implement story-specific headings and synthesis from fetched body text; never emit unsupported quotations.
- [ ] Extend Zod schema for the three new metadata fields with backward-compatible optional fields.
- [ ] Run `npm run ai-news:test && npm run ai-news:validate`; expect pass for all legacy pairs and v2 fixtures.
- [ ] Commit with `git commit -m "feat: render evidence-led AI news"`.

### Task 4: Make skip behavior an explicit runner outcome

**Files:**
- Modify: `scripts/ai-news-publish.mjs`
- Modify: `scripts/openclaw-ai-news-daily.sh`
- Modify: `scripts/ai-news-cron.test.mjs`
- Modify: `scripts/site-quality.test.mjs`

**Interfaces:**
- Publisher writes `.ai-news-result.json` with `{ status, date, reason, files }`.
- Runner continues only for `status === "publish"`; `skip` exits 0 before image/npm/git/gh stages.

- [ ] Add a shell-fixture test that asserts weak-day output contains `AI_NEWS_STATUS=skip` and mocked `gh pr create` is never called.
- [ ] Confirm RED.
- [ ] Write result JSON atomically via temporary file + rename and print the machine-readable status.
- [ ] Parse result in the runner; validate exact `publish|skip` values and reject malformed output.
- [ ] Run `npm run site:test && npm run ai-news:test`; expect pass.
- [ ] Commit with `git commit -m "feat: skip weak AI news days safely"`.

### Task 5: Enforce responsive story-image budgets

**Files:**
- Modify: `scripts/ai-news-render-image.mjs`
- Modify: `scripts/ai-news-pending-images.mjs`
- Modify: `scripts/ai-news-pending-images.test.mjs`
- Modify: `scripts/ai-news-validate.mjs`
- Modify: `src/content.config.ts`

**Interfaces:**
- Produce 640/960/1280 AVIF and WebP 16:9 files plus 1200×630 social fallback.
- `heroImage` adds optional `srcset: { avif: string[]; webp: string[] }` for v2 articles.

- [ ] Add failing tests for required dimensions, missing candidate, >300 KiB derivative and duplicate hashes.
- [ ] Implement Sharp derivatives with explicit dimensions and no text overlay.
- [ ] Make pending-image and validator logic backward-compatible with legacy single-image articles.
- [ ] Run image fixture tests and inspect generated files with `identify`/`du`.
- [ ] Run full AI News gates.
- [ ] Commit with `git commit -m "feat: optimize AI news image variants"`.

### Task 6: Protect diffs and update operations documentation

**Files:**
- Modify: `scripts/openclaw-ai-news-daily.sh`
- Modify: `scripts/ai-news-cron.test.mjs`
- Modify: `README.md`
- Create: `docs/verification/YYYY-MM-DD-ai-news-editorial-pipeline.md`

**Interfaces:**
- Runner allowlist permits only the target locale pair, target image derivatives and generated index changes.

- [ ] Add a failing fixture where an unrelated `package.json` change exists after generation; assert runner aborts before commit.
- [ ] Implement `git diff --name-only` allowlist validation for the target date.
- [ ] Document skip semantics, result file, quality gates, manual dry-run and recovery.
- [ ] Run a strong fixture end-to-end and a weak fixture end-to-end; record exact output and confirm no external PR in dry-run mode.
- [ ] Run all project gates plus `git diff --check`.
- [ ] Commit with `git commit -m "docs: verify AI news editorial automation"`.
