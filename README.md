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
- **SmartBolig som ekstra kilde:** Bindingen `SMARTBOLIG_SEARCH` peger på
  `smartbolig-ai-search`. Faglige smart-home/homelab-spørgsmål får højst ét
  afgrænset opslag, hvis bindingen er tilgængelig. Resultatet gives til den
  brede model som ubetroet reference-data. Efter opslaget får både primær- og
  fallbackmodel en særskilt slutprompt uden et tilgængeligt søgeværktøj, så
  interne værktøjsnavne og retrieval-trin ikke bliver vist som kommandoer.
  AI Search er ikke assistentens eneste viden.
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
- **Ingen dokumentationskopi:** SmartBolig kopierer ikke Home Assistant- eller ESPHome-dokumentation ind i AI Search.
  Den brede model svarer fortsat om hele fagområdet, mens kun serverens konkrete,
  gennemgåede fakta får officiel status.
- **Ærlige kildegrader:** Svar vises som **Officielle kilder
  kontrolleret**, **SmartBolig-kilder + bred AI-viden** eller **Generel
  AI-viden**. Et svar får aldrig officielt badge alene på grund af modellens
  generelle træningsviden. API-feltet `officialVerifiedAt` viser den ældste
  reviewdato blandt de anvendte evidenspakker og er ellers `null`.
- **Ingen ekstra RAG-database:** AI Search ejer allerede sin søgeindeksering, så
  projektet opretter ikke en separat D1- eller Vectorize-database.
