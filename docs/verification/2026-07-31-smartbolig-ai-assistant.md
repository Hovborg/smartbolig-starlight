# SmartBolig AI assistant verification — 2026-07-31

## Scope

This record covers the SmartBolig AI assistant implementation and its
Cloudflare Workers deployment preparation.

The assistant uses Workers AI model `@cf/google/gemma-4-26b-a4b-it` as the
broad expert brain for Home Assistant, ESPHome, sensors, Zigbee, Matter, MQTT,
homelabs, networking, Docker, Proxmox, backups, local AI and related topics. AI
Search is supplemental first-party SmartBolig context, not the assistant's only
knowledge source.

Production deployment is outside this local verification record. No live claim
is made until the exact deployed commit and the real production endpoint have
passed the same checks.

## Deployment architecture correction

PR #111 passed every test and build gate, but the first production workflow
stopped before upload because `wrangler pages deploy` rejects the `ai_search`
and `ratelimits` keys for Pages projects. Workers AI itself is supported by
Pages; the two additional bindings are not.

The deployment therefore follows Cloudflare's official Pages-to-Workers
migration path:

- `functions/` remains the source router and is compiled to
  `.worker/index.js`.
- `dist/` is deployed with Workers Static Assets and an `ASSETS` binding.
- Only `/api/*` runs through the Worker before static asset handling.
- `smartbolig.net/*` and `www.smartbolig.net/*` are Worker routes in front of
  the existing Pages-backed DNS. Removing those routes restores Pages as the
  rollback path.
- GitHub Actions runs `wrangler deploy --dry-run` on every PR and performs the
  real `wrangler deploy` only after merge to `main`.

The migrated configuration passed `wrangler deploy --dry-run` with all four
expected bindings (`AI`, `SMARTBOLIG_SEARCH`, `CHAT_RATE_LIMITER`, `ASSETS`) and
1,604 static assets. A local Worker-runtime roundtrip returned HTTP 200 for both
`/da/` and `/api/chat`; the page contained exactly one assistant widget and the
chat returned a complete 2,679-character Danish answer. AI Search exceeded its
five-second bound in that specific request, so the verified graceful fallback
reported `sourceMode: "general"`.

The first real Worker upload then exposed a second deployment-only constraint:
Workers classified every redirect after the first placeholder rule as dynamic,
so two early `/en/ai/news/:slug` rules caused later exact redirects to consume
the 100-rule dynamic quota. The upload stopped before Worker activation with
Cloudflare error `100324`. The two placeholder rules were moved to the end of
`public/_redirects` without changing any source or destination URL. A regression
test now enforces static-before-dynamic ordering and both documented rule
limits. The corrected file was accepted by the local Workers runtime as 117
valid redirect rules with no invalid-rule warning.

## Deterministic checks

The following gates were run from the repository root:

| Check | Result |
| --- | --- |
| `node --test scripts/chat-api.test.mjs` | 15/15 passed, including the final AI Search timeout regression |
| `node --test scripts/chat-widget.test.mjs` | 7/7 passed after the final error-status regression |
| `npm run build` | Passed; 311 pages built, Pagefind and sitemap completed |
| `npx wrangler pages functions build` | Passed; Pages Functions bundle compiled |
| Baseline dependency audit | 8 advisories: 1 low, 3 moderate, 4 high, 0 critical |
| Current dependency audit | Unchanged baseline: 1 low, 3 moderate, 4 high, 0 critical |

The complete site, AI News, content, SEO, generated type, diff and secret-scan
gates are rerun immediately before branch completion. Their final results are
recorded in the last section below.

## Browser verification

Browser checks used the built local preview at
`http://127.0.0.1:4322`, with `/api/chat` mocked in the browser. The mock made
no Workers AI or AI Search calls and consumed no Cloudflare quota.

### Viewports and appearance

- Desktop: 1440×1000, dark and light themes.
- Mobile: 390×844, dark theme.
- Closed launcher, open dialog, mixed-source answer, general-knowledge answer,
  error state and composer were visually inspected.
- Desktop panel measured `418px` client width and `418px` scroll width.
- Mobile page measured `390px` client width and `390px` scroll width.
- The mobile panel formed a full-width bottom sheet with no horizontal
  overflow.
- Reduced-motion emulation matched the media query and reduced launcher,
  panel and orb motion to `0.00001s`.

Ephemeral screenshots from the verification run:

- `/tmp/smartbolig-ai-desktop-closed.png`
- `/tmp/smartbolig-ai-desktop-fixed.png`
- `/tmp/smartbolig-ai-mobile-styled.png`
- `/tmp/smartbolig-ai-light.png`
- `/tmp/smartbolig-ai-final-desktop.png`
- `/tmp/smartbolig-ai-final-mobile.png`

### Functional journeys

- A Danish starter prompt populated and submitted the composer.
- A mocked mixed response rendered one canonical
  `https://smartbolig.net/...` source with `target="_blank"` and
  `rel="noopener noreferrer"`.
- Copy wrote the exact answer to the browser clipboard and changed the button
  label to `Kopieret`.
- Escape closed the panel, set `aria-expanded="false"` and restored focus to
  the launcher.
- A mocked general response rendered `General AI knowledge`, zero source links
  and a complete user/assistant pair in the English session.
- Danish and English histories used separate `sessionStorage` keys.
- The English route rendered English launcher, prompt, privacy and starter
  copy.
- Mocked 429 and 503 responses rendered the correct localized error, retry
  button and matching aria-live status while restoring `aria-busy="false"`.
