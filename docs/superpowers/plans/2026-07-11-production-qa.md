# Production QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the integrated homepage, AI News, guides and Astro 7 release works end-to-end before AdSense review.

**Architecture:** A versioned release checklist combines deterministic CLI gates with Playwright browser journeys and live Cloudflare verification. Evidence is stored in one dated document; failures block release and are never converted into warnings without justification.

**Tech Stack:** npm/Astro, content audit, Playwright CLI, GitHub Actions/CLI, Cloudflare-hosted production.

## Global Constraints

- Current `origin/main` is incorporated before final validation.
- No hidden failures; uncertain claims are marked `ikke verificeret`.
- No missing daily news content or unintended protected-path changes.
- README/config/dependencies/lockfile must match deployed behavior.
- The Energy Dashboard guide remains internationally applicable and is not framed as Denmark-only.

---

### Task 1: Build the deterministic release gate

**Files:**
- Create: `scripts/release-verify.sh`
- Modify: `package.json`
- Modify: `scripts/site-quality.test.mjs`

- [ ] Add a failing test requiring ordered commands: `npm ci`, site tests, AI News tests/validation, content audit, audit, build, SEO and diff check.
- [ ] Implement `set -euo pipefail` runner with phase labels and no destructive git commands.
- [ ] Add `"release:verify": "bash scripts/release-verify.sh"`.
- [ ] Run it from a clean checkout; expect exit 0 and every phase printed once.
- [ ] Commit with `git commit -m "test: add complete release verification gate"`.

### Task 2: Execute local browser matrix

**Files:**
- Create: `docs/verification/YYYY-MM-DD-integrated-release.md`

- [ ] Build and serve production locally.
- [ ] With `playwright-cli`, verify DA/EN home, start, AI hub, news index, current and legacy article, all new guide pairs, representative Home Assistant/ESPHome guide, legal/about/contact, 404, RSS and search.
- [ ] Repeat home/news/guide at 1440×1000, 390×844 and 320×800; check keyboard order, focus, reduced motion, 200% zoom, images, overflow and text overlap.
- [ ] Record exact console errors, failed requests, screenshots and pass/fail per journey.
- [ ] Fix failures in their owning subsystem and rerun from the first failed journey.

### Task 3: Release through GitHub and verify live production

- [ ] Confirm clean diff, no secrets, expected commit history and current `origin/main` ancestry.
- [ ] Run `npm run release:verify` again and read complete output.
- [ ] Push/open PR, wait for every required check, merge only when green and capture merge SHA.
- [ ] Observe Cloudflare deployment completion.
- [ ] Re-run the critical browser matrix against `https://smartbolig.net` and verify headers with `curl -I`.
- [ ] Update evidence with exact URLs, timestamps, SHA and any unverified external behavior.
- [ ] Commit evidence with `git commit -m "docs: record integrated production verification"` if the repo workflow permits post-deploy evidence; otherwise attach it to the next documentation PR.
