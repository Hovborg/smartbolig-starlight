# SmartBolig.net: instructions for coding assistants

The rules live in one place so they cannot drift apart. Read these before changing anything:

- `AGENTS.md`: project structure, release gates, AI news rules, deploy.
- `CONTENT-GUIDE.md`: how guides are written (Danish first, English mirror).
- `docs/designsystem.md`: colours, sizes, themes, how to change a value or add a component.
- `docs/nyhedsflow.md`: the daily AI news flow and its troubleshooting.
- `docs/oss.md`: the open source in use, with versions and licences.

Short version:

- Astro + Starlight, published as a Cloudflare Worker with static assets. No Tailwind.
- Every colour, size, radius, shadow and motion value is a `--sb-*` token in `src/styles/tokens/`. Do not write raw colours in components.
- Dark theme is the default; light is the visitor's choice. Build and check in both.
- Content is bilingual: a page under `src/content/docs/da/` has a mirror under `src/content/docs/en/`.
- The repository is public: no secrets, tokens, internal paths or private details in commits.
- Small files with one responsibility. Update the docs in the same change.
