# Security

## Report a problem

Use GitHub's private report form: **Security → Report a vulnerability** on this repository
(<https://github.com/Hovborg/smartbolig-starlight/security/advisories/new>). The report is
visible only to the maintainer. Please do not open a public issue for a security problem.

Say what you saw, on which address, and how to see it again. This is a one-person project;
reports are read by the maintainer, with no promised answer time.

## What is in scope

- The site `https://smartbolig.net` and the code in this repository: the pages, the chat
  endpoint (`/api/chat`), the electricity price endpoint (`/api/elpris`) and the GitHub
  workflows.
- Not in scope: the shops the site links to, Google's ad and consent scripts, GitHub and
  Cloudflare themselves.

## How the repository is protected

- No secret is stored in the repository. Keys live as GitHub Actions secrets and Cloudflare
  secrets. GitHub's secret scanning and push protection are on.
- `main` cannot be force-pushed or deleted. Every push to `main` runs the repository's checks
  in the deploy workflow, and the site is published only when they pass. A pull request runs
  the same checks, and the daily news workflow runs its own checks before it commits.
- GitHub Actions are pinned to a commit. Dependabot proposes updates of npm packages and of
  Actions. Of the npm updates, a patch (not of a package at 0.0.x) and a minor update of a
  package at version 1 or later are merged by themselves after the checks pass. Everything
  else, also every update of an Action, waits for a person.
- Security headers and the Content-Security-Policy are described in
  [`docs/sikkerhed.md`](docs/sikkerhed.md) (Danish).
