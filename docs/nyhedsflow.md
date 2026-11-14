# Nyhedsflow: den daglige AI-nyhed

Sidst kontrolleret: 2026-11-14.
Kontrolleret ved: første rigtige kørsel i GitHub Actions (startet manuelt
2026-11-14 kl. 00:27 UTC). 4 historier bestod faktatjekket, 0 kasseret, 12
modelkald, 3.282 neurons, knap 7 minutter fra start til udgivet. Udgaven blev
committet til `main` og udgivet af kørslen selv; bagefter svarede begge
sprogsider, nyhedsoversigten, sitemap og RSS med dagens udgave. En prøvekørsel
(`dry_run`) samme dag bestod også (4 historier, 10 kald, ca. 2.800 neurons).
Relayets dagsspærre blev afprøvet 2026-11-13 mod den udrullede Worker (kald
afvist med `daily_budget_exhausted`).
Den første planlagte kørsel startede af sig selv 2026-11-14 kl. 11:43 UTC (seks minutter efter
planen) og lykkedes; dagens udgave fandtes allerede (udgivet af den manuelle kørsel kl. 00:27),
så den udgav ikke noget nyt. Reserverne kl. 08:37 og 14:37 kom først på `main` samme dag kl.
12:36 UTC; kl. 16:40 UTC var der ingen kørsel for 14:37.
Ikke kontrolleret endnu: en planlagt kørsel, der selv udgiver en udgave, en reservekørsel, og
tre dages drift i træk.

## Hvad sker der hver dag

Workflowet `.github/workflows/ai-news.yml` har fire tidspunkter (UTC): 04:37 og 11:37 er de
to daglige kørsler, 08:37 og 14:37 er deres reserver. Kørslen kl. 11:37 stopper med det samme,
hvis dagens udgave findes.

Reserverne findes, fordi GitHub kan springe en planlagt kørsel over. Jobbet `slot` (`scripts/ai-news-slot.mjs`) spørger GitHub,
hvilke planlagte kørsler der er startet i dag. Er kørslen, reserven står for, startet, skriver
reserven intet: en dag uden nok historier koster altså ikke et ekstra forsøg. Kan listen ikke
læses, skriver kørslen; en mistet dag er værre end et ekstra forsøg. En manuel kørsel skriver
altid. Kørslens titel viser, hvilken tidslinje der startede den ("AI News: 37 4 * * *";
en manuel kørsel hedder "AI News: manual"). En kørsel fra før 2026-11-14 kl. 12:36 UTC hedder
kun "AI News" og tæller ikke som en kørsel, en reserve står for.

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
4. **Stop ved 4 beståede.** Under 3 beståede: dagen springes over. Danner de beståede
   et kildesæt, der gentager en nylig udgave, fortsættes med de resterende kandidater,
   så en historie fra en anden kilde kan ændre sættet, før modelkaldene er brugt.
5. **Indledning** skrives til sidst ud fra de beståede historier og faktatjekkes.
   Fejler den, bruges en fast, faktuel indledning.
6. **Kontroller før commit.** Disse kører i kørslen, før noget når `main`:
   `ai-news:test`, `ai-news:validate`, kvalitetskontrol og billedkontrol af den nye
   udgave, `site:test`, `content-audit.py`, `build`, `seo:validate` og `worker:build`.
   Kun i `deploy.yml` kører desuden `content-audit`-enhedstestene, sikkerhedsrevisionen
   af afhængigheder, de to `wrangler deploy --dry-run` og kvalitetskontrollen af den
   ændrede udgave (`ai-news:quality:changed`).
7. **Commit til `main`**, kun de ni filer en udgave består af
   (`scripts/lib/ai-news-issue-files.mjs`), og udgivelse gennem `deploy.yml`.
   Udgivelsen gælder altid den aktuelle spids af `origin/main`. Er `main` rykket
   videre, når `deploy.yml` kører, udgiver den kørsel intet; det nyere push har sin egen.
   Et kald fra nyhedsworkflowet udgiver kun, når den kontrol har sagt ja.
8. **Overvågning.** Jobbet `watch` åbner én GitHub-sag, når nyeste udgave er
   3 dage gammel, og lukker den igen, når der udgives. Sagen åbnes kun af den
   sene kørsel (11:37 UTC), dens reserve (14:37 UTC) eller en manuel kørsel; lukning
   sker i alle kørsler.

