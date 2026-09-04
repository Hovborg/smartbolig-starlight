# SmartBolig security and quality verification — 2026-09-04

Repository: `Hovborg/smartbolig-starlight`. Reviewed starting commit: `764d9a88794006393e3979a491b58708832f24e3`. Repair branch: `fix/security-quality-audit-20260904`.

The audit covered the public site's build, Worker/chat boundary, browser components, repository configuration, dependencies and news automation. The separate SmartBolig hub was excluded. Static content checks covered all 312 MDX files; this was not an editorial fact-check of every article.

## Verified repairs

- All production news-source callers now share a bounded HTTPS reader. Each redirect is checked against the source's allowed hosts and public DNS addresses. The connection uses those same validated addresses while preserving the original TLS hostname. Deadlines include DNS and body streaming; size limits apply after decompression. Regeneration preserves the official-source gate. Status-only reference checks cancel the unused response body and report non-2xx responses as failures.
- Wrangler is pinned to `4.129.0`. The full dependency audit fell from six reported advisories (five high, one low) to zero. CI now audits development dependencies as well as runtime dependencies.
- Repository MCP configuration no longer starts mutable `npx -y` servers. Host-managed MCP configuration was not modified.
- Windows content validation uses native Git Bash, UTF-8 and URL-style path separators. False content-audit failures fell from 657 to zero. The Windows daily runner handles a genuinely empty `git ls-remote` result without calling `.Trim()` on null.
- English-only news edits trigger the quality gate. Both RSS feeds exclude section indexes and omit an unknown publication date rather than inventing one.
- Chat does not submit while an IME composition is active. Theme controls remove their event handler when disconnected and tolerate unavailable browser storage.
- Development instructions, duplicate editor build tasks, generated-file exclusions and the two privacy pages were updated to describe the actual behavior, including Giscus/GitHub comments.

The starting commit already contained the Windows news runner and automatic-publication quality checks, ahead of remote `main`. These were included in the repository review and test runs; the repair branch preserves that history.

## Local command evidence

Commands below ran against the repair worktree on Windows, using Node and the configured Python 3.14 interpreter. `python` in this table denotes that interpreter.

| Command or check | Observed result |
| --- | --- |
| `npm run site:test` | 108 passed, 0 failed |
| `npm run ai-news:test` | 76 passed, 8 Linux-specific tests skipped on Windows, 0 failed |
| `python -m unittest discover -s scripts -p "test_*.py"` | 3 passed |
| `python scripts/content-audit.py` | 0 syntax issues, 0 broken internal links, 0 missing files; total 0 |
| `npm run ai-news:validate` | 62 bilingual daily issues validated |
| `npm audit --audit-level=high` | `found 0 vulnerabilities` |
| `npm run build` | 313 pages built; Pagefind indexed 313 pages; 312/312 sitemap dates derived from content history |
| `npm run seo:validate` | 312 sitemap pages passed |
| `npm run worker:build` | Worker/router compiled successfully |
| `npx wrangler deploy --dry-run` | 1,617 assets; Worker 82.18 KiB, gzip 22.31 KiB; exit 0 |
| `npm run ai-news:source-health` | All 7 feeds responded successfully |
| Configured reference checks using `checkReferenceUrl` | All 11 references returned HTTP 200 and `ok: true` |
| Rendered HTML/anchor audit | 313 pages, 52,100 local references, 0 missing targets, 0 missing anchors, 0 duplicate IDs |
| Built RSS inspection | 115 guides in each locale; no section-index items or fabricated fallback dates |
| `git diff --check` | Exit 0 |

Regression tests reproduced the affected behavior before the fixes. Network tests use injected transports and DNS; no internal host was probed. The HTTPS tests exercise address pinning, TLS hostname preservation, redirects, deadlines, decompression limits, cancellation and the real publisher's transport selection.

An isolated, headless Chrome session exercised the built site over loopback with an intercepted chat endpoint. Both locales were checked at widths 1366, 768 and 390. The browser verified composition handling, normal Enter submission, safe text/source rendering, reset/close, one theme toggle after reconnect, search results and mobile article layout. Output: `PASS`, 8 scenario records, 2 mocked chat requests, no page errors or horizontal overflow. Real AI inference was not invoked.

An independent final reviewer found no remaining actionable correctness or security issue in the repaired code. Two review findings, a caller bypassing the pinned transport and reference checks accepting 4xx responses, were corrected and rechecked before this record was written.

## Native security report

Codex Security scan ID: `cd3764ba-c61c-4773-a1ce-000956926437`. The canonical report is indexed in the local security workbench. It records three validated findings in the starting snapshot: one medium finding in alternate news fetchers and two low findings concerning DNS-to-connection binding and mutable repository MCP startup. All three have source changes and regression/review evidence in this branch.

The scan report remains attached to the original snapshot. Its finding state is not a claim that a separate post-repair scan was run or that remote deployment has occurred. Dependency advisories are recorded separately from those three source findings.

The scan tool reported 22,797,878 total tokens across five threads, including 21,063,296 cached input tokens; input 22,663,966, output 133,912, reasoning output 38,782. These are tool-reported aggregate accounting figures, not a monetary cost or a count of newly generated tokens.

## Integration and remaining verification boundaries

The read-only workspace repository audit confirmed the GitHub repository's identity, visibility and `main` branch. The shared portfolio registry still labels this repository `github_only` without a local path, so that audit classifies the portfolio mapping as `unverified`. The actual clone, remote URL, branch ancestry and push access were checked directly. This change does not claim that the shared portfolio registry is synchronized.

Local tests, a build and a deployment dry run do not prove production bindings, real Cloudflare AI/Search responses or an installed Windows Scheduled Task execution. GitHub CI and any subsequent deployment results must be checked on the actual pushed commit and reported separately. No live service was stopped, and the separate hub and host MCP configuration were left untouched.
