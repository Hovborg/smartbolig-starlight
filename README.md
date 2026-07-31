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
  fenced YAML-kodeblok med en automationsværdi som `mode: queued`, skal hver
  ønsket mode stå som en aktiv top-level `mode`-nøgle i en fenced YAML-blok —
  en kommentar eller tekst inde i en anden nøgle tæller ikke. Et rent
  konceptspørgsmål om eksempelvis queued mode udløser ikke et kunstigt krav om
  key-value-syntaks. Ellers prøves den afgrænsede fallback, og også den fejler
  lukket frem for at vise et vildledende næsten-svar. Det reducerer kendte fejl,
  men er ikke en generel garanti for, at al modelgenereret konfiguration er
  korrekt.
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
- **Afgrænset svartid og længde:** Modellen må generere højst 1.200 tokens og
  fallbacken højst 900. Hvert logisk modelkald har 30 sekunder til Gemma og 20
  sekunder til Qwen-fallbacken. Browserens 120-sekunders maksimum dækker den
  sjældne værste sti med fem sekunders AI Search, to logiske modelkald og 15
  sekunders netværksmargin. Normale svar returneres med det samme. En aktiv
  eller fejlet fallback logges med request-ID, trin, årsagsklasse og fejlnavn,
  men aldrig med prompt, modelsvar eller providerens fritekstfejl.

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
python3 scripts/content-audit.py
npm audit --omit=dev --audit-level=critical
npm run build
npm run seo:validate
npm run worker:build
npx wrangler deploy --dry-run
```

> **Midlertidig undtagelse (2026-07-29):** afhængighedstjekket er sænket fra
> `--audit-level=high` til `critical`. Otte high-advisories i projektets
> afhængighedstræ blokerede al deployment fra 26. juli, inklusive de daglige
> AI News-udgivelser. Sitet bygges fuldt statisk, så eksponeringen er begrænset.
> Gaten sættes tilbage til `high` som del af Astro 7-opgraderingen —
> se [issue #104](https://github.com/Hovborg/smartbolig-starlight/issues/104).

---

## 🤖 Daglig AI-news automation

AI-nyhedssektionen opdateres dagligt kl. 07:20 af `scripts/openclaw-ai-news-daily.sh`,
som henter officielle kilder, genererer artikler (da+en), bygger, validerer og
åbner en PR. Generatoren merger aldrig sin egen PR: en separat Claude/Codex-session
skal læse udkastet, kontrollere kilderne og vente på grønne checks før merge.

Pipelinen (v3):

- **Kilder:** OpenAI News, Google AI Blog og Anthropic News (HTML-listing — Anthropic
  har ingen RSS) plus release-feeds for Codex, Claude Code, Gemini CLI og OpenClaw.
- **Redaktionelt lag:** dedup på URL-, emne- og kildesæt-fingerprints mod de sidste
  14 dages udgaver, score-tærskel og krav om primær kilde.
- **Tekst:** `AI_NEWS_LLM=1` (standard i automatikken) beder headless Claude Code om
  unik per-historie-analyse (hvad/hvorfor/verificér/usikkerhed) ud fra kildeteksten;
  ved enhver fejl falder pipelinen tilbage til den deterministiske skabelon, så
  publiceringen aldrig blokerer. Frontmatter-feltet `news.copySource` viser hvilket
  lag der skrev teksten.
- **Billeder:** hero- og og:image-varianter genereres som JPEG (mozjpeg, ~100-300 KB);
  forsiden bruger 320×180 WebP-thumbs.
- **Arkivvedligehold:** `node scripts/ai-news-regenerate.mjs` kan genopbygge ældre
  udgaver med v3-rendereren ud fra hver artikels egen kildetabel (`--dry-run`,
  `--date`, `--no-llm`). Dage uden nye kilder renderes som ærlige
  gentagelses-udgaver med `signal: low`.

**Anbefalet setup (systemd user timer):**

```bash
bash scripts/install-systemd-ai-news-timer.sh
```

Det installerer:

| Unit | Funktion |
|------|----------|
| `smartbolig-ai-news.timer` | Kører dagligt kl. 07:20 (Persistent — indhenter missede kørsler) |
| `smartbolig-ai-news.service` | Kører pipeline-scriptet og åbner en PR til redaktionelt review |
| `smartbolig-ai-news-failure.service` | Opretter et GitHub-issue hvis kørslen fejler |

Drift-kommandoer:

```bash
systemctl --user list-timers smartbolig-ai-news.timer   # næste kørsel
systemctl --user start smartbolig-ai-news.service       # kør manuelt nu
journalctl --user -u smartbolig-ai-news.service -e      # se logs
```

> **Legacy:** `scripts/install-openclaw-ai-news-cron.sh` (OpenClaw cron-job) er det
> tidligere setup. Det krævede at agent-harnesset eksponerede et exec-tool og gik i
> stykker ved harness-ændringer — brug systemd-timeren i stedet.

---

## 🧭 Portalstruktur

Forsiden er en redaktionel "smart-home field guide" bygget af små komponenter
under `src/components/home/`, orkestreret af `HomePortal.astro` og styret af den
typede DA/EN copy-model i `src/lib/home-copy.ts`:

1. Kort hero med ét løfte, én primær CTA og et responsivt AVIF/WebP-billede
2. Kompakt målnavigator med begynderspor til `/start/` og fem indgange
3. Feltguide med sidens eneste nummerserie (etape 1–3)
4. Udvalgte guides som lead-artikel plus kompakt liste
5. Trust-sektion med efterprøvelige links (kilder, privatliv, affiliate, rettelser)
6. Kompakt AI-nyhedsmodul lavt på siden, valgt read-only fra content collection
7. Afsluttende CTA, der ikke gentager startruten

Al homepage-CSS er scoped til `.home-*` i `HomeStyles.astro`. Pagefind-søgning
dækker fortsat guides og nyheder.

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