En dag uden nok kontrollerede historier er en vellykket kørsel, der intet udgiver.
Den blokerer ikke næste dag: der gemmes ingen tilstand mellem kørsler.

## Hvor ser jeg, hvad der skete

Ét sted: GitHub → Actions → **AI News** → den enkelte kørsel → **Summary**.
Den viser udgivet/sprunget over/fejlet, antal modelkald og neurons, forbruget pr.
model (svar, tokens ind og ud, neurons), relayets samlede forbrug for dagen, og
hvilke historier faktatjekket kasserede med begrundelse.

Samme tekst står i loggen for trinnet "Report the outcome", så den også kan
læses fra en terminal: `gh run view <kørsel> --log`.

En reserve, der holder sig i ro, skriver én linje på samme Summary-side:
"**Slot:** Not writing: run … already covered the early slot today." Jobbet `publish` står
da som sprunget over.

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
| Jobbet `deploy` er rødt | Udgaven er på `main`, men ikke udgivet. | Næste kørsel læser den indcommittede `main` (ikke arbejdsmappen), opdager at siden svarer 404 og udgiver selv. Fejlede selve push, udgives intet. |

Kør manuelt: Actions → AI News → **Run workflow**. Sæt `dry_run` for at køre alt
uden commit og udgivelse.

### Fejlsøg en kørsel fra en terminal

1. Se dagens kørsler. `event` er `schedule` eller `workflow_dispatch` (manuel), og titlen
   viser tidspunktet:

   ```bash
   gh run list --workflow ai-news.yml --limit 10 --json databaseId,event,displayTitle,conclusion,createdAt
   ```

2. Se jobbene i én kørsel. **Kørslens farve siger ikke nok:** jobbet `publish` har
   `continue-on-error`, så en fejlet dag giver en grøn kørsel med et rødt `publish`-job (der
   sendes ingen fejlmail for en enkelt dårlig dag).

   ```bash
   gh run view <kørsel> --json jobs --jq '.jobs[] | "\(.name): \(.conclusion)"'
   ```

3. Læs, hvad kørslen selv siger:

   ```bash
   gh run view <kørsel> --log | grep -E "Writing:|Not writing:|AI_NEWS_STATUS|Published|Nothing published|Failed\."
   ```

| Det ser du | Det betyder |
|---|---|
| `slot` grøn, `publish` sprunget over, "Not writing: run … already covered …" | En reserve, der holdt sig i ro, fordi den kørsel, den står for, startede. Normalt |
| `publish` grøn, "Nothing published" og en af grundene i tabellen ovenfor | En dag uden udgave, eller udgaven fandtes. Normalt |
| `publish` grøn, "**Published** … fact-checked stories", `deploy` grøn | Dagens udgave er skrevet og udgivet |
| `publish` rød (kørslen er stadig grøn), "**Failed.**" i rapporten | Et trin fejlede. Find trinnet i tabellen ovenfor |
| Ingen kørsel for et tidspunkt | GitHub startede den ikke. Se nedenfor |

**En planlagt kørsel mangler.** Forsinkelser på 5 til 30 minutter er almindelige. Mangler én
kørsel helt, tager reserven over; mangler begge i et par, tager næste par over. Et nyt
tidspunkt i workflowet kan mangle den første dag. Er dagens udgave ikke kommet kl. 15:30 UTC,
og vil du have den: start workflowet i hånden (ovenfor). Kommer der ingen udgave i tre dage,
åbner nyhedsflowet sagen `ai-news-stalled`, og sidevagten åbner sin egen
(`docs/overvaagning.md`); hvad der så kan gøres, står i `docs/redesign/TIL-EJEREN.md` punkt 16.
Starter GitHub slet ingen planlagte kørsler i repoet, kører sidevagten heller ikke: se "Ingen
kørsler" i `docs/overvaagning.md`.

## Hvad det koster

Modellerne kører på Cloudflare Workers AI. Kontoen har 10.000 neurons gratis pr.
døgn (UTC); forbrug derover koster penge. Derfor er der to lofter:

- **Relayet** holder dagens forbrug under 8.000 neurons. Før hvert modelkald
  bogfører det kaldets højeste mulige pris; er der ikke plads, afvises kaldet.
  Efter svaret rettes tallet til den rigtige pris. Et afbrudt eller fejlet kald
  beholder hele reservationen. Det samme gør et svar, der melder nul tokens
  eller tal, der ikke er hele. To kald på samme tid tælles begge. Kan tælleren
  ikke nås, afvises kaldet.
  Fejler modellen bag relayet (`upstream_failed`), prøver jobbet ikke samme
  model igen, men går til reservemodellen: hvert forsøg bogfører en ny
  reservation.
