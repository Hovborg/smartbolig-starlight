# news-llm: relay til Workers AI

Sidst kontrolleret: 2026-11-14.
Kontrolleret ved: `node --test scripts/ai-news-relay-worker.test.mjs` (40 tests)
og `npx wrangler deploy --dry-run --config workers/news-llm/wrangler.jsonc`.
Den udrullede Worker og dens første rigtige kald står i `docs/nyhedsflow.md`.

En privat Cloudflare Worker mellem det daglige nyhedsjob i GitHub Actions og
Workers AI. Den findes, fordi GitHub Actions ikke kan kalde Workers AI uden et
kontotoken, og fordi forbruget skal have et hårdt loft.

## Hvad den gør

Én rute: `POST /v1/chat/completions` (OpenAI-format). Alt andet giver 404.

| Fil | Ansvar |
|---|---|
| `src/index.js` | Rækkefølgen: nøgle → kald pr. minut → gyldig forespørgsel → reservation → model → afregning |
| `src/auth.js` | Sammenligner nøglen i konstant tid |
| `src/request.js` | Grænser for størrelse, antal beskeder, tokens og tilladte modeller |
| `src/prices.js` | Modellernes pris og udregning af et kalds pris i neurons |
| `src/budget.js` | Dagsloftet og kaldene til tælleren |
| `src/counter.js` | Durable Object, der ejer dagens regnskab |
| `src/ledger.js` | Regnskabets to handlinger: reservér og afregn |
| `src/answer.js` | Henter svarteksten ud af modellens svar |

## Lofter

- Kun modellerne i `ALLOWED_MODELS`, og kun hvis de har en pris i `src/prices.js`.
- 15 kald pr. minut (`CALL_LIMITER`).
- Højst 48 kB pr. forespørgsel og 8.000 svartokens.
- `DAILY_NEURON_BUDGET` neurons pr. døgn (UTC).

## Sådan virker dagsloftet

1. Før modellen kaldes, bogføres kaldets højeste mulige pris: forespørgslens
   størrelse i bytes regnet som inputtokens, plus `max_tokens` som svartokens.
2. Er der ikke plads under loftet, svarer relayet 429 `daily_budget_exhausted`,
   og modellen kaldes ikke.
3. Efter svaret erstattes reservationen af den rigtige pris: de tokens, modellen
   melder, gange modellens pris.

Tælleren er ét Durable Object, som behandler én forespørgsel ad gangen. To kald
på samme tid kan derfor ikke få den samme plads. Et kald, der afbrydes eller
fejler, beholder hele sin reservation. Et svar uden tokental beholder den også; nul, tekst og `true` tæller som manglende tal.
Er det samlede tokental større end input plus output, regnes forskellen som output.
Kan tælleren ikke nås, svarer relayet 503 `budget_unavailable` uden at kalde
modellen.

Svaret indeholder `usage.neurons` (kaldets pris) og `budget` (brugt og loft).

Kontoens gratis kvote er 10.000 neurons pr. døgn og deles med sidens chat.
Hæv ikke loftet over den kvote uden at ville betale for forbruget.

## Ny model eller ny pris

1. Tilføj modellen med pris i `src/prices.js`. Priserne står på
   <https://developers.cloudflare.com/workers-ai/platform/pricing/>.
2. Tilføj den i `ALLOWED_MODELS` i `wrangler.jsonc`.
3. Kør `npm run ai-news:test`. En test fejler, hvis en tilladt model mangler pris.
4. Udrul.

## Udrul

```bash
npx wrangler deploy --config workers/news-llm/wrangler.jsonc
```

Nøglen sættes med `npx wrangler secret put NEWS_LLM_SECRET --config workers/news-llm/wrangler.jsonc`
og skal være mindst 32 tegn. Adressen og nøglen ligger som GitHub-secrets; se
`docs/nyhedsflow.md`.

## Fjern den igen

Slet mappen, `scripts/ai-news-relay-worker.test.mjs` og trinnet "Validate the news relay Worker"
i `.github/workflows/deploy.yml`. Fjern de to GitHub-secrets, og kør
`npx wrangler delete --name smartbolig-news-llm`.
Nyhedsjobbet falder da tilbage til `claude`-udbyderen, hvis den er sat op.
