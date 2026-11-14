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
  - Mangler på forsiden: et nærbillede til ESP32-kortet.
  - Mangler på resten af siden: assistenten, topbjælke på telefon, engelske nyhedsbilleder.
- **Grene, der venter på at blive flettet ind i `redesign/v2`:**
  - `content/new-guides-a` (`697fe46`): elmåler via HAN-port, valg af hardware, solceller og
    batteri. Skal gennemgås af en uafhængig model før fletning.
  - `content/new-guides-b` (`79c77e2`): billige timer, ferietilstand, smart home i lejebolig.
    Skal gennemgås af en uafhængig model før fletning.
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

Ting, der kræver ejeren, står i TIL-EJEREN.md.