- **Kørslen** (`scripts/lib/news-llm/limits.mjs`) stopper ved 40 kald eller
  6.000 neurons. Den tæller kun kald, der gav svar; fejlede kald ses kun af
  relayets dagsloft.

Prisen regnes ud fra de tokens, modellen melder tilbage, gange modellens pris i
`workers/news-llm/src/prices.js` (Cloudflares prisliste, neurons pr. million
tokens). En model uden pris i den fil kan ikke kaldes. Ændrer Cloudflare en pris,
rettes tallet dér.

Sidens chat bruger samme gratis kvote; de 2.000 neurons mellem 8.000 og 10.000 er
til den. Det målte forbrug står i hver kørsels Summary.

Målt på den første rigtige kørsel (2026-11-14, 4 historier og indledning):

| Model | Svar | Tokens ind | Tokens ud | Neurons |
|---|---|---|---|---|
| `deepseek-v4.1-flash` (skriver) | 6 | 14.444 | 18.389 | 2.404 |
| `gpt-oss-120b` (kontrol) | 6 | 16.297 | 5.217 | 878 |
| I alt | 12 | 30.741 | 23.606 | 3.282 |

En normal dag bruger altså ca. 3.300 af de 8.000 neurons. Springer morgenens
kørsel dagen over, kan middagskørslen bruge det samme igen uden at nå loftet.

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

Skriver og kontrol er to forskellige modeller i standardlisterne. Det er en
konvention i standardværdierne og er ikke tvunget: sættes en liste om, kan de to
roller ende på samme model.

### Skift model

1. Ret listen i `scripts/lib/news-llm/models.mjs` og `ALLOWED_MODELS` i
   `workers/news-llm/wrangler.jsonc`.
2. Tilføj modellens pris i `workers/news-llm/src/prices.js`. Uden pris afviser
   relayet modellen, og en test fejler.
3. Udrul relayet (se nedenfor).
4. Kør workflowet med `dry_run`, og læs Summary.

Workflowet læser ingen `vars.*`, så modeller kan ikke skiftes uden en kodeændring:
den eneste vej er at rette `scripts/lib/news-llm/models.mjs` og relayets
tilladelsesliste og så udrulle relayet. Miljøvariablerne `AI_NEWS_WRITER_MODELS`
og `AI_NEWS_REVIEWER_MODELS` bruges kun ved lokale kørsler; workflowet sætter dem ikke.

## Overskriftsbilleder

Hver udgave har fire JPEG-varianter (`public/images/ai-news/<dato>.jpg`, `-16x9`, `-4x3`,
`-1x1`) og en WebP-miniature (`-thumb.webp`). `scripts/ai-news-render-image.mjs` tegner dem
ud fra den danske artikel og kilderne i frontmatter; workflowet kalder det og
`ai-news-thumbs.mjs` for den nye udgave.

Overskriften på billedet er `news.imageHeadline`, ellers artiklens hovedhistorie: teksten
efter kolon i titlen, ellers den første `###`-overskrift (`scripts/lib/news-lead.mjs`, som
nyhedsoversigten også bruger). Den bare titel "AI-nyheder, <dato>" bruges kun, hvis artiklen
ingen historier har.

Den danske og den engelske artikel deler billedet. Derfor står der ingen ord på det ud over
overskriften og kildenavnene: mærket hedder "SmartBolig.net · AI", og datoen står som
`2026-11-14`. Der er ingen sprogindstilling.

Udseendet følger sitets mørke tema: grafitbaggrund (`--sb-bg`), et blødt grønt skær i det
ene hjørne, et næsten usynligt prikgitter, husmærket med "SmartBolig.net · AI",
overskriften i Bricolage Grotesque bold
(højst tre linjer; skrives mindre, og afkortes med "…" hvis den stadig er for lang),
datoen i accentgrøn, kilderne som neutrale omridsede piller og til højre et abstrakt
vektormotiv (netværk, signalbuer eller skjold efter emne) i accentfarven. Farverne står kun
i `scripts/lib/brand/palette.mjs`.

