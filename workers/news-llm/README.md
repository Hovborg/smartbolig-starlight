# news-llm: relay til Workers AI

Sidst kontrolleret: 2026-11-13 (udrullet; kald uden nøgle giver 401, kald over
dagsloftet giver 429 `daily_budget_exhausted`).

En privat Cloudflare Worker mellem det daglige nyhedsjob i GitHub Actions og
Workers AI. Den findes, fordi GitHub Actions ikke kan kalde Workers AI uden et
kontotoken, og fordi forbruget skal have et hårdt loft.

## Hvad den gør

Én rute: `POST /v1/chat/completions` (OpenAI-format). Alt andet giver 404.

| Fil | Ansvar |
|---|---|
| `src/index.js` | Rækkefølgen: nøgle → kald pr. minut → gyldig forespørgsel → dagsloft → model |
| `src/auth.js` | Sammenligner nøglen i konstant tid |
| `src/request.js` | Grænser for størrelse, antal beskeder, tokens og tilladte modeller |
| `src/budget.js` | Dagsloft i neurons, talt i KV |
| `src/answer.js` | Henter svarteksten ud af modellens svar |

## Lofter

- Kun modellerne i `ALLOWED_MODELS`.
- 15 kald pr. minut (`CALL_LIMITER`).
- `DAILY_NEURON_BUDGET` neurons pr. døgn (UTC). Kan tælleren ikke læses, afvises
  kaldet. Et fejlet modelkald tælles også.

Kontoens gratis kvote er 10.000 neurons pr. døgn og deles med sidens chat.
Hæv ikke loftet over den kvote uden at ville betale for forbruget.

## Udrul

```bash
npx wrangler deploy --config workers/news-llm/wrangler.jsonc
```

Nøglen sættes med `npx wrangler secret put NEWS_LLM_SECRET --config workers/news-llm/wrangler.jsonc`
og skal være mindst 32 tegn. Adressen og nøglen ligger som GitHub-secrets; se
`docs/nyhedsflow.md`.

## Fjern den igen

Slet mappen, fjern de to GitHub-secrets, og kør `npx wrangler delete --name smartbolig-news-llm`.
Nyhedsjobbet falder da tilbage til `claude`-udbyderen, hvis den er sat op.
