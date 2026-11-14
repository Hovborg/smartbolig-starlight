# Værktøjer: små beregnere på siden

Sidst opdateret: 2026-11-14.
Kontrolleret ved: `npm run site:test`, `npm run build`, `npm run seo:validate`,
`npm run worker:build` og `npx wrangler deploy --dry-run` kørt på grenen. Begge værktøjer er set
i headless Chrome i mørkt og lyst tema ved 320, 375 og 1440 px, med et optaget svar fra
Energinet og med en fejl fra Energinet; kontrast og trykflader er målt, og tastaturet er prøvet.
Endpointets kode er kørt én gang mod det rigtige Energinet: ét kald gav begge prisområder.
Ikke kontrolleret: endpointet på Cloudflare. Workerens cache, gættet på prisområde ud fra
`request.cf` og Energinets grænse set fra Cloudflares adresser kan kun ses på den levende side.

## Kort

Sektionen `/vaerktoejer/` har små værktøjer, der regner for læseren. Der er to:

- **Elprisen lige nu** (`/vaerktoejer/elpris/`): spotprisen i dag og i morgen, en graf time for
  time og de billigste timer i træk.
- **Hvad koster det at have tændt?** (`/vaerktoejer/stroemforbrug/`): watt, timer pr. dag og
  elpris giver kroner pr. dag, måned og år.

Hvert værktøj er tre dele: en Astro-komponent (felterne), et rent modul (regnestykket, med
tests) og et UI-modul (kobler felterne til regnestykket). Alle værktøjer sidder i den samme
ramme, `ToolFrame.astro`.

Elprisværktøjet henter priserne hos sidens egen Worker på `/api/elpris`. Workeren henter dem hos
Energinet og gemmer en kopi i ti minutter. Læserens browser spørger aldrig Energinet.

## Hvor tingene ligger

| Sti | Indhold |
|---|---|
| `src/content/docs/da/vaerktoejer/`, `src/content/docs/en/vaerktoejer/` | Siderne: `index.mdx` (oversigt), `elpris.mdx`, `stroemforbrug.mdx`. Samme filnavne på begge sprog |
| `config/sidebar/vaerktoejer.mjs` | Sidemenuen for sektionen |
| `src/lib/primary-nav.ts` | Punktet "Værktøjer" i topbjælken |
| `src/lib/tools/catalog.mjs` | Listen over værktøjer. Oversigtens kort tegnes af den (`ToolCards.astro`, `ToolIcon.astro`) |
| `src/components/tools/ToolFrame.astro` | Rammen, alle værktøjer sidder i: titel, felter, resultat, mere, fodnote |
| `src/styles/content/tools.css`, `src/styles/content/tools/` | Fælles udseende, klasser med `sb-tool-`: `frame`, `result`, `fields`, `segment`, `range`, `buttons`, `chart`, `table` |
| `src/lib/tools/format.mjs` | Tal, kroner, øre og procent på dansk og engelsk, klokkeslæt i dansk tid, læsning af et indtastet tal |
| `src/lib/tools/dom.mjs` | Små DOM-hjælpere: `part`, `setText`, `show`, `el`, `svgEl`, `bindRange` |
| `src/components/tools/PowerPrice.astro`, `PriceChart.astro` | Elprisværktøjets felter og den tomme graf |
| `src/lib/tools/price-copy.mjs` | Elprisværktøjets tekster på dansk og engelsk |
| `src/lib/tools/price-window.mjs` | Regnestykket: øre/kWh, timegennemsnit, billigste timer i træk, lav/middel/høj |
| `src/lib/tools/price-view.mjs`, `price-chart.mjs` | Hvad der skal stå på siden, og grafens mål. Uden DOM |
| `src/lib/tools/price-ui.mjs`, `price-chart-ui.mjs`, `price-chart-dom.mjs`, `price-table-dom.mjs` | Henter priserne, kobler felterne og tegner graf og tabel |
| `functions/api/elpris.js` | Indgangen til `/api/elpris` |
| `functions/lib/elpris/` | `area.js` (prisområde), `upstream.js` (kaldet til Energinet og kontrol af rækkerne), `cache.js` (kopien i Workerens cache), `responses.js` (svar og fejl), `handler.js` (forløbet) |
| `src/components/tools/PowerCost.astro` | Strømforbrugsværktøjets felter |
| `src/lib/tools/power-cost.mjs`, `power-copy.mjs`, `power-ui.mjs` | Regnestykket, teksterne med eksempler og startværdier, og koblingen |
| `scripts/site-tools.test.mjs`, `site-tools-price.test.mjs`, `site-tools-api.test.mjs` | Tests. Køres med `npm run site:test` |

