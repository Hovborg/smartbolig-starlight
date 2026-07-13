# AdSense Reapplication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify SmartBolig's live AdSense readiness and submit one evidence-backed reapplication as the final external action.

**Architecture:** Keep site changes and external account action separate. First audit public policy/content/UX surfaces and account-specific requirements, fix only evidenced gaps through normal PRs, then submit once and record the exact Google response without claiming approval prematurely.

**Tech Stack:** Live SmartBolig site, Google AdSense/CMP/Search Console browser interfaces, Playwright CLI where authenticated access permits, curl, repository docs.

## Global Constraints

- Start only after integrated production QA is green.
- Never expose publisher IDs, account identifiers, messages or screenshots containing private data in public repo files.
- Reapplication is authorized as the final task; any purchase, campaign or unrelated account change is out of scope.
- Google approval remains unverified until Google explicitly confirms it.

---

### Task 1: Audit public readiness

**Files:**
- Create: `docs/verification/YYYY-MM-DD-adsense-readiness.md`

- [ ] Verify live About, Contact, editorial method, corrections, privacy, cookies/CMP, legal and disclosure routes with HTTP/browser evidence.
- [ ] Check mobile navigation, content density, broken links, empty/thin pages, author/source transparency and intrusive layout behavior.
- [ ] Verify live `ads.txt`, robots, sitemap, canonical/hreflang and consent behavior without recording secret/account values.
- [ ] Mark each item PASS/FAIL/ikke verificeret with URL and timestamp.

### Task 2: Inspect account-side blockers

- [ ] Open the authenticated AdSense Sites/policy view and record the exact rejection/policy wording privately.
- [ ] Inspect Search Console indexing/coverage for the canonical property if accessible.
- [ ] Compare account wording to current official Google AdSense policies and identify only concrete gaps.
- [ ] If authenticated access is unavailable, stop and report the account-side items as `ikke verificeret`; do not guess.

### Task 3: Fix evidenced gaps through normal gates

- [ ] For each concrete site gap, write a failing test or reproducible browser check.
- [ ] Implement the smallest fix, update relevant README/config/legal content and run full release verification.
- [ ] Deliver via PR, wait for deployment and re-check the exact live failure.
- [ ] Update readiness evidence; do not submit while any required item is FAIL.

### Task 4: Submit and record the reapplication

- [ ] Reopen the AdSense site review screen and confirm the canonical domain is `smartbolig.net`.
- [ ] Capture the pre-submit state and exact readiness checklist privately.
- [ ] Submit the reapplication once.
- [ ] Record timestamp, displayed confirmation/status and next expected Google step without exposing private identifiers.
- [ ] Report: submission verified or not verified; approval remains pending until Google decides.
