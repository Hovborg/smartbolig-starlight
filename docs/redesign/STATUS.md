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
- **Afhængigheder og automatiske opdateringer (B51):** Astro 7.4.7, `npm audit` uden fund,
  Dependabot med 14 dages ventetid og auto-fletning af små npm-opdateringer
  (`docs/opdateringer.md`). Dependabots advarsler og sikkerhedsrettelser er slået til i
  repoet, og flettede grene slettes af repo-indstillingen. To uafhængige gennemgange;
  reglerne afprøves af `scripts/site-dependabot.test.mjs`. Næste skridt her: opgradér
  Starlight til 0.42 i hånden (mobilmenu-knappen), så pakken igen får rettelser. Ikke set endnu: den første rigtige pull request fra Dependabot gennem
  auto-fletningen (se punktet "Automatiske opdateringer set i drift" nedenfor).
- **Assistentens eget søgeindeks (B52, rettet efter uafhængig gennemgang):** bygges med siden, læses af Workeren fra `/_index/`;
  `ai_search`-bindingen er fjernet. `functions/api/chat.js` er delt i `functions/lib/chat/`.
  Dokumentation: `docs/assistent.md`. Udgivet 2026-11-14 (PR #194, `main` 3bb4004). Live:
  svar på dansk og engelsk med links til guides, `/_index/da/meta.json` har `noindex`.
  Åbent: et svar tager ca. 45 sekunder, fordi modellen svarer i ét stykke. Næste skridt er
  løbende visning af svaret (streaming) i assistentens nye udseende.
- **Automatiske opdateringer set i drift 2026-11-14:** Dependabot åbnede otte pull requests
  efter udgivelsen. Gruppen med små npm-opdateringer (PR #192) blev flettet af sig selv, efter
  at `deploy`-kontrollen var grøn, og kontrollerne kørte derefter på `main`. Starlight 0.42.8
  (PR #193) og de tre opdateringer af GitHub Actions blev stående åbne, som reglerne siger.
- **3D-huset i en worker (B53):** rettet efter uafhængig gennemgang: siden spørger først,
  hvor huset kan tegnes (`probe.mjs`), motoren bliver stående stoppet efter `dispose`, og
  første billede venter højst 2,5 s på shaderne. Dokumentation: `docs/3d-hus.md`.
  Udgivet 2026-11-14 (PR #195, `main` e0c6f9a, Worker-version 680d5226). Set på den levende
  forside i headless Chrome: med grafikkort er huset levende og tegnes i en worker; uden
  grafikkort står stillbilledet, og three.js hentes ikke. Ikke set: Safari og Firefox på en
  rigtig enhed (TIL-EJEREN punkt 9). Vej tilbage: Worker-version db439722.
- **Søgemaskinernes grundregler (B54):** omdirigeringer for gamle adresser, `robots.txt` uden
  grupper til Googlebot og Bingbot og med Anthropics træningscrawler spærret, ingen HowTo-data,
  `og:type` efter sidens slags, forside uden brødkrumme-liste. Uafhængig gennemgang; fund
  rettet. Dokumentation: `docs/seo.md`. Efter udgivelsen kontrolleres med `curl`: `/kontakt`,
  `/sitemap.xml`, `/index.html`, `/produkter/shelly`, `/da/products/shelly/`,
  `/en/products/shelly/`, `robots.txt` og `og:type` på en guide og en oversigt.
  Udgivet 2026-11-14 (PR #196, `main` 648aecf, Worker-version d6ff7144). Set med `curl` på den
  levende side: `/kontakt`, `/sitemap.xml`, `/index.html`, `/da/products/shelly/` og
  `/en/products/shelly/` svarer 301 til den rigtige adresse i ét hop; `robots.txt` har de to
  `Disallow`-linjer i `*`-gruppen; `og:type` er `article` på Zigbee2MQTT-guiden og `website` på
  forsiden, Home Assistant-oversigten og nyhedsoversigten; forsiden har ingen brødkrumme-liste,
  guiden ingen HowTo-data, og der er ét `generator`-felt. Afvigelse: `/produkter/shelly` og
  `/da/products/shelly` fik to hop, fordi Cloudflare lod `*`-reglen vinde over `:slug`-reglen.
  Rettet i billedudgivelsen (reglerne overlapper ikke mere). Vej tilbage: Worker-version 680d5226.
- **Guidernes billeder (B55):** billederne i guidernes tekst ligger i `src/assets/guides/` og
  laves som WebP i seks bredder; browseren får spaltens målte bredde at vide; tegninger fylder
  spalten; åbningsbilledet hentes først. Uafhængig gennemgang; fund rettet. Dokumentation:
  `docs/billeder.md`. Efter udgivelsen kontrolleres på den levende side: `srcset`, `sizes` og
  `fetchpriority` på Home Assistant-guidens åbningsbillede, at en billedfil svarer 200 som WebP,
  LD2410-diagrammet på dansk og engelsk, og `/produkter/shelly` i ét hop. Resultatet skrives her.
- **`www` til hoveddomænet (2026-11-14):** en omdirigeringsregel hos Cloudflare, kun for værten
  `www.smartbolig.net`. Kontrolleret på den levende side: `/`, `/da/`, en guide med forespørgsel
  og `http://` svarer alle 301 til samme sti på `https://smartbolig.net`; hoveddomænet og
  `/api/chat` er uændrede, og zonens anden regel (et andet projekts) er urørt. Beskrevet i
  `docs/seo.md`. Vej tilbage: slet reglen.

## I gang

- **Fase 2, design runde 1:** PR #180 flettet og udgivet 2026-11-14 (`main` 143eefc).
  Vej tilbage: `npx wrangler rollback <forrige version> -m "<besked>" -y`.
- **Fase 2, design runde 2:** PR #182 flettet og udgivet 2026-11-14 (`main` d3eaa30). Ejeren bad om et løft:
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
- **Seks nye guides:** PR #183 flettet og udgivet 2026-11-14 (`main` ce015e6):
  elmåler via HAN-port, valg af hardware, solceller og batteri, billige timer, ferietilstand,
  smart home i lejebolig. Gennemgået og rettet af en uafhængig model 2026-11-14 mod officielle
  kilder. Ikke afprøvet: automationerne er ikke kørt på et anlæg (skabelonerne i billige timer
  er regnet efter mod en uafhængig beregning), og netselskaber ud over de nævnte er ikke læst.
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
    `public/images/produkter/`, `logo-email.png`): tjek ekstern brug, før de slettes.
  - Diagrammerne i guiderne (27 SVG-filer) er ikke set igennem. LD2410-oversigten har
    overlappende tekst og dansk tekst på den engelske side; de andre skal ses som billede, og
    fakta holdes op mod guidens tekst og kode.
  - Indtryk: emoji i tabelceller, emnekortene for automationer og produkter ligner hinanden,
    det store Home Assistant-kort har få detaljer, nyhedsartikler mangler brødkrumme, og
    nyhedsoversigtens store kort gentager dato og overskrift.
  - De danske navne i Home Assistant skrives forskelligt på tværs af guides ("Enheder og
    tjenester" mod "Enheder & tjenester"). Rettes samlet i fase 3.

Ting, der kræver ejeren, står i TIL-EJEREN.md.
