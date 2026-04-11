# AI News automation research

Research date: 2026-04-11

Scope: evaluate adding an "AI News" tab to SmartBolig.net where OpenClaw
collects high-signal AI news once per day and publishes a curated page.

## Conclusion

Yes, this is feasible and it is a good fit for the current setup.

The strongest architecture is not a live scraper on Cloudflare Pages. The site
is a static Astro/Starlight site, so the best first version is:

1. OpenClaw runs a daily AI News job.
2. The job writes a reviewed MDX file into the site repository.
3. The job opens a PR, or commits to a dedicated branch.
4. GitHub Actions builds and deploys to Cloudflare Pages after approval/merge.
5. The public page shows a dated archive and one latest-news overview.

This preserves static performance, gives Git history, avoids runtime prompt
injection on the public site, and keeps deployment auditable.

## Current local facts

- Site root: `/mnt/c/codex_projekts/infrastructure/HA_claude_code/site`
- Framework: Astro + Starlight
- Hosting: Cloudflare Pages
- Deploy: `.github/workflows/deploy.yml`
- Deploy trigger today: push to `main` or manual `workflow_dispatch`
- Current AI section already exists under `src/content/docs/{da,en}/ai/`
- OpenClaw cron is available and enabled.
- OpenClaw already has AI Radar jobs installed.
- AI Radar writes markdown reports to
  `/mnt/c/codex_projekts/apps/openclaw-codex-pro/reports/ai-radar/`.

## Existing OpenClaw leverage

OpenClaw already has almost the right primitive:

- `ai-radar-morning-brief-weekday`
- `ai-radar-morning-brief-weekend`
- `ai-radar-breaking-watch`
- `ai-radar-weekly-model-digest`

Those jobs currently write local markdown reports and are intentionally not
tracked as public site content. The new site feature should not simply expose
that private report folder. It should add a publish step that converts a daily
report into a public-safe article.

## Recommended information architecture

```text
src/content/docs/da/ai/nyheder/
  index.mdx
  2026-04-11.mdx

src/content/docs/en/ai/news/
  index.mdx
  2026-04-11.mdx
```

Sidebar:

- AI
  - Oversigt
  - AI News
  - AI CLI'er

First release should publish Danish first. English can either be:

- translated from the Danish daily article, or
- a shorter English mirror generated from the same facts.

## Public article format

Each public page should be concise and source-first:

```md
---
title: "AI-nyheder, 11. april 2026"
description: "Dagens vigtigste AI-nyheder om OpenAI, Claude, Gemini og coding agents."
date: 2026-04-11
---

## Kort sagt

2-4 lines.

## Vigtigste nyt

### 1. Source-backed headline

- Hvad skete der?
- Hvorfor betyder det noget?
- Hvad bør læseren gøre?

Kilde: [label](url)

## Hvad skal man holde øje med?

## Kilder
```

Rules:

- No copied article text.
- Short quoted snippets only if needed.
- Every fact section needs a source URL.
- Separate facts from recommendations.
- Say "ingen høj-signal nyheder" on weak days.
- Never publish private OpenClaw/internal operational details.

## Source pack

Use official sources first:

- OpenAI news RSS: https://openai.com/news/rss.xml
- OpenAI Codex releases: https://github.com/openai/codex/releases.atom
- OpenAI platform changelog: https://platform.openai.com/docs/changelog
- Anthropic news: https://www.anthropic.com/news
- Claude Code release notes: https://docs.anthropic.com/en/release-notes/claude-code
- Claude Code releases: https://github.com/anthropics/claude-code/releases.atom
- Google AI blog RSS: https://blog.google/technology/ai/rss/
- Gemini API changelog: https://ai.google.dev/gemini-api/docs/changelog
- Gemini CLI releases: https://github.com/google-gemini/gemini-cli/releases.atom
- OpenClaw releases: https://github.com/openclaw/openclaw/releases

Secondary sources can be used only as leads, not as final citation sources.

## Publishing pipeline options

### Option A: PR-based static publish

Best first version.

Flow:

1. OpenClaw cron runs daily.
2. Script fetches source feeds and passes source summaries to the agent.
3. Agent writes `src/content/docs/da/ai/nyheder/YYYY-MM-DD.mdx`.
4. Script runs `npm run build`.
5. Script commits to branch `ai-news/YYYY-MM-DD`.
6. Script opens GitHub PR.
7. Human reviews and merges.
8. Existing GitHub Actions deploys to Cloudflare Pages.

Pros:

- Best safety and editorial control.
- Git history for every article.
- No runtime LLM on the public site.
- Easy rollback.

Cons:

- Requires human merge unless later auto-approve is added.

### Option B: direct commit to main

Good later, only after the format is stable.

Pros:

- Fully automatic daily publishing.

Cons:

- A bad source interpretation can publish immediately.
- Requires tighter validation and rollback.

### Option C: Cloudflare KV + Pages Function

Not recommended for first version.

Pros:

- No rebuild required.
- Can update content independently of Git.

Cons:

- More moving parts.
- Harder SEO and audit story.
- Runtime content safety needs extra controls.
- Current site is already static and works well.

## Quality gates

The daily publish script should reject an article if:

- fewer than two official sources are used, unless the article says signal is weak
- a source URL is missing for a fact section
- the page contains private paths, local tokens, env vars, phone numbers, or internal OpenClaw logs
- title/date does not match the filename
- `npm run build` fails
- the file is too long
- the article copies long source text

## SEO notes

AI news pages should avoid thin daily spam.

Good:

- one daily page only when there is signal
- archive page with latest 10
- stable URLs
- RSS inclusion
- `date` frontmatter
- clear source links
- human-readable summaries

Avoid:

- publishing filler every day
- reposting vendor marketing text
- broad "AI changed everything" commentary
- unsourced claims

## Recommended implementation plan

1. Add `da/ai/nyheder/` and `en/ai/news/` content folders.
2. Add sidebar links under AI.
3. Add a public-safe article template.
4. Add `scripts/ai-news-publish.mjs` in the site repo.
5. Reuse OpenClaw AI Radar source pack, but write to the site repo.
6. Add a new OpenClaw cron job: `smartbolig-ai-news-daily`.
7. Start PR-based for 1-2 weeks.
8. Only then consider direct publish to `main`.

## Decision

Build it as a curated daily AI news section, not an automated raw feed.

OpenClaw should be the researcher and drafter. GitHub PR/build should be the
publish gate. Cloudflare Pages should stay static.
