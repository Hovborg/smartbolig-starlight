# Windows news runner: native argument forwarding

The real `-Preflight` run failed before it could verify the Git remote. PowerShell
bound the native Git flag `-C` to `Invoke-Native`'s parameter named `Command`, so
the runner attempted to execute the repository directory as a command.

The helper now takes its executable and arguments directly from `$args`. Native
flags bypass PowerShell's named-parameter binding, paths with spaces remain
single arguments, and non-zero native exit codes still stop the runner.

## Regression and real preflight

- The new regression extracts the actual helper, creates a disposable local Git
  repository in a path with spaces, runs `git -C <path> rev-parse --show-toplevel`,
  and checks that a failed native command throws. It failed before the repair
  with the directory-as-command error and passed after it in Windows PowerShell
  5.1 and PowerShell 7.
- `npm run ai-news:test`: 77 passed, 8 Linux-only tests skipped, zero failures.
- `npm run site:test`: 108 passed.
- Python content-audit tests: 3 passed. Content audit: `TOTAL ISSUES: 0`.
- `npm run ai-news:validate`: 62 bilingual issue pairs passed.
- `npm audit --audit-level=high`: zero vulnerabilities, including dev dependencies.
- `npm run build`: 313 pages. `npm run seo:validate`: 312 sitemap pages passed.
  `npm run worker:build` and `npx wrangler deploy --dry-run`: both passed.
- Actual `-Preflight` using the repaired script and the dedicated automation
  checkout completed in both Windows shells:
  `PREFLIGHT_OK github=authenticated remote=reachable claude=authenticated source_status=200 public_status=200`.

The host preflight used an explicit local GitHub CLI adapter: the existing Git
Credential Manager credential is supplied only to the GitHub CLI child process.
No GitHub login configuration or persistent token was created. The installed
Scheduled Task was not changed, started, or enabled. A preflight success does
not establish a successful scheduled publication or an end-to-end editorial run.

README now describes the daily schedule as behavior of an installed and enabled
task, rather than asserting that the task is currently running on every host.
