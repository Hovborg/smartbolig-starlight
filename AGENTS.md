# SmartBolig development

This repository builds smartbolig.net with Astro 7, Starlight 0.41 and a Cloudflare Worker with Static Assets. The separate hub is outside this repository.

- Test the site with `npm run site:test`, news tooling with `npm run ai-news:test`, and content-audit behavior with `python -m unittest discover -s scripts -p "test_*.py"`.
- Before publishing, run `npm run ai-news:validate`, `python scripts/content-audit.py`, `npm audit --audit-level=high`, `npm run build`, `npm run seo:validate`, `npm run worker:build`, and `npx wrangler deploy --dry-run`. Use the locally configured Python executable; Unix CI uses `python3`.
- Include development dependencies in security checks. They execute during local builds and deployment.
- External news fetches must use `fetchPublicText` from `scripts/lib/ai-news-discovery.mjs`. Preserve official-source validation, per-hop host checks, validated-address pinning, whole-request deadlines and streamed byte ceilings. Use injected transports/DNS in tests; never fetch internal hosts to demonstrate a security issue.
- Windows content checks use native Git for Windows Bash and stdin. Do not introduce WSL dependencies.
- MCP servers are managed by the developer's host configuration. Do not add repository-triggered `npx -y` or mutable `@latest` server installs.
- Keep both locales and shared RSS behavior aligned. Test English-only news edits as well as Danish edits.
- A local build or deployment dry run does not verify production bindings, real AI inference or Scheduled Task execution. Report those boundaries explicitly.