- **Abuse-kontrol:** `CHAT_RATE_LIMITER` tillader 12 chatkald pr. minut pr.
  forbindende IP i hver Cloudflare-lokation. Et normalt svar bruger ét
  logisk modelkald med højst ét sekundært forsøg. Et fagligt svar kan desuden
  bruge ét AI Search-opslag; en valgfri modelstyret søgesti er fortsat
  begrænset til højst to logiske modelkald. AI Search falder tilbage til bred
  modelviden efter fem sekunder.
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
  med fem sekunders AI Search, to Gemma-kald, op til to Qwen-fallbackkald og ti
  sekunders netværksmargin. Et providerresultat med token-limit, en uafsluttet
  kodeblok eller et tydeligt hængende bindeord vises aldrig: primærsvaret går
  til fallback, og en afskåret fallback fejler lukket. Normale svar returneres
  med det samme. En aktiv eller fejlet fallback logges med request-ID, trin,
  årsagsklasse og fejlnavn, men aldrig med prompt, modelsvar eller providerens
  fritekstfejl.

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
AI/AI Search-kvoten:

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
python3 -m unittest discover -s scripts -p "test_*.py"
python3 scripts/content-audit.py
npm audit --audit-level=high
npm run build
npm run seo:validate
npm run worker:build
npx wrangler deploy --dry-run
```

Afhængighedskontrollen omfatter også udviklingsværktøjer. Den tidligere
midlertidige undtagelse er ophævet. På Windows bruges den installerede Python
og Git for Windows Bash; indholdskontrollen behøver ikke WSL.

Nyhedskilder hentes gennem én fælles kontrol med HTTPS, værtsallowlist,
kontrol af hver redirect, binding til godkendte offentlige DNS-adresser,
timeout og bytegrænser (2 MB for feeds/kildestatus, 1,5 MB for artikler).
Reference-URL'er kontrolleres med status alene, og deres svarindhold annulleres.
Tests bruger lokale mocks og kalder hverken private netværksadresser eller AI.
Projektets MCP-fil starter ingen eksterne pakker; udviklerværktøjer styres af
værtens egen MCP-konfiguration.

---

## 🤖 Daglig AI-news automation

Windows Scheduled Task `Shark Smartbolig AI News` er beregnet til daglig
opdatering kl. 07:20, når den er installeret og aktiveret på værten. Runneren
`scripts/smartbolig-ai-news-daily.ps1`
henter officielle kilder, genererer artikler (da+en), bygger og validerer, åbner
en PR, venter på den grønne GitHub Actions-kørsel, merger, venter på
  Cloudflare-deploy og kontrollerer til sidst både dansk og engelsk artikel og
  oversigt mod udgavens unikke fingerprint. Fingerprintet dækker dato, alle
  kilder og kildeuddrag samt hele den tosprogede redaktionelle tekst.

Pipelinen (v3):

- **Kilder:** OpenAI News, Google AI Blog og Anthropic News (HTML-listing — Anthropic
  har ingen RSS) plus release-feeds for Codex, Claude Code, Gemini CLI og OpenClaw.
- **Redaktionelt lag:** dedup på URL-, emne- og kildesæt-fingerprints mod de sidste
  14 dages udgaver, score-tærskel og krav om primær kilde.
- **Tekst:** den automatiske runner bruger `--require-llm` og beder en isoleret,
  tool-fri Claude Code-session om unik per-historie-analyse
  (hvad/hvorfor/verificér/usikkerhed) ud fra kildeteksten. Hvis teksten mangler,
  overskrider grænserne eller bliver afvist, stopper publiceringen. Den generiske
  skabelon er kun fallback for manuelle udkast og kan ikke auto-merges.
- **Automatisk kvalitetsport:** `npm run ai-news:quality -- --date YYYY-MM-DD`
  kræver `news.copySource: llm`, høj signalværdi, mindst to historier, DA/EN-
  kildeparitet, fyldige felter, en separat source-bound AI-faktakontrol og ingen
  gentaget skabelontekst. Kilder med for tynd dokumentation frasorteres. GitHub Actions
  genkører porten for alle ændrede AI News-udgaver før merge.
- **Billeder:** hero- og og:image-varianter genereres som JPEG (mozjpeg, ~100-300 KB);
  forsiden bruger 320×180 WebP-thumbs.
- **Arkivvedligehold:** `node scripts/ai-news-regenerate.mjs` kan genopbygge ældre
  udgaver med v3-rendereren ud fra hver artikels egen kildetabel (`--dry-run`,
  `--date`, `--no-llm`). Dage uden nye kilder renderes som ærlige
  gentagelses-udgaver med `signal: low`.

**Windows 11 setup (kanonisk):**

```powershell
git clone https://github.com/Hovborg/smartbolig-starlight.git C:\codex_projekts\.automation\smartbolig-ai-news
& C:\codex_projekts\.automation\smartbolig-ai-news\scripts\smartbolig-ai-news-daily.ps1 -Preflight
& C:\codex_projekts\.automation\smartbolig-ai-news\scripts\install-windows-ai-news-task.ps1
```

Hver kørsel bruger et nyt isoleret worktree fra den eksakte `origin/main` SHA.
Tasken bruger ejerens interaktive GitHub- og Claude-login og indhenter en misset
kørsel efter næste login; den må først aktiveres efter en grøn `-Preflight`.
Runnerens native kommandoer videresender argumenter uden PowerShell-binding,
så eksempelvis `git -C <sti>` også virker i Windows PowerShell 5.1. Regressionen
kontrolleres i både Windows PowerShell 5.1 og PowerShell 7 af `npm run ai-news:test`.
Hvis et retry ser dagens tosprogede issue i `origin/main`, genoptager det den
eksakte main-deploy og offentlige fingerprint-kontrol i stedet for at behandle
artiklen som en stille `skip`.

Det installerer:

| Scheduled Task | Funktion |
|------|----------|
| `Shark Smartbolig AI News` | Kører dagligt kl. 07:20, indhenter missede kørsler, merger først efter grøn CI og verificerer den offentlige URL |

Drift-kommandoer:

```powershell
Get-ScheduledTask -TaskName 'Shark Smartbolig AI News'
Start-ScheduledTask -TaskName 'Shark Smartbolig AI News'
Get-ChildItem C:\codex_projekts\05-data\smartbolig-ai-news\logs | Sort-Object LastWriteTime -Descending
```

> **Legacy:** `scripts/openclaw-ai-news-daily.sh`, systemd-installeren og OpenClaw-
> cron-installeren er Linux-artefakter fra før Windows-migreringen. De er bevaret
> som historik/fallback, men må ikke bruges til den aktive drift.

---

## 🧭 Portalstruktur

Forsiden er en redaktionel "smart-home field guide" bygget af små komponenter
under `src/components/home/`, orkestreret af `HomePortal.astro` og styret af den
typede DA/EN copy-model i `src/lib/home-copy.ts`:

1. Hero med et animeret SVG-husdiagram, én primær CTA, emnemarkører og et responsivt AVIF/WebP-boligfoto
2. De tre senest publicerede AI-nyheder lige under heroen, med billeder, datoer, arkiv og RSS; heroen linker også direkte til nyhedsarkivet
3. Målnavigator med begynderspor til `/start/` og fem klikbare emnefelter med hver sin animerede SVG-scene (hjem, automation, ESP32, enheder og AI)
4. Feltguide med en forbundet, vandret etaperute på computer og lodret forløb på mobil
5. Udvalgte guides med elektronikfoto, SVG-illustration og separate guidekort
6. Trust-sektion med efterprøvelige links (kilder, privatliv, affiliate, rettelser)
7. Afsluttende CTA, der ikke gentager startruten

Forsiden arver Galaxy-temaets blå accenter, baggrund, Inter-skrifttype og både lys
og mørk visning direkte fra guidernes CSS-variabler. Headeren har ingen særskilt
forsidepalet. Den synlige Start/Pause-kontrol styrer SVG-scener, indgangsanimationer
ved scrolling og hover-effekter samlet. Reduceret bevægelse respekteres som standard;
brugerens eksplicitte valg kan starte animationer og gemmes lokalt under
`smartbolig-motion-v1`. "Følg enheden" nulstiller dette valg. Scener uden for skærmen
og skjulte faner sættes på pause. Diagrammerne er illustrationer, ikke live-data.
Homepage-CSS er scoped til `.home-*` i `HomeStyles.astro`; de få tilpasninger
af Starlight-rammen kræver `body:has(.home-portal)`, så guides beholder deres layout.
`HomeMotionControls.astro` indlæser den lille controller `src/lib/home-motion.mjs`.
Indholdet er stadig statisk og synligt uden JavaScript; ingen nye fonte eller
afhængigheder. `HomeMotionStyles.astro` samler animationerne. Controllerens tilstande,
reduced motion, utilgængeligt lager og oprydning kontrolleres i `site-motion.test.mjs`.
Pagefind-søgning dækker fortsat guides og nyheder.

Hero-masteren ligger under `src/assets/homepage/`. Generér de seks responsive
AVIF/WebP-filer efter en ændring af masteren med:

```bash
npm run images:home
```

Forsidens nyhedsliste bruger små WebP-thumbnails (`-thumb.webp`) ved siden af
AI-nyhedernes hero-PNG'er. De genereres automatisk som første trin i
`npm run build`; kør dem manuelt med:

```bash
npm run images:news-thumbs
```

Aktuelle guideforløb omfatter blandt andet:

- Matter og Thread i Home Assistant 2026
- lokal Home Assistant Assist med Speech-to-Phrase/Whisper og Piper
- ESPHome Bluetooth Proxy på Wi-Fi, Ethernet eller PoE
- Home Assistant Energy Dashboard med international opsætning til elnet,
  solceller, batteri, gas, vand, apparater og elbil

---

## 📄 Licens

Indholdet på smartbolig.net er ophavsretligt beskyttet.

---

*Bygget med ❤️ i Danmark*