## Regler, der er valgt med vilje

- **Browseren kalder aldrig Energinet.** Energinet gemmer IP-adressen fra hvert kald i tre
  måneder (deres vilkår, læst 2026-11-14). Når Workeren henter priserne, ser Energinet kun
  Cloudflare. En test fejler, hvis Energinets adresse står i `src/lib/tools/` eller
  `src/components/tools/`.
- **Værktøjerne gemmer intet i browseren.** Ingen `localStorage`, ingen cookies. Valg af
  prisområde, moms og tillæg gælder, til siden lukkes. Samme test holder øje med det.
- **Ét kald henter begge prisområder.** Energinet tillader en kalder uden nøgle ét kald i
  minuttet (målt 2026-11-14: det andet kald fik 429). Kopien af hvert område gemmes hver for sig.
- **En kopi er frisk i ti minutter.** Fejler Energinet, vises den gamle kopi, så længe den
  indeholder prisen for det kvarter, vi er i, og Workeren venter 60 sekunder med at prøve igen.
- **Fejlsvar er faste ord.** `{"error":"upstream"}` med 502. Energinets egen fejltekst sendes
  aldrig videre til læseren. I loggen står kun fejlens navn.
- **Prisområdet gættes, men huskes ikke.** Uden `?area=` gætter Workeren ud fra den region,
  Cloudflare placerer forbindelsen i (`request.cf`). Et gættet svar er `private`, så kun
  læserens egen browser må gemme det.
- **Siderne nævner ingen satser for afgift og nettarif.** De skifter og er forskellige fra
  netselskab til netselskab. Læseren skriver selv sit tillæg. Momsen (25 %) er den eneste sats.
- **Grafen bygges med DOM-kald** (`svgEl` i `dom.mjs`), aldrig med HTML-strenge. Der er ingen
  inline event handlers og intet inline script; værktøjets kode ligger i egne filer under
  `/_astro/`.

## Sådan svarer `/api/elpris`

`GET /api/elpris?area=DK1` eller `?area=DK2`. Uden `area` gættes området.

```json
{
  "area": "DK1",
  "areaGuessed": false,
  "source": "Energinet (www.energidataservice.dk)",
  "license": "CC BY 4.0",
  "fetched": "2026-11-14T09:00:00.000Z",
  "stepMinutes": 15,
  "points": [[1794610800, 1513.32], [1794611700, 1498.1]]
}
```

Hvert punkt er `[kvarterets start i sekunder siden 1970 (UTC), kroner pr. MWh uden moms]`. Et
døgn er 96 punkter og fylder cirka 2,2 kB (målt 2026-11-14); efter kl. 13 er morgendagen med.
Omregningen til øre/kWh sker i browseren (`toOre` i `price-window.mjs`).

| Svar | Betyder |
|---|---|
| 200, `cache-control: public, max-age=600` | Priser for et navngivet område |
| 200, `cache-control: private, max-age=600` | Priser for et gættet område |
| 200, `max-age=60` | En gammel kopi, fordi Energinet ikke svarede |
| 400 `invalid_area` | `area` er ikke præcis `DK1` eller `DK2` |
| 405 `method_not_allowed` | Andet end GET og HEAD |
| 502 `upstream` | Energinet svarede ikke, og der er ingen kopi, der dækker nu |

## Sådan gør du

### Tilføj et nyt værktøj

1. Skriv regnestykket i `src/lib/tools/<navn>.mjs` som rene funktioner uden DOM. Skriv en test
   i `scripts/site-tools.test.mjs` (eller en ny `scripts/site-tools-<navn>.test.mjs`).
2. Skriv teksterne i `src/lib/tools/<navn>-copy.mjs` med `da` og `en` og de samme nøgler. Sæt
   objektet ind i listen i testen "the texts have the same keys ..." i `site-tools.test.mjs`.
3. Lav komponenten `src/components/tools/<Navn>.astro` med rammen:

   ```astro
   <ToolFrame id={id} title={t.title} lang={lang} data-tool="<navn>">
     <Fragment slot="form">felterne</Fragment>
     <Fragment slot="result">svaret</Fragment>
     <Fragment slot="note">sådan er tallet regnet</Fragment>
   </ToolFrame>

   <script>
     import { startTool } from "../../lib/tools/<navn>-ui.mjs";
     for (const root of document.querySelectorAll('[data-tool="<navn>"]')) startTool(root);
   </script>
   ```

   Brug klasserne i `src/styles/content/tools/` til felter, knapper og tal. Giv hvert felt en
   `<label>`, og mærk de dele, scriptet skal finde, med `data-part="..."`.
