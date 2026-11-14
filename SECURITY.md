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
- `main` cannot be force-pushed or deleted. The site is published only after the repository's
  checks pass: in a pull request, or inside the daily news workflow before it commits.
- GitHub Actions are pinned to a commit. Dependabot proposes updates; patch updates, and minor
  updates of packages at version 1 or later, are merged by themselves after the checks pass.
- Security headers and the Content-Security-Policy are described in
  [`docs/sikkerhed.md`](docs/sikkerhed.md) (Danish).
