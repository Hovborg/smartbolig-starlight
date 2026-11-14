# Status for redesignet

Opdateres ved hver afsluttet delopgave, så arbejdet kan genoptages præcist.
Plan: [PLAN.md](PLAN.md). Valg: [BESLUTNINGER.md](BESLUTNINGER.md). Til ejeren: [TIL-EJEREN.md](TIL-EJEREN.md).

Sidst opdateret: 2026-11-14.

## Færdigt

- Kortlægning: repo, regler, adgange, tidligere forsøg, nyhedsflowets fejlhistorik.
- Før-målinger (Lighthouse, sikkerhedsheadere, sideopgørelse) taget 2026-11-13.
- Research: open source-kandidater, danske søgeemner, indtjeningsmuligheder.
- `scripts/content-inventory.mjs`: opgørelse over alle sider (billeder, titler, links).
- **Fase 1, afhængigheder:** PR #171 flettet og udgivet 2026-11-13.
- **Vej tilbage afprøvet** på produktionssiden 2026-11-13 (`wrangler rollback` frem og tilbage).
- **Fase 1, nyhedsflow:** PR #172 og #179 flettet og udgivet 2026-11-14. Relayet er udrullet.
  Prøvekørsel og første rigtige kørsel i GitHub Actions bestod 2026-11-14: dagens udgave blev
  udgivet af kørslen selv (4 historier, 12 modelkald, 3.282 neurons). Målingen står i
  `docs/nyhedsflow.md`. Den tidligere Windows-opgave er slået fra.
- **Fase 3, gennemgang af guides:** PR #173–#177 flettet og udgivet 2026-11-13.
  Logge og åbne punkter: `docs/redesign/guide-review/`.
- **Fase 1, oprydning:** PR #181 flettet og udgivet 2026-11-14. De gamle kørsler (Windows,
  systemd, OpenClaw) og ComfyUI-sporet er fjernet; GitHub Actions er eneste udgivelsesvej.
  PR #170, #169, #166, #165 og #147 er lukket som forældede.

## I gang

- **Fase 2, design runde 1:** PR #180 flettet og udgivet 2026-11-14 (`main` 143eefc).
  Vej tilbage: `npx wrangler rollback <forrige version> -m "<besked>" -y`.
- **Fase 2, design runde 2** (grenen `redesign/v2`, ikke udgivet). Ejeren har bedt om et løft:
  wow-forside, realistisk 3D, grafik i høj kvalitet, mørkt tema først.
  - Færdigt på grenen: farveværdier v2, 3D-huset (`src/lib/house3d/`, `docs/3d-hus.md`), ny hero
    med søgefelt, husets skærm, rundturen "Et døgn i et smart hjem", stillbilleder, brandfiler,
    emnekort med billeder fra 3D-huset, ny rækkefølge under rundturen, morgenbillede ved de
    udvalgte guides. Set i browser ved 1440, 820 og 390 px, mørkt tema på dansk og lyst tema
    på engelsk.
  - Færdigt på grenen 2026-11-14 (B41–B46): guidehoved med billede af 3D-huset på alle guides,
    overskrifter/kort/faner uden emoji, tabeller i rulleramme, én ikonfarve på kort, grønne
    tips, sidemenu der åbner på det aktuelle emne, ny sidefod med YouTube.
    `npm run site:test` er grøn (149 tests).
  - Flettet ind 2026-11-14: nye nyhedsbilleder i grafit og grøn (64 udgaver tegnet om, tekst
    som omrids fra sidens skrifter; `docs/nyhedsflow.md`, "Overskriftsbilleder"). Ny
    nyhedsoversigt (B47). `npm run ai-news:test` er grøn (308 tests).
  - Tilføjet 2026-11-14: nærbillede til ESP32 (B48), brugt på forsidens ESP32-kort og som
    banner på ESP32- og gør-det-selv-guiderne. Set på forsiden og på `/da/esp32/` (1440 px).
  - Nyhedsbillederne er tegnet om igen 2026-11-14 (B49): hovedhistorien som overskrift, ingen
    sprogtekst, ét billede til begge sprog. Set i fuld størrelse (16:9 og 1:1).
  - Forsidens tre nyheder hedder nu efter hovedhistorien og bruger nyhedsoversigtens udvalg
    (`selectIssues`); `selectLatestNews` er fjernet.
  - Uafhængig gennemgang af hele grenen 2026-11-14: ingen blokerende fund, udgivelse anbefalet.
    Fundene er rettet (B50): rundturens kontrast, tabeller som tastaturstop, tabt WebGL, én
    dato pr. side, bannere til have og energi, fejl i `docs/designsystem.md` og
    `docs/3d-hus.md`. `npm run site:test` er grøn (151 tests).
  - Mangler på resten af siden: assistentens udseende.
