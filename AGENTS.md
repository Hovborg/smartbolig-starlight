# SmartBolig development

This repository builds smartbolig.net with Astro 7, Starlight 0.41 and a Cloudflare Worker with Static Assets. The separate hub is outside this repository.

- Test the site with `npm run site:test`, news tooling with `npm run ai-news:test`, and content-audit behavior with `python -m unittest discover -s scripts -p "test_*.py"`.
- Before publishing, run `npm run ai-news:validate`, `python scripts/content-audit.py`, `npm audit --audit-level=high`, `npm run build`, `npm run seo:validate`, `npm run worker:build`, and `npx wrangler deploy --dry-run`. Use the locally configured Python executable; Unix CI uses `python3`.
- Include development dependencies in security checks. They execute during local builds and deployment.
- External news fetches must use `fetchPublicText` from `scripts/lib/ai-news-discovery.mjs`. Preserve official-source validation, per-hop host checks, validated-address pinning, whole-request deadlines and streamed byte ceilings. Use injected transports/DNS in tests; never fetch internal hosts to demonstrate a security issue.
- Windows content checks use native Git for Windows Bash and stdin. Do not introduce WSL dependencies.
- MCP servers are managed by the developer's host configuration. Do not add repository-triggered `npx -y` or mutable `@latest` server installs.
- Keep both locales and shared RSS behavior aligned. Test English-only news edits as well as Danish edits.
- A local build or deployment dry run does not verify production bindings, real AI inference or a GitHub Actions run. Report those boundaries explicitly.
- The daily news is written, fact-checked and published by `.github/workflows/ai-news.yml`; read `docs/nyhedsflow.md` before changing it. Each story is written and checked on its own in `scripts/lib/news-llm/` (one responsibility per file, shared limits in `limits.mjs`). Never publish copy without a passed fact check, and never loosen the source, duplicate or evidence rules to get more days published.
- Model calls cost money above Cloudflare's free daily allowance. The relay `workers/news-llm/` enforces a daily neuron ceiling and the run has its own ceilings; do not raise them, and do not call the live relay from tests. A live run counts against the day's budget.
- Redesign work in progress is tracked in `docs/redesign/STATUS.md` (done, next step), with choices in `docs/redesign/BESLUTNINGER.md` and items that need the owner in `docs/redesign/TIL-EJEREN.md`. Update them in the same commit as the change.
- The assistant searches the site's own index (`functions/lib/site-search/`, built by `scripts/site-index.mjs` as the last step of `npm run build`). Read `docs/assistent.md` before changing it. `tokens.js` is shared by the builder and the Worker: a change there changes both. A failed search probe stops the build on purpose; fix the page or the probe, do not remove the check.
- Site configuration lives in `config/` (`site.mjs`, `fonts.mjs`, `sidebar/`, `head/`, `components.mjs`). Keep `astro.config.mjs` a thin entry that only wires those modules together; add sidebar entries or head tags in their module, not in the entry.