4. Skriv `src/lib/tools/<navn>-ui.mjs`. Find delene med `part(root, "navn")`, læs tal med
   `parseDecimal`, og skriv svaret med `setText`. Gem intet i browseren.
5. Opret siderne `src/content/docs/da/vaerktoejer/<navn>.mdx` og
   `src/content/docs/en/vaerktoejer/<navn>.mdx` med `title`, `description` og `lastUpdated`.
   Start med to sætninger, sæt komponenten ind, og forklar nedenunder, hvordan tallet er regnet,
   hvad der ikke er med, og hvor data kommer fra.
6. Tilføj siden i `config/sidebar/vaerktoejer.mjs` (med `translations: { en: "..." }`) og
   værktøjet i `src/lib/tools/catalog.mjs`. Et nyt ikon er en gren mere i `ToolIcon.astro`.
   En værktøjsside har intet billede øverst, så værktøjet står først (reglen `vaerktoejer/` i
   `src/lib/guide-art.mjs`); oversigten har husets billede.
7. Kør `npm run site:test` og `npm run build`. Se siden i mørkt og lyst tema ved 375 og
   1440 px, og gå den igennem med tastaturet.

Henter værktøjet data udefra, så lad Workeren hente dem, som `functions/lib/elpris/` gør, og
skriv kilden og licensen i `docs/oss.md`.

### Ret en tekst eller en standardværdi

- **Tekst i et værktøj:** `price-copy.mjs` eller `power-copy.mjs`. Ret både `da` og `en`.
- **Tekst under et værktøj:** MDX-siden i `src/content/docs/da/vaerktoejer/` og i `en/`.
- **Kortene på oversigten:** `src/lib/tools/catalog.mjs`.
- **Startværdier for strømforbrug** (100 W, 5 timer, 2,50 kr./kWh) og eksemplerne:
  `POWER_DEFAULTS` og `POWER_PRESETS` i `power-copy.mjs`.
- **Timer i træk** (1 til 8, starter på 3): skyderen i `PowerPrice.astro`.
- **Moms:** `VAT` i `price-window.mjs`.
- **Hvor længe en kopi er frisk:** `FRESH_SECONDS` i `functions/lib/elpris/responses.js`.
  Ventetiden efter en fejl er `BACKOFF_SECONDS` i `cache.js`, og tidsgrænsen for kaldet er
  `UPSTREAM_TIMEOUT_MS` i `upstream.js`.

Kør `npm run site:test` bagefter. Testene holder fast i flere af værdierne og skal rettes med.

## Når noget ser forkert ud

- **"Vi kunne ikke hente priserne lige nu."** `/api/elpris` svarer 502. Energinet svarede ikke,
  eller afviste kaldet, og der er ingen kopi, der dækker nu. Workeren prøver igen efter 60
  sekunder; knappen "Prøv igen" spørger med det samme. I Workerens log står
  `SmartBolig elpris upstream failed` med fejlens navn: `UpstreamStatus429` (for mange kald),
  `TimeoutError` (intet svar inden for 8 sekunder) eller `UpstreamAreaMissing` (for få rækker
  for området). Bliver 429 ved, deler siden Cloudflares udgående adresse med andre, der kalder
  Energinet. Så bør priserne hentes på et fast tidspunkt i stedet (se "Ikke bygget").
- **Der er ingen priser for i morgen.** De offentliggøres omkring kl. 13 dansk tid. Før det
  viser værktøjet kun i dag og skriver, at morgendagens priser ikke er ude endnu. Efter kl. 13
  kan der gå op til ti minutter, før kopien er fornyet.
- **Værktøjet gætter på det forkerte prisområde.** Gættet bygger på Cloudflares region for
  forbindelsen: Hovedstaden og Sjælland giver DK2, alt andet DK1. Mobilnet og VPN bliver ofte
  placeret i København. Læseren skifter selv område øverst i værktøjet. Lokalt (uden
  Cloudflare) er gættet altid DK1.
- **Prisen passer ikke med elregningen.** Værktøjet viser spotprisen med moms. Afgift,
  nettarif, abonnement og elselskabets tillæg er ikke med, medmindre læseren skriver et tillæg.
  Tallet "Lige nu" er kvarterets pris; grafen viser gennemsnittet pr. time.
