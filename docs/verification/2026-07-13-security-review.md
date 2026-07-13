# Security review 2026-07-13 — findings and remediation

An independent read-only security review of the AI-news automation pipeline
was performed on 2026-07-13 (external reviewer model, sandboxed, no repo
changes). This document records the findings and their remediation status.
The full raw report is retained privately; this public copy contains no
runner-specific details.

## Findings

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| C-1 | Critical | Untrusted feed text was passed to a headless Claude Code process that inherited the runner's full tool and permission configuration | **Fixed 2026-07-14** |
| H-1 | High | `safeText()` did not neutralize Markdown link/image/code syntax, allowing stored XSS (`javascript:` links) and tracking pixels from feed content | **Fixed 2026-07-14** |
| H-2 | High | Article deep-reading accepted arbitrary HTTP(S) destinations including loopback, private ranges, and cloud metadata addresses (SSRF) | **Fixed 2026-07-14** |
| M-1 | Medium | The daily runner auto-merged its own PR despite "needs editorial review" | **Fixed 2026-07-14** |
| M-2 | Medium | Quadratic regex feed parsing and unbounded response bodies enabled cheap resource exhaustion | **Fixed 2026-07-14** |
| M-3 | Medium | "Official domain" validation used substring matching (`url.includes(domain)`) | **Fixed 2026-07-14** |
| M-4 | Medium | CSP allowed inline scripts and a broad third-party surface | **Partially fixed** (see backlog) |
| M-5 | Medium | GitHub Actions used mutable action tags and persisted a write-capable token across steps | **Fixed 2026-07-14** (see backlog for wheel hashes) |
| L-1 | Low | Unredacted journal logs were published to issues in a public repository | **Fixed 2026-07-14** |
| L-2 | Low | `.gitignore` covered only two `.env` variants; a research doc contained runner-internal paths | **Fixed 2026-07-14** |

## Remediation detail

- **C-1** — `scripts/lib/ai-news-llm.mjs` now invokes the CLI with
  `--tools "" --setting-sources "" --strict-mcp-config
  --disable-slash-commands --no-session-persistence`. Verified live: the
  session init message reports `tools: []` and `permissionMode: default`, and
  an injected instruction to run a shell command produced no side effects.
  Regression-tested in `scripts/ai-news-llm.test.mjs`.
- **H-1** — `safeText()` in `scripts/lib/ai-news-render.mjs` converts all
  Markdown-active characters (`[ ] ( ) ! ` \` `* _`) to numeric HTML entities.
  The review's exact payloads are regression tests in
  `scripts/ai-news-render.test.mjs`. The content validator additionally
  rejects `](javascript:/data:/vbscript:` links and Markdown images.
- **H-2/M-2** — `scripts/lib/ai-news-discovery.mjs` now enforces: HTTPS-only,
  per-feed host allowlists (feed items linking off-domain are dropped), no
  IP-literal hosts, DNS resolution checked against loopback/private/
  link-local/CGNAT/metadata/multicast ranges, redirects followed manually and
  re-validated per hop (max 3), byte caps (2 MB feed / 1.5 MB article), block
  caps (100 items) and deep-read caps (12 per feed). Feed parsing and HTML
  stripping were rewritten as linear scanners; the hostile-input regression
  test dropped from ~17 s (quadratic) to ~1 ms. `ai-news-regenerate.mjs`
  refuses to fetch non-official URLs.
- **M-1** — `scripts/openclaw-ai-news-daily.sh` no longer merges the PR; it is
  left open for human editorial review. Regression-tested in
  `scripts/ai-news-cron.test.mjs`.
- **M-3** — `scripts/lib/ai-news-official.mjs` provides structured matching:
  exact/subdomain hostname comparison plus exact owner/repo paths for GitHub.
  Lookalike domains (`openai.com.attacker.example`, paths containing official
  domains) are rejected; regression-tested in `scripts/ai-news-official.test.mjs`.
- **M-4** — Added `script-src-attr 'none'` and `worker-src 'self' blob:` to
  the CSP in `public/_headers`.
- **M-5** — All GitHub Actions are pinned to full commit SHAs,
  `persist-credentials: false` is set on every checkout (the AI-news PR step
  injects its token only for the push), and Wrangler is a lockfile-pinned
  devDependency instead of a runtime `npx` download.
- **L-1** — `scripts/ai-news-failure-notify.sh` publishes only a fixed
  failure-category label derived locally; raw logs never leave the runner.
- **L-2** — `.gitignore` covers `.env*` (with example-file exceptions), key
  material, and credential files; internal paths were removed from
  `AI_NEWS_AUTOMATION_RESEARCH.md`.

## Verified sound by the review (unchanged)

No shell-injection in the LLM call (arg-array spawn, stdin input); date-based
path traversal blocked; `safeUrl()` percent-encoding; YAML via
`JSON.stringify`; RSS output XML-escaped by `fast-xml-parser`; JSON-LD
`</script>`-escaped; `--force-with-lease` pushes; workflow inputs moved to env
vars before shell use; no secrets in repo or git history; lockfile v3 with
integrity hashes.

## Remaining backlog

1. **CSP `'unsafe-inline'`** — removing it requires moving the site's own
   inline scripts (theme init, analytics bootstrap, 404 redirect probe) to
   hashed/external files, and verifying the ad/consent stack still works.
   Recommended staging: `Content-Security-Policy-Report-Only` with a reporting
   endpoint first.
2. **Third-party origin trim** — the CSP still lists monetization origins that
   are not currently injected by repo code; trim once the monetization setup
   is final.
3. **Python wheel hash-pinning** in `deploy.yml` (`PyYAML` is version-pinned
   but not hash-pinned).
4. **npm advisory status** — `npm audit` runs in CI (`--omit=dev
   --audit-level=high`); the review could not verify advisories offline.
5. **LLM semantic injection** — a compromised source can still bias the
   drafted copy (within validator limits); the mitigation is the mandatory
   human editorial review before merge (M-1). A grounding check that ties
   claims to source spans remains future work.