- A delayed first response was aborted with **Ny samtale**, followed by an
  immediate second request. Only the second user/assistant pair remained in the
  DOM and `sessionStorage`; the stale response produced no alert and did not
  clear the second request's state.
- Browser console errors during the error checks were only the deliberately
  mocked 429 and 503 network responses; no application JavaScript exception
  was observed.
- A fresh browser session against the final native-binding build repeated the
  desktop and mobile mixed-source journey with 0 console errors. Desktop
  measured 1440/1440 page width and 418/418 panel width; mobile measured
  390/390 for both page and panel.

### Browser findings resolved

1. A grid item's minimum content width caused horizontal overflow. The panel
   now uses `minmax(0, 1fr)` and constrains direct children with `min-width: 0`.
2. Astro-scoped styles did not apply to reply nodes created after hydration.
   The widget now uses a globally emitted, uniquely namespaced stylesheet.
3. The visible error card preserved 429/503 details, but the aria-live status
   fell back to a generic message. Both now use the same computed failure
   message.
4. Resetting while a request was running could race with an immediate new
   request. Per-request identity and controller ownership now prevent stale
   success, error and cleanup paths from changing the new conversation.

## Security and privacy review

- Browser-origin requests must match the request URL's origin.
- Browser requests that send `Origin` must match the endpoint origin. Direct
  non-browser clients without `Origin` remain possible but are rate-limited.
  Only JSON `POST` requests are accepted.
- The streamed request body is capped at 24,000 bytes before JSON parsing.
- Only alternating `user` and `assistant` messages are accepted; client
  `system` and `tool` roles are rejected.
- Conversation count, per-message characters, total characters, model output,
  search query, retrieved chunks, retrieval/model steps and execution time are
  bounded.
- Rate limiting runs before model use and fails closed if its binding is
  unavailable.
- AI Search failure or a five-second retrieval timeout degrades to broad
  Workers AI knowledge.
- Retrieved text is treated as untrusted reference data. Only canonical HTTPS
  SmartBolig URLs can become citations.
- The widget uses text nodes and does not use `innerHTML`.
- Chat history stays in `sessionStorage`; the endpoint returns
  `Cache-Control: no-store`.
- Application errors log only the request ID and sanitized error class, not
  prompts, answers, tokens or provider payloads.
- No secret or API token is required in the repository or browser.

The first implementation used AI SDK 6 and introduced one transitive
high-severity `undici` advisory plus three related moderate dependency records.
The final implementation uses Cloudflare's native `env.AI.run()` binding with
bounded retrieval instead. The production dependency audit is therefore back
at the unchanged baseline: 8 advisories (1 low, 3 moderate, 4 high, 0
critical). The remaining findings belong to the existing Astro 6 stack and are
tracked separately from this assistant.

## Live Cloudflare binding verification

Read-only account checks confirmed Wrangler OAuth is connected to the intended
Cloudflare account. No token value was printed or stored.

- AI Search instance: `smartbolig-ai-search`, web-crawler source
  `smartbolig.net`.
- Index state during the check: 309 indexed items, 0 queued, 0 processing,
  0 skipped, 0 outdated and 1 crawler error. The instance reported `waiting`,
  while a direct search still returned current results.
- A controlled AI Search query for Home Assistant automation troubleshooting
  returned relevant canonical SmartBolig pages.
- Wrangler Pages dev compiled with remote `AI` and `SMARTBOLIG_SEARCH` bindings
  plus the local `CHAT_RATE_LIMITER`. Because pinned Wrangler 4.81.1 embeds a
  runtime whose maximum date is `2026-04-16`, `wrangler.jsonc` uses that date;
  it is also newer than AI Search's `2026-03-27` minimum.
- The final controlled `POST /api/chat` returned HTTP 200 in 12.5 seconds with
  request ID `c805e7b9-e98e-449c-a77a-099ada67c759`,
  `sourceMode: "mixed"`, a complete Danish answer and five canonical
  SmartBolig citations.

The model choice was based on live comparisons, not catalogue text alone.
GLM-4.7-Flash and GPT-OSS-120B returned confident but unreliable Danish
Home Assistant paths or commands. Gemma 4 produced the clearest complete Danish
answer, respected the broad-plus-retrieval architecture and has lower current
per-token pricing. Its completion budget is 2,200 tokens with low reasoning
effort; a 1,000-token trial was rejected because hidden reasoning truncated the
visible answer.

## Final gate results

- `npm run site:test`: 56/56 passed.
- `npm run ai-news:test`: 49/49 passed.
- `npm run ai-news:validate`: 61 bilingual daily issue pairs passed.
- `python3 scripts/content-audit.py`: 0 syntax issues, 0 broken links,
  0 missing files.
- `npm run build`: 311 pages built; Pagefind and sitemap completed.
- `npm run seo:validate`: passed for 310 sitemap pages.
- `npm audit --omit=dev --audit-level=critical`: exit 0; unchanged baseline of
  1 low, 3 moderate, 4 high and 0 critical advisories.
- `npx wrangler types`: generated `AI`, `SMARTBOLIG_SEARCH` and
  `CHAT_RATE_LIMITER` bindings with the expected types.
- `npm run worker:build`: compiled the Pages Functions router to the Workers
  entrypoint successfully.
- `npx wrangler deploy --dry-run`: passed with 1,604 static assets and all four
  expected bindings.
- `git diff --check`: clean.
- Credential-pattern scan: clean across all 13 task-owned files.