- **`npm run build` stopper på et prøvespørgsmål.** En værktøjsside har skubbet en guide ud af
  de tre bedste svar i assistentens søgning (`docs/assistent.md`). Ret teksten på
  værktøjssiden; lad prøvespørgsmålet være.
- **Feltet viser en fejl ved et tal.** Felterne tager tal med komma eller punktum. Tusindtals-
  tegn og bogstaver afvises.

## Forsiden

Forsiden har en sektion "Værktøjer" (`src/components/home/HomeTools.astro`, stil i
`src/styles/home/tools.css`, tekster under `tools` i `src/lib/home-copy/da.ts` og `en.ts`):

- Til venstre et kort med elprisen lige nu, dagens timer som søjler og de billigste tre timer
  i træk. Tallene skrives af `src/lib/home-price.mjs`, som bruger de samme regnestykker som
  elprisværktøjet (`price-view.mjs`) og henter priserne samme vej (`price-data.mjs`, sidens
  eget `/api/elpris`). Søjlernes mål regnes i `src/lib/tools/price-spark.mjs`.
- Koden hentes først, når kortet er tæt på skærmen, så forsiden ikke bliver tungere at åbne.
- Uden JavaScript, eller hvis priserne ikke kan hentes, viser kortet en tekst og et link til
  værktøjet. Der står aldrig et tal i den byggede side.
- Til højre en række pr. værktøj fra `catalog.mjs`. Et nyt værktøj kommer med af sig selv.

Kortet gemmer intet og sender kun det, elprisværktøjet sender. Testene står i
`scripts/site-home-tools.test.mjs`.

## Overvågning og privatliv

- Sidevagten (`docs/overvaagning.md`) spørger `/api/elpris?area=DK1` to gange i døgnet og
  åbner en sag, hvis svaret ikke er 200 med mindst 24 priser.
- Privatlivspolitikken (afsnit 2.4, begge sprog) siger, hvad værktøjerne sender: kun
  prisområdet. Et nyt værktøj, der sender eller gemmer mere, skal skrives ind dér.
- Kommentarer og annoncepladsen vises under et værktøj, men ikke på oversigten
  (`src/lib/article-page.mjs`).
- `llms.txt` har værktøjerne som eget afsnit (`SECTIONS` i `scripts/lib/llms-txt.mjs`).

## Ikke bygget

Workerens cache gælder pr. datacenter hos Cloudflare, så hvert datacenter henter sin egen
kopi. Hvis Energinets grænse bliver et problem, kan priserne i stedet hentes af en Cron Trigger
og gemmes i KV. Det kræver en binding i `wrangler.jsonc` og er ikke lavet.

## Fjern det igen

Ét værktøj: slet dets to MDX-sider, komponenten og modulerne, og fjern det fra
`config/sidebar/vaerktoejer.mjs` og `src/lib/tools/catalog.mjs`.

Hele sektionen:

1. Slet `src/content/docs/da/vaerktoejer/`, `src/content/docs/en/vaerktoejer/`,
   `src/components/tools/`, `src/lib/tools/`, `src/styles/content/tools.css` og
   `src/styles/content/tools/`. Fjern linjen `@import "./content/tools.css";` i
   `src/styles/index.css`.
2. Slet `functions/api/elpris.js` og `functions/lib/elpris/`.
3. Fjern `vaerktoejer` i `config/sidebar/index.mjs` (og slet `config/sidebar/vaerktoejer.mjs`),
   i `src/lib/primary-nav.ts`, i `src/lib/guide-art.mjs`, i `src/lib/seo/page-kind.ts`, i
   `src/lib/seo/breadcrumbs.ts`, i `src/lib/article-page.mjs` og i `SECTIONS` i
   `scripts/lib/llms-txt.mjs`. Fjern kontrollen `/api/elpris` i `scripts/monitor/checks.mjs`
   (og dens linjer i testen), og afsnit 2.4 i privatlivspolitikken på begge sprog.
4. Slet de tre testfiler `scripts/site-tools*.test.mjs`.
5. Har siderne været udgivet, så send adresserne videre i `public/_redirects` (`docs/seo.md`).
6. Fjern rækken om Energinet i `docs/oss.md` og afsnittene om værktøjer i `CONTENT-GUIDE.md`,
   `README.md`, `AGENTS.md` og `docs/designsystem.md`.
7. Kør `npm run site:test` og `npm run build`.
