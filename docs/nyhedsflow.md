# Nyhedsflow: den daglige AI-nyhed

Sidst kontrolleret: 2026-11-13.
Kontrolleret ved: hele kæden kørt mod dagens rigtige kilder uden at skrive filer
(4 historier bestod, 0 kasseret, 16 modelkald, 245 sekunder), og relayets
dagsspærre afprøvet mod den udrullede Worker (kald afvist med
`daily_budget_exhausted`).
Ikke kontrolleret endnu: første kørsel i GitHub Actions og tre dages drift i træk.

## Hvad sker der hver dag

Workflowet `.github/workflows/ai-news.yml` kører kl. 04:37 og 11:37 UTC.
Den anden kørsel stopper med det samme, hvis dagens udgave findes.

1. **Hent kilder.** `scripts/ai-news-sources.mjs` har listen over officielle kilder.
   Al hentning går gennem `fetchPublicText` (værtskontrol pr. hop, fastlåst adresse,
   tidsfrist, bytegrænse).
2. **Vælg kandidater.** `scripts/lib/ai-news-scoring.mjs` giver point,
   `selectEditorialPackage` fjerner dubletter mod de seneste 14 dage og vælger op til
   7 kandidater, højst én pr. kilde.
3. **Skriv og kontrollér hver historie for sig** (`scripts/lib/news-llm/`):
   skriv engelsk og dansk → formatkontrol → talkontrol mod kildeteksten → uafhængigt
   faktatjek hos en anden model → op til to rettelser → bestået eller kasseret.
   En kasseret historie tager ikke de andre med sig.
4. **Stop ved 4 beståede.** Under 3 beståede: dagen springes over.
5. **Indledning** skrives til sidst ud fra de beståede historier og faktatjekkes.
   Fejler den, bruges en fast, faktuel indledning.
6. **Samme kontroller som ved udgivelse** køres, før noget når `main`.
7. **Commit til `main`**, kun de ni filer en udgave består af
   (`scripts/lib/ai-news-issue-files.mjs`), og udgivelse gennem `deploy.yml`.
8. **Overvågning.** Jobbet `watch` åbner én GitHub-sag, når nyeste udgave er
   3 dage gammel, og lukker den igen, når der udgives.

En dag uden nok kontrollerede historier er en vellykket kørsel, der intet udgiver.
Den blokerer ikke næste dag: der gemmes ingen tilstand mellem kørsler.

## Hvor ser jeg, hvad der skete

Ét sted: GitHub → Actions → **AI News** → den enkelte kørsel → **Summary**.
Den viser udgivet/sprunget over/fejlet, antal modelkald og neurons, og hvilke
historier faktatjekket kasserede med begrundelse.

Du får kun besked, når udgivelsen har stået stille i 3 dage (sagen med mærkatet
`ai-news-stalled`), eller hvis selve udgivelsen til Cloudflare fejler.

## Fejlfinding

| Det ser du | Årsag | Gør dette |
|---|---|---|
| "Nothing published … stories passed the fact check; 3 are required" | For få historier bestod. Normalt på stille dage. | Intet. Sker det mange dage i træk: læs begrundelserne under "Dropped by the fact check". |
| "No novel candidate met the editorial score threshold" | Ingen nye, relevante kilder. | Intet. |
| "The issue for … already exists" | Dagens udgave findes. | Intet. |
| Trinnet "Write and fact-check the issue" er rødt med `LLM endpoint answered 401` | Nøglen i GitHub passer ikke til relayet. | Følg "Skift nøgle" nedenfor. |
| `The relay's daily model budget is used up` | Dagens loft på 8.000 neurons er nået. | Intet; tælleren nulstilles kl. 00:00 UTC. |
| `Every writer model failed` to historier i træk | Modellen er udgået, eller Workers AI er nede. | Se "Skift model". |
| `All critical feeds failed` | Kilderne kan ikke hentes fra GitHub. | Kør workflowet igen senere. |
| Et kontroltrin efter skrivningen er rødt | Udgaven bestod ikke en kvalitetskontrol. Intet er committet. | Læs trinnets log. Svæk ikke kontrollen; ret årsagen. |
| Jobbet `deploy` er rødt | Udgaven er på `main`, men ikke udgivet. | Næste kørsel opdager det (siden svarer 404) og udgiver selv. |

Kør manuelt: Actions → AI News → **Run workflow**. Sæt `dry_run` for at køre alt
uden commit og udgivelse.

## Hvad det koster

Modellerne kører på Cloudflare Workers AI. Kontoen har 10.000 neurons gratis pr.
døgn (UTC); forbrug derover koster penge. Derfor er der to lofter:

- **Relayet** holder dagens forbrug under 8.000 neurons. Før hvert modelkald
  bogfører det kaldets højeste mulige pris; er der ikke plads, afvises kaldet.
  Efter svaret rettes tallet til den rigtige pris. Et afbrudt eller fejlet kald
  beholder hele reservationen, og to kald på samme tid tælles begge. Kan
  tælleren ikke nås, afvises kaldet.