- **Grene, der venter på at blive flettet som egne bidder efter runde 2:**
  - `content/new-guides-a` (`a9aeefd`): elmåler via HAN-port, valg af hardware, solceller og
    batteri. Gennemgået og rettet af en uafhængig model 2026-11-14.
  - `content/new-guides-b` (`d7c3728`): billige timer, ferietilstand, smart home i lejebolig.
    Gennemgået og rettet af en uafhængig model 2026-11-14. Automationerne er ikke kørt på et
    anlæg; skabelonerne er regnet efter.
- **CSP, kortlagt 2026-11-14 (til fase 5):** `script-src` har `'unsafe-inline'`, fordi siden har
  8–12 inline-scripts pr. side (samtykke/gtag, sprogcookie, tema før første tegning, Starlights
  søge- og sidemenuscripts og små Astro-moduler under 4 KB). `script-src-attr 'none'` er sat,
  og der er ingen inline-handlere. Google dokumenterer kun nonce-baseret CSP for AdSense.
  Plan: Workeren sætter en nonce pr. svar med HTMLRewriter (`run_worker_first` udvides), først
  afprøvet som `Content-Security-Policy-Report-Only` på en preview. Mindre første skridt:
  `vite.build.assetsInlineLimit: 0` og hashes for de få faste inline-scripts. Virker annoncerne
  ikke med nonce, beholdes `'unsafe-inline'` på sider med annoncer, og det skrives i TIL-EJEREN.

## Næste skridt

1. Gå resten af siden igennem (runde 2): indholdskomponenter, nyheder, assistent, 404, sidefod.
2. Uafhængig gennemgang, alle kontroller fra AGENTS.md, udgiv i bidder, kontrollér den levende
   side, og mål Lighthouse igen mod før-målingen.
3. Fase 3: illustrationer på alle guides (billeder fra 3D-byggesættet) og nye guides.
   Fase 4: smarte funktioner. Fase 5: SEO, CSP, indtjening. Fase 6: Search Console, Bing,
   Cloudflare, uafhængig sidevagt. Fase 7: dokumentation og docs-test.
4. Følg tre dages nyhedsdrift (planlagte kørsler kl. 04:37 og 11:37 UTC).

## Udskudt fra designgennemgangen

- Nyhedsoversigtens små billeder hentes i 1200 px; en 640 px-udgave med `srcset` hører til fase 5.
- 404-siden forhåndsindlæser ikke skrifterne.
- `--sb-ink-subtle` på sidens baggrundsvask giver 4,48:1 i lyst tema (lige under 4,5:1).
- Ikke set i en browser: tvungne farver, forsiden ved ca. 800 px, 3D-huset på en rigtig telefon.
- Fra gennemgangen 2026-11-14, ikke rettet endnu:
  - Tvungne farver: start/pause-ikonet og det valgte tidspunkt på husets skærm forsvinder.
  - Uden 3D følger regelteksten kapitlerne, mens billedet bliver på aftenen.
  - 3D-løkken har ingen grænse for billeder pr. sekund, mens bevægelse er slået til.
  - Søgefeltet og tidsknapperne er skjult, til scriptet kører; pladsen bør holdes fri.
  - Filer uden brug fra før redesignet (`ProductCard.astro`, `scripts/content-inventory.mjs`,
    `public/images/produkter/`, `logo-email.png`, fire filer i `public/images/guides/`):
    tjek ekstern brug, før de slettes.
  - Indtryk: emoji i tabelceller, emnekortene for automationer og produkter ligner hinanden,
    det store Home Assistant-kort har få detaljer, nyhedsartikler mangler brødkrumme, og
    nyhedsoversigtens store kort gentager dato og overskrift.
  - De danske navne i Home Assistant skrives forskelligt på tværs af guides ("Enheder og
    tjenester" mod "Enheder & tjenester"). Rettes samlet i fase 3.

Ting, der kræver ejeren, står i TIL-EJEREN.md.