Al tekst er outlinede stier fra sitets egne skrifter (Bricolage Grotesque og Figtree fra
`@fontsource-variable`, via `scripts/lib/brand/text.mjs`). Billedet er derfor ens på Ubuntu
i CI og på Windows og afhænger ikke af installerede skrifter; SVG'en indeholder ingen
`<text>`-elementer. Koden ligger i `scripts/lib/news-image/` (`headline.mjs`: tilpasning og
ombrydning, `motif.mjs`: motiverne, `compose.mjs`: sammensætningen).

Gentegn alle udgaver (kun billederne ændres, ikke artiklerne):

```bash
for f in src/content/docs/da/ai/nyheder/2026-*.mdx; do
  node scripts/ai-news-render-image.mjs --date "$(basename "$f" .mdx)" --force
done
node scripts/ai-news-thumbs.mjs --force
```

Ny udgave, 2026-11-14: alle 64 udgaver (320 filer) er gentegnet med den nye skabelon;
`public/images/ai-news` gik fra 30,0 til 11,5 MB. Kontrolleret ved at åbne JPEG'erne i fuld
størrelse og skaleret til 300 px bredde (dansk æ/ø/å, lang og ubrudt overskrift, alle fire
formater), og med `npm run ai-news:test`, `npm run site:test` og `npm run build`.

Samme dag er alle 64 udgaver gentegnet igen med hovedhistorien som overskrift og uden
sprogtekst; mappen fylder 13,1 MB (længere overskrifter giver lidt større filer).
Kontrolleret ved at åbne to udgaver i fuld størrelse (16:9 og 1:1) og med
`npm run ai-news:test`, `npm run site:test` og `npm run ai-news:validate`.

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
- GitHub kan forsinke eller springe planlagte kørsler over. Derfor to tidspunkter, hver
  med en reserve nogle timer senere. Reserverne hjælper ikke, hvis GitHub slet ikke starter
  planlagte kørsler i repoet; så skal workflowet startes udefra (`docs/redesign/TIL-EJEREN.md`, punkt 16).
- Beskeden om, at udgivelsen er gået i stå, sendes af `watch`-jobbet i samme
  workflow. Starter workflowet slet ikke, kommer der ingen besked derfra. Sidevagten
  (`docs/overvaagning.md`) læser den udgivne side uafhængigt og åbner en sag, når nyeste
  udgave er over 84 timer gammel.
- Efter udgivelsen kontrolleres kun, at siden svarer (404-selvhelingen). At begge
  sprog og begge oversigter viser udgaven, kontrolleres ikke automatisk endnu.

## Historik

Tidligere kørte nyheden som en planlagt Windows-opgave på ejerens maskine, og før
det via systemd og OpenClaw. Koden til alle tre er fjernet fra repoet 2026-11-14,
og Windows-opgaven er slået fra samme dag (kontrolleret: opgavens tilstand er
`Disabled`). Der er kun én udgivelsesvej. Genopret dem ikke ved siden af workflowet.

## Nyhedsoversigten (siden `/ai/nyheder/`)

Set i browser 2026-11-14 ved 1440 og 390 px, mørkt tema på dansk og lyst tema på engelsk.

Siden skrives af `scripts/lib/ai-news-index-page.mjs` (kun `lastUpdated` ændrer sig fra dag til
dag) og viser komponenten `src/components/AiNewsFeed.astro`. Den er en tynd indgang:

| Del | Fil |
|---|---|
| Udvælgelse, hovedhistorie (`lead`), billede, måneder | `src/lib/ai-news-feed.ts` |
| Tekster på dansk og engelsk | `src/lib/ai-news-copy.ts` |
| Antal artikler og kilder, RSS-knap | `src/components/ai-news/FeedStats.astro` |
| Seneste artikel som stort kort med billede | `LatestIssue.astro` og `StoryDigest.astro` |
| Tidligere artikler pr. måned | `ArchiveList.astro` og `IssueRow.astro` |
| De officielle kilder (lukket, til man åbner den) | `SourcePanel.astro` |

En række i arkivet er ét link med det lille billede (`-thumb.webp`), dato, hovedhistorien og
de øvrige historier på én linje. Hovedhistorien er teksten efter kolon i artiklens titel; ældre
artikler, hvis titel kun er en dato, bruger deres første historie.

Fejlsøgning: mangler et billede i arkivet, findes `-thumb.webp` ikke for den dato; kør
`npm run build` (miniaturerne tegnes af `ai-news-thumbs.mjs` ved bygningen).