- **Kørslen** (`scripts/lib/news-llm/limits.mjs`) stopper ved 40 kald eller
  6.000 neurons.

Prisen regnes ud fra de tokens, modellen melder tilbage, gange modellens pris i
`workers/news-llm/src/prices.js` (Cloudflares prisliste, neurons pr. million
tokens). En model uden pris i den fil kan ikke kaldes. Ændrer Cloudflare en pris,
rettes tallet dér.

Sidens chat bruger samme gratis kvote; de 2.000 neurons mellem 8.000 og 10.000 er
til den. Det målte forbrug står i hver kørsels Summary.

## Modeller

Valgt 2026-11-13 efter måling på én rigtig kilde (skrivning) og én historie med
plantede fejl (kontrol). Listen står i `scripts/lib/news-llm/models.mjs`, og
relayet tillader kun de samme fire (`workers/news-llm/wrangler.jsonc`).

| Rolle | Model | Måling |
|---|---|---|
| Skriver | `deepseek-v4.1-flash` | Bedste dansk; ca. 436 neurons og 23 s pr. historie |
| Skriver, reserve | `gemma-4-26b` | 181 neurons, 85 s; gav én gang tomt svar |
| Kontrol | `gpt-oss-120b` | Godkendte den korrekte historie og fangede alle 4 plantede fejl; 86–152 neurons, 3–16 s |
| Kontrol, reserve | `nemotron-3-120b` | Samme resultat; 646 neurons, langsom |

Fravalgt: `deepseek-v4-pro` (1.977 neurons pr. kald), `llama-4-scout` og
`mistral-small` (svagt dansk), `kimi-k2.6`, `glm-5.3` og `qwen3.8` (intet svar
eller tidsfrist).

Skriveren og kontrollen er altid to forskellige modeller.

### Skift model

1. Ret listen i `scripts/lib/news-llm/models.mjs` og `ALLOWED_MODELS` i
   `workers/news-llm/wrangler.jsonc`.
2. Udrul relayet (se nedenfor).
3. Kør workflowet med `dry_run`, og læs Summary.

Midlertidigt uden kodeændring: sæt `AI_NEWS_WRITER_MODELS` eller
`AI_NEWS_REVIEWER_MODELS` (kommasepareret) som variabel i workflowet. Modellen
skal stadig stå i relayets liste.

## Relayet

`workers/news-llm/` er en lille Cloudflare Worker med én rute. Den kræver en
nøgle, tillader kun de fire modeller, har et loft på 15 kald pr. minut og
dagsloftet ovenfor. Detaljer: `workers/news-llm/README.md`.

Udrul efter ændringer:

```bash
npx wrangler deploy --config workers/news-llm/wrangler.jsonc
```

## Hemmeligheder

Ingen værdier står i repoet. Navnene:

| Navn | Hvor | Bruges til |
|---|---|---|
| `NEWS_LLM_SECRET` | Worker-secret på relayet | Nøglen relayet kræver |
| `AI_NEWS_LLM_KEY` | GitHub-secret | Samme nøgle, set fra workflowet |
| `AI_NEWS_LLM_URL` | GitHub-secret | Relayets adresse (holdes ude af repoet) |

### Skift nøgle

1. Lav en ny tilfældig nøgle på mindst 32 tegn.
2. `npx wrangler secret put NEWS_LLM_SECRET --config workers/news-llm/wrangler.jsonc`
3. `gh secret set AI_NEWS_LLM_KEY`
4. Kør workflowet med `dry_run`.

## Kør lokalt

Uden model (skabelontekst, skriver intet):

```bash
node scripts/ai-news-publish.mjs --date 2026-11-13
```

Med model kræves `AI_NEWS_LLM_URL` og `AI_NEWS_LLM_KEY` i miljøet og flaget
`--require-llm`. Uden `--write` skrives ingen filer. Hvert kald tæller med i
dagsloftet.

## Kontroller, der ikke må svækkes

- Kun officielle kilder, og mindst én primær kilde pr. udgave.
- Sikker hentning gennem `fetchPublicText`.
- Dubletkontrol mod de seneste 14 dage (adresse, titel og kildesæt).
- Mindst 240 tegns kildetekst pr. historie.
- Intet udgives uden bestået faktatjek (`semanticReview: passed` sættes kun dér).

Skal flere dage udgive, så forbedr kildeteksten eller skriverens regler. Sænk
ikke kravene.

## Kendte grænser

- OpenAI's artikelsider svarer 403 til robotter. Kun korte feed-resuméer er
  tilgængelige, og de falder for kravet om 240 tegn. Det omgås ikke.
- GitHub kan forsinke eller springe planlagte kørsler over. Derfor to tidspunkter.
