# 🏠 smartbolig.net

Et tosproget smart home-guideunivers med fokus på Home Assistant, ESPHome og
lokale automationer. Indholdet findes på dansk og engelsk og er skrevet til et
internationalt publikum, når emnet ikke er landespecifikt.

**Live site:** https://smartbolig.net

---

## 📖 Om projektet

smartbolig.net hjælper både danske og internationale læsere med at bygge et
overskueligt og driftssikkert smart home. Fokus er på:

- **Home Assistant** - Installation, konfiguration og automationer
- **ESP32/ESPHome** - DIY sensorer og enheder
- **Produktguides** - Anbefalinger til smart home udstyr
- **Lokal kontrol** - Løsninger der kan holde centrale funktioner i hjemmet
- **International anvendelighed** - Generelle guides kræver ikke danske tjenester

Sitet er tilgængeligt på både dansk og engelsk.

Praktiske guides til fjernadgang, bevægelseslys med manuel overstyring og
sensorovervågning findes som MDX-par under `sikkerhed/` og `automationer/`.
Begge sprog bruger samme danske filsti og oversatte sidebar-labels. Guiderne
henviser til officielle kilder og beskriver konkrete testtrin i læserens eget hjem.

---

## 🛠️ Teknisk Stack

- **Framework:** [Astro Starlight](https://starlight.astro.build/)
- **Hosting:** [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) med det eksisterende Pages-projekt bevaret som rollback
- **Sprog:** Dansk (primær) + Engelsk
- **Styling:** Custom responsivt portaldesign med lys og mørk tilstand

---

## ✨ SmartBolig AI-assistent

Alle sider viser en valgfri AI-assistent nederst til højre. Den er bygget som en
samme-origin Cloudflare Worker, kompileret fra en Pages Functions-router, og en
specialdesignet Astro-widget:

- **Bred AI-hjerne:** Workers AI-modellen
  `@cf/google/gemma-4-26b-a4b-it` svarer om
  Home Assistant, ESPHome, sensorer, Zigbee, Z-Wave, Matter, Thread, MQTT,
  netværk, Docker, Proxmox og øvrige homelab-emner. Endpointet bruger
  Cloudflares native `env.AI.run()`-binding. Hvis den primære model fejler eller
  løber ud af sit tidsbudget, overtager den Cloudflare-hostede
  `@cf/qwen/qwen3-30b-a3b-fp8` med et kortere, separat budget. Qwen-fallbacken
  er valgt til flersproget instruktionsefterlevelse og tekniske svar frem for
  blot lavest mulig latenstid.
- **SmartBolig som ekstra kilde:** Workeren slår op i et indeks over sidens
  egne sider. Indekset bygges sammen med siden og ligger som statiske filer
  under `/_index/`; der bruges ingen betalt søgetjeneste (se
  [`docs/assistent.md`](docs/assistent.md), kontrolleret 2026-11-14). Faglige
  smart-home/homelab-spørgsmål får højst ét afgrænset opslag. Resultatet gives
  til den brede model som ubetroet reference-data. Efter opslaget får både
  primær- og fallbackmodel en særskilt slutprompt uden et tilgængeligt
  søgeværktøj, så interne værktøjsnavne og retrieval-trin ikke bliver vist som
  kommandoer. Sidens guides er ikke assistentens eneste viden.
- **Kontrolleret officiel evidens:** Syv gennemgåede evidenspakker vælges
  deterministisk i Workeren: automationstrace, automationsmåder,
  template-tilstande og Home Assistant-sikkerhed samt ESPHome-sikkerhed,
  safe mode og sensorfiltre. Pakkerne indeholder korte tosprogede faktaparafraser,
  reviewdato og faste links til de allowlistede officielle værter
  `www.home-assistant.io` og `esphome.io`. Flere match kan kombineres og
  deduplikeres i samme modelkald.
- **Svar-kontrakt:** Workeren afviser tomme svar, interne reference-tags og
  synlige `search_smartbolig`-kald. Når brugeren udtrykkeligt beder om en
  Home Assistant-automationskode, klassificeres den ønskede form som enten
  editor-YAML, en mærket `configuration.yaml`-blok, en `automations.yaml`-
  listepost eller et automation-blueprint. Hver form valideres server-side mod
  sit eget rodformat, de aktuelle pluralnøgler `triggers`/`actions` og en
  eventuel ønsket top-level `mode`; wrapper-, liste-, singular- og `max_runs`-
  varianter afvises, når de ikke hører til formen. Almindelig YAML til andre
  systemer, eksempelvis GitHub Actions, tvinges ikke gennem Home Assistant-
  valideringen. Et rent konceptspørgsmål om eksempelvis queued mode udløser
  heller ikke et kunstigt syntakskrav. Ellers prøves den afgrænsede fallback,
  og også den fejler lukket frem for at vise et vildledende næsten-svar. Det
  reducerer kendte fejl, men er ikke en generel garanti for, at al
  modelgenereret konfiguration er korrekt.
- **Ingen dokumentationskopi:** SmartBolig kopierer ikke Home Assistant- eller ESPHome-dokumentation ind i sit søgeindeks.
  Den brede model svarer fortsat om hele fagområdet, mens kun serverens konkrete,
  gennemgåede fakta får officiel status.
- **Ærlige kildegrader:** Svar vises som **Officielle kilder
  kontrolleret**, **SmartBolig-kilder + bred AI-viden** eller **Generel
  AI-viden**. Et svar får aldrig officielt badge alene på grund af modellens
  generelle træningsviden. API-feltet `officialVerifiedAt` viser den ældste
  reviewdato blandt de anvendte evidenspakker og er ellers `null`.
- **Ingen database:** Søgeindekset er statiske filer, der bygges sammen med
  siden. Projektet har ingen D1- eller Vectorize-database og ingen betalt
  søgetjeneste.
- **Abuse-kontrol:** `CHAT_RATE_LIMITER` tillader 12 chatkald pr. minut pr.
  forbindende IP i hver Cloudflare-lokation. Et normalt svar bruger ét
  logisk modelkald med højst ét sekundært forsøg. Et fagligt svar kan desuden
  bruge ét opslag i sidens indeks; en valgfri modelstyret søgesti er fortsat
  begrænset til højst to logiske modelkald. Tager opslaget over fem sekunder,
  svarer assistenten ud fra bred modelviden. Et svar som strøm tæller som ét
  chatkald og gennemgår de samme kontroller af oprindelse, størrelse og
  indhold; afvisninger kommer som almindelige JSON-fejl.
- **Dataminimering:** Endpointet accepterer højst 10 skiftevis bruger/assistent-
  beskeder, 2.000 tegn pr. besked og 8.000 tegn i alt. Widgeten gemmer kun den
  aktuelle samtale i browserens `sessionStorage`. Hvert gemt og genudsendt
  historikelement normaliseres til 2.000 tegn; et netop modtaget svar kan stadig
  vises i sin fulde returnerede længde uden at bryde det næste chatkald.
- **Sikker rendering:** Modelsvar bliver til tekstnoder; der indsættes ikke
  modelgenereret HTML. Fenced Markdown-kode bliver vist som indrykningsbevarende
  kodekonsoller med sproglabel og egen kopiknap, men opbygges stadig kun med
  sikre DOM-elementer og `textContent`. Kildelinks tillades kun til
  `https://smartbolig.net` samt de serverstyrede officielle værter
  `www.home-assistant.io` og `esphome.io`.
- **Smart-home intelligence console:** Widgeten bruger et responsivt
  cyan/grønt tech-interface med tydelig `EDGE AI`-status, capability-felter,
  handlingskort og console-composer. Fire tosprogede arbejdsprofiler —
  **Fejlsøg/Debug**, **Byg/Build**, **Forklar/Explain** og
  **Sammenlign/Compare** — indsætter synlig, redigerbar tekst i promptfeltet;
  de ændrer ikke skjult systemprompt eller permissions. Under et kald viser
  konsollen den reelle forløbne ventetid i browseren som en aktiv
  `WORKER · CONTEXT · MODEL`-pipeline. Det er en timer, ikke et påfundet indblik
  i interne modeltrin. Widgeten understøtter både lys/mørk tilstand og reduceret
  bevægelse uden eksterne UI-biblioteker.
- **Afgrænset svartelemetri:** Hvert AI-svar viser en kompakt rail med en fast
  allowlistet modelbetegnelse, `PRIMARY`/`FALLBACK`-rute, servermålt edge-tid,
  et højst 64 tegn langt request-spor og antallet af allerede validerede kilder.
  Sporet korrelerer kun kaldet og indeholder hverken prompt, svar, providerfejl
  eller credentials. Telemetrien gør driften gennemsigtig; den er ikke en
  score for, om svaret er fagligt korrekt.
- **Lavere variation i tekniske fakta:** Modellen kører med temperatur `0.1`.
  Den indstilling gør svar mindre tilfældige, men erstatter ikke kilder,
  regressionstests eller brugerens kontrol i den konkrete installation.
- **Håndhævet Home Assistant-editorformat:** Når brugeren beder om én fenced
  YAML-automation, accepterer API'et kun et dokument, der starter med
  root-level `alias`, bruger de aktuelle `triggers`- og `actions`-lister og
  holder `mode` ved roden. Wrapper-, liste-, entals- og `max_runs`-varianter
  går til fallback eller fejler lukket. Eksplicitte forespørgsler efter
  `configuration.yaml` og `automations.yaml` bevarer deres korrekte filformat.
- **Afgrænset svartid og længde:** Gemma får højst 2.400 completion-tokens og
  Qwen-fallbacken højst 1.600, så modellernes skjulte ræsonnering ikke afskærer
  et teknisk svar midt i en sætning. Gemma har 55 sekunder pr. kald og Qwen har
  25 sekunder. Browserens 180-sekunders maksimum dækker den sjældne værste sti
  med fem sekunders opslag i sidens indeks, to Gemma-kald, op til to Qwen-fallbackkald og ti
  sekunders netværksmargin. Et providerresultat med token-limit, en uafsluttet
  kodeblok eller et tydeligt hængende bindeord vises aldrig: primærsvaret går
  til fallback, og en afskåret fallback fejler lukket. Normale svar returneres
  med det samme. I en strøm gælder de samme grænser pr. modelkald, og teksten
  stoppes ved 12.000 tegn. En aktiv eller fejlet fallback logges med
  request-ID, trin, årsagsklasse og fejlnavn, men aldrig med prompt, modelsvar
  eller providerens fritekstfejl.

Bindings og modelvalg ligger i `wrangler.jsonc`; der skal ikke ligge Cloudflare-
tokens eller modelnøgler i kildekoden.

API- og widgettests bruger fakes og foretager ingen betalte AI-kald:

```bash
npm run site:test
```

Den officielle evidensselector har en deterministisk suite med **98
testspørgsmål** på dansk og engelsk. Den dækker alle syv pakker, kombinerede
spørgsmål og false positives som GitHub Actions, Docker-sikkerhed, Arduino-
sensorer, generiske Home Assistant-spørgsmål, klasse-/filtervalg, GitHub-
handlinger og operativsystemers safe mode.

Kompilér Pages Functions-routeren og validér Worker-konfigurationen lokalt:

```bash
types_dir="$(mktemp -d)"
npx wrangler types "$types_dir/worker-configuration.d.ts" --include-runtime false
npm run worker:build
npx wrangler deploy --dry-run
```

En rigtig lokal chat kræver remote Cloudflare-bindings og bruger Workers
AI-kvoten:

```bash
npm run build
npm run worker:build
npx wrangler dev
```

Spørgsmål, bounded samtalehistorik og databehandlingen er beskrevet i de
lokaliserede privatlivspolitikker.

---

## 📁 Struktur

```
src/content/docs/
├── da/                 # Danske sider
│   ├── home-assistant/ # Home Assistant guides
│   ├── esp32/          # ESP32/ESPHome guides
│   ├── produkter/      # Produktanbefalinger
│   └── ...
└── en/                 # Engelske sider (samme struktur)
```

Sitets konfiguration ligger i `config/`, og `astro.config.mjs` er kun en tynd indgang, der samler delene:

- `config/site.mjs`: site-URL, titel, sprog og øvrige skalare Starlight-indstillinger.
- `config/fonts.mjs`: de to selvhostede skrifter.
- `config/sidebar/`: sidebaren, én fil pr. hovedsektion (Home Assistant er delt i undermapper).
- `config/head/`: `<head>`-tags, én fil pr. område (ikoner og temafarve, social meta, samtykke, analytics, RSS, annoncer).
- `config/components.mjs`: Starlight-komponentoverrides.
- `config/markdown/`: små Markdown-plugins (overskrifter, kort og faner uden emoji; tabeller i en rulleramme; guidernes billeder i tekstspaltens bredde, og åbningsbilledet først).
- `config/images.mjs`: guidernes billeder laves i flere bredder. Se [`docs/billeder.md`](docs/billeder.md) (kontrolleret 2026-11-14).

Guidesidernes top, sidemenu og sidefod er beskrevet i `docs/designsystem.md` under "Guidesider".

### Hvor tingene ligger: AI-assistentens endpoint

`functions/api/chat.js` er kun den tynde indgang (`onRequest` og genudstillede navne). Logikken ligger i `functions/lib/chat/`, ét ansvar pr. fil:

| Fil | Ansvar |
|-----|--------|
| `limits.js` | modelnavne, størrelsesgrænser, timeouts og kontakten `STREAMING_ENABLED` |
| `responses.js` | JSON-svar, fejlkoder og tekster, `ChatRequestError` |
| `request.js` | begrænset læsning af kroppen og validering af samtalen |
| `sources.js` | kanoniske SmartBolig-URL'er, titler og søgeresultater |
| `prompt.js` | systemprompten og referencedata til den seneste besked |
| `search-tool.js` | hvornår søgeværktøjet kræves, og aflæsning af modellens værktøjskald |
| `yaml-request.js` | hvilken YAML-form og automation-`mode` brugeren har bedt om |
| `yaml-checks.js` | kontrol af YAML i svaret mod den ønskede form |
| `answer.js` | udtræk af modelsvar og accept af svar |
| `runtime.js` | timeout med afbrydelse og sikre fejlnavne til log |
| `agent.js` | Workers AI-agenten: hvornår der søges, og hvilken prompt hvert modeltrin får |
| `model-runs.js` | ét modeltrin: primær model, derefter reservemodel; sender teksten videre, mens den skrives |
| `model-stream.js` | læser Workers AI's strøm til samme form som et almindeligt modelsvar |
| `sse-decoder.js` | afkoder Server-Sent Events fra bytes; bruges af både Workeren og browseren |
| `turn.js` | ét spørgsmål: kilder, søgning med tidsgrænse, agentkørsel og det færdige svar |
| `diagnostics.js` | de driftsoplysninger, en besøgende må se |
| `sse.js` | et svar som Server-Sent Events og genkendelse af `Accept: text/event-stream` |
| `stream-response.js` | leverer et svar som events: `status`, `sources`, `delta`, `done`, `error` |
| `handler.js` | selve anmodningsforløbet: metode, oprindelse, rate limit og validering, derefter svar som JSON eller strøm |

Søgningen i sidens egne guides ligger i `functions/lib/site-search/` (søgning i Workeren) og `scripts/lib/site-index/` (bygning af indekset). Opbygning, fejlsøgning og fjernelse: [`docs/assistent.md`](docs/assistent.md).

Det officielle bevismateriale ligger fortsat i `functions/lib/official-evidence.js`.

---

## 🚀 Deployment

Sitet deployes automatisk som **Cloudflare Worker med Static Assets** ved push
til `main`. Worker-ruterne ligger foran det eksisterende Pages-domæne, så
Pages-projektet fortsat kan bruges som hurtig rollback, hvis Worker-ruterne
fjernes.

Deployment-workflowet genbruger den eksisterende `dist/`-build, kompilerer
`functions/` til `.worker/index.js` og stopper før publicering, hvis en
kvalitets-, nyheds-, indholds-, sikkerheds-, build- eller SEO-kontrol fejler.
Kør den samme centrale kontrol lokalt før push:

```bash
npm ci
npm run site:test
npm run ai-news:test
npm run ai-news:validate
npm run ai-news:pending-images -- --fail-on-pending
python3 -m unittest discover -s scripts -p "test_*.py"
python3 scripts/content-audit.py
npm run security:audit
npm run build
npm run seo:validate
npm run worker:build
npx wrangler deploy --dry-run
```

`npm run seo:validate` kontrollerer de byggede sider: sitemap, `robots.txt`,
strukturerede data og sociale felter. Reglerne, og hvordan du tilføjer en
omdirigering, står i [`docs/seo.md`](docs/seo.md) (kontrolleret 2026-11-14).

Afhængighedskontrollen (`scripts/security-audit.mjs`) kører den fulde `npm audit`
inklusiv udviklingsværktøjer. Den har to tilstande (kontrolleret 2026-11-13):

- **Port** (`npm run security:audit`): fejler ved ethvert højt eller kritisk fund.
  Bruges altid, når `package.json` eller `package-lock.json` er ændret, og når
  ændringsintervallet er ukendt.
- **Rapport** (`--report`, eller `--auto` uden ændrede afhængigheder): viser
  fundene uden at stoppe. En ny advarsel om en uændret pakke må ikke blokere
  udgivelse af tekst; den stoppede de daglige nyheder i 25 dage i oktober 2026.
  Fundet vises som advarsel på kørslen i GitHub Actions.

I CI sammenlignes der med det seneste commit, som blev udgivet uden fejl
(trinnet "Resolve audit base" i `deploy.yml`), ikke med forrige push. En
afhængighedsændring, der aldrig har bestået porten, bliver derfor ved med at
være spærret, indtil en kørsel med den består.

Pakkerne opdateres af sig selv: Dependabot åbner hver mandag en pull request med
små opdateringer (patch, og minor af pakker fra version 1), og den flettes, når
kontrollen `deploy` er grøn. En ny version tages først, når den er 14 dage gammel;
sikkerhedsrettelser venter ikke (Dependabots advarsler og sikkerhedsrettelser er
slået til i repoet). Store opdateringer, minor af pakker under version 1 og
GitHub Actions flettes i hånden. Se
[`docs/opdateringer.md`](docs/opdateringer.md) (kontrolleret 2026-11-14).

Der er ingen undtagelsesliste. Et højt fund løses ved at opdatere pakken.
På Windows bruges den installerede Python og Git for Windows Bash;
indholdskontrollen behøver ikke WSL.

Nyhedskilder hentes gennem én fælles kontrol med HTTPS, værtsallowlist,
kontrol af hver redirect, binding til godkendte offentlige DNS-adresser,
timeout og bytegrænser (2 MB for feeds/kildestatus, 1,5 MB for artikler).
Reference-URL'er kontrolleres med status alene, og deres svarindhold annulleres.
Tests bruger lokale mocks og kalder hverken private netværksadresser eller AI.
Projektets MCP-fil starter ingen eksterne pakker; udviklerværktøjer styres af
værtens egen MCP-konfiguration.

---

## 🤖 Daglig AI-news automation

Den daglige AI-nyhed skrives, faktatjekkes og udgives af GitHub Actions
(`.github/workflows/ai-news.yml`) uden en menneskelig gennemgang. Hele flowet,
fejlfinding, omkostningsloft, modelvalg og nøgleskift står i
[`docs/nyhedsflow.md`](docs/nyhedsflow.md). Kort:

- **Kilder:** kun officielle kilder fra `scripts/ai-news-sources.mjs`, hentet
  gennem den fælles sikre hentning.
- **Tekst:** hver historie skrives for sig (engelsk og dansk) og kontrolleres mod
  sin kilde af en anden model. En historie, der ikke kan rettes, kasseres; de
  andre udgives. Under tre beståede historier udgives intet den dag.
- **Kontroller:** de samme kontroller som ved udgivelse køres, før noget
  committes til `main`. Derefter udgiver `deploy.yml`.
- **Én oversigt:** hver kørsels Summary i GitHub Actions viser, hvad der skete
  og hvorfor.
- **Besked:** kun én GitHub-sag (`ai-news-stalled`), når der ikke er udgivet i
  tre dage.
- **Omkostning:** relayet `workers/news-llm/` stopper ved 8.000 neurons pr. døgn,
  under Cloudflares gratis kvote.

Kør manuelt under Actions → AI News → Run workflow (`dry_run` udgiver intet).

---

## 🧭 Portalstruktur

Forsiden er bygget af små komponenter under `src/components/home/`, samlet af
`HomePortal.astro`. Teksterne står i `src/lib/home-copy/da.ts` og `en.ts`
(typer i `types.ts`), og stilreglerne i `src/styles/home/`:

1. Hero med søgefelt og et 3D-hus. Et stillbillede (AVIF/WebP) vises straks; den levende model hentes bagefter. Læseren vælger morgen, dag, aften eller nat, drejer huset og følger rundturen "Et døgn i et smart hjem" med fire kapitler (varme, energi, lys, sikkerhed), hvor kameraet flyver hen til det, teksten handler om
2. Emnevælger: begynderspor til `/start/` og fem emnekort med billeder tegnet af 3D-huset. Det første kort er stort, de fire andre står to og to
3. Feltguide med en vandret etaperute på computer og lodret forløb på mobil
4. Udvalgte guides med et morgenbillede af huset
5. De tre seneste AI-nyheder med billeder, datoer, arkiv og RSS
6. Trust-sektion med efterprøvelige links (kilder, privatliv, affiliate, rettelser)
7. Afsluttende opfordring

Sådan hænger det sammen:

- **Udseende:** forsiden bruger de samme designværdier som resten af siden
  (`docs/designsystem.md`) og følger lyst og mørkt tema. Der står ingen farvekoder i
  `src/styles/home/`; en test i `scripts/site-quality.test.mjs` afviser dem.
- **Huset:** en three.js-model i `src/lib/house3d/` (se `docs/3d-hus.md`).
  `src/lib/home-house.mjs` ejer tilstanden (tidspunkt og kapitel), og
  `src/lib/home-house-stage.mjs` henter modellen, når der er brug for den. Huset tegnes
  i en worker, så siden ikke hakker, mens modellen starter. Uden JavaScript eller WebGL
  (eller med WebGL i software) vises stillbilledet, og knapperne er skjult.
- **Bevægelse:** `src/lib/home-motion.mjs` sætter `data-home-motion` på `<html>`.
  Siden følger enhedens indstilling; knappen øverst på husets skærm starter eller standser
  bevægelse, og valget gemmes lokalt under `smartbolig-motion-v1`. Scener uden for
  skærmen og skjulte faner står stille. Reglerne ligger i `motion.css`, og
  controlleren kontrolleres i `scripts/site-motion.test.mjs`.
- **Uden JavaScript** er alt indhold synligt. Diagrammerne er illustrationer, ikke live-data.
- De få tilpasninger af Starlights ramme kræver `body:has(.home-portal)`, så guides
  beholder deres layout.

Stillbillederne (heroens aftenbillede, emnekortene og morgenbilledet ved de udvalgte
guides) tegnes af den samme model i headless Chrome. Listen står i `PICTURES` i
`scripts/house-posters.mjs`. Generér dem igen, når huset ændrer udseende:

```bash
npm run house:posters
```

Forsidens nyhedsliste bruger små WebP-thumbnails (`-thumb.webp`) ved siden af
AI-nyhedernes hero-JPG'er. De genereres automatisk som første trin i
`npm run build`; kør dem manuelt med:

```bash
npm run images:news-thumbs                        # kun manglende thumbnails
npm run images:news-thumbs -- --date 2026-11-13   # (gen)render én dag
npm run images:news-thumbs -- --force             # gen-render alle
```

Filtider bruges ikke (de siger intet efter et git checkout): kun manglende
thumbnails renderes uden flag.

Aktuelle guideforløb omfatter blandt andet:

- Matter og Thread i Home Assistant 2026
- lokal Home Assistant Assist med Speech-to-Phrase/Whisper og Piper
- ESPHome Bluetooth Proxy på Wi-Fi, Ethernet eller PoE
- Home Assistant Energy Dashboard med international opsætning til elnet,
  solceller, batteri, gas, vand, apparater og elbil

---

## Vedligeholdelse af reklamelinks

`src/lib/affiliate.ts` er den fælles partnerliste og deeplink-generator for
`AffiliateLink.astro` og `ProductCard.astro`. Brug kun godkendte aftaler og den
produktlink-bannerkode, der er vist på Partner-Ads-kontoen. De aktive aftaler er
Proshop, Specialkamera, RobotterOnline, WATTOO og Batteribyen. Links valideres mod
den valgte butiks domæne, så en forkert kombination stopper bygget.

Brug komponenten til kommercielle købslinks, skriv en tydelig reklameoplysning før
første købslink, og ajourfør partnerlisten i begge sprog. En kategorihenvisning
skal hedde eksempelvis "Se udvalget"; et produktlink skal matche den præcise model.
Tilføj ikke afventende aftaler eller ubekræftede priser, lager- eller
kompatibilitetspåstande. URL-adfærden kontrolleres af `npm run site:test`.

## 📄 Licens

Indholdet på smartbolig.net er ophavsretligt beskyttet.

---

*Bygget med ❤️ i Danmark*
