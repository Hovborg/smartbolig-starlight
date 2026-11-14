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
  `docs/billeder.md`. Udgivet 2026-11-14 (#197, Worker-version 35b19df2). Kontrolleret på den
  levende side: Home Assistant-guidens åbningsbillede har de nye `sizes`,
  `fetchpriority="high"`, `width` 1536 og `height` 1024 og seks WebP-bredder (640 til 1536 px),
  og billedfilen svarer 200 som `image/webp` (141 KB i største bredde); LD2410-guiden viser
  oversigten og ledningsdiagrammet på dansk og engelsk; `/produkter/shelly`,
  `/produkter/zigbee-sensorer`, `/da/products/shelly` og `/en/products/shelly` tager ét hop
  (301) til adressen med skråstreg, som svarer 200. Vej tilbage: Worker-version d6ff7144.
- **`www` til hoveddomænet (2026-11-14):** en omdirigeringsregel hos Cloudflare, kun for værten
  `www.smartbolig.net`. Kontrolleret på den levende side: `/`, `/da/`, en guide med forespørgsel
  og `http://` svarer alle 301 til samme sti på `https://smartbolig.net`; hoveddomænet og
  `/api/chat` er uændrede, og zonens anden regel (et andet projekts) er urørt. Beskrevet i
  `docs/seo.md`. Vej tilbage: slet reglen.
- **Titler og interne links (B57):** ca. 70 titler rettet, menunavne i `config/sidebar/` rettet
  med, `seoTitle` på oversigtssider og kontakt, interne links til 18 guides, årstal ud af
  overskrifter, lister i stedet for rå diagramkode. Uafhængig gennemgang; fund rettet.
  Dokumentation: `CONTENT-GUIDE.md` ("Titel og `seoTitle`") og `docs/seo.md`. Udgivet 2026-11-14
  (#199, Worker-version 966fcabc). Kontrolleret på den levende side: `/da/automationer/` har
  `<h1>` "Automationer" og samme søgetitel i `<title>`, `og:title` og `twitter:title`;
  `/en/produkter/` ligeså ("Products"); hardwareguiden har sin gamle titel; fire af de nye
  interne links svarer 200; menuen viser de rettede navne. Vej tilbage: Worker-version 35b19df2.

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
- **Samtykke først og strengere CSP (B56):** intet hentes fra Google Analytics eller AdSense før
  et ja i Googles samtykkebesked; kommentarer hentes ved tryk; de juridiske sider passer med
  koden. Bygningen laver en CSP uden `'unsafe-inline'` for scripts (4 hashes) og sender den som
  Report-Only. Dokumentation: `docs/samtykke.md` og `docs/sikkerhed.md`.
  Før udgivelsen (den levende side, headless Chrome, 2026-11-14): før noget svar hentede en
  side `gtag.js`, `adsbygoogle.js`, Cloudflares måler, giscus og sendte et kald til Google
  Analytics, og cookien `preferred-lang` blev sat.
  **Fund 2026-11-14:** der er ingen udgivet samtykkebesked for siden i AdSense (Googles script
  melder "inaktiv" på den levende side). Efter udgivelsen hentes derfor hverken Analytics
  eller AdSense, hvor GDPR gælder (målt fra Danmark), før ejeren har udgivet beskeden
  (TIL-EJEREN punkt 1). To uafhængige gennemgange; fund rettet (B56).
  **Udgivet 2026-11-14** (PR #198, `main` 4282e27) efter tre uafhængige gennemgange. Målt på
  den levende side bagefter (headless Chrome fra Danmark: forsiden, en guide,
  privatlivspolitikken, kontaktsiden og nyhedsoversigten): en side henter kun fra
  `static.cloudflareinsights.com` og `fundingchoicesmessages.google.com`; eneste cookie er
  Googles `FCCDCF`; Googles script melder "inaktiv" og viser ingen besked;
  "Cookieindstillinger" er skjult; konsollen viser ingen overtrædelser af den strenge
  politik, heller ikke på en juridisk side. Forløbene ja og nej kan først ses på den levende
  side, når beskeden er udgivet.
  Næste skridt: `ENFORCE_STRICT_CSP = true`, når den levende side er set uden overtrædelser
  med annoncer. Ikke valgt: nonce pr. svar i Workeren; hashes klarer det uden at Workeren skal
  stå foran hver side.
- **Indtjening (B60):** produktregister (115 produkter), klikmåling på reklamelinks efter et ja
  til statistik (`affiliate_click`), og én fast annonceplads under guides og nyheder, slukket
  til den får et annoncenummer (`docs/indtjening.md`). Uafhængig gennemgang: ingen blokerende
  fund; fundene er rettet. Afprøvet i headless Chrome med efterlignet samtykke. Ikke set:
  hændelsen i Google Analytics og en rigtig annonce (kræver udgivet samtykkebesked og et
  annoncenummer; TIL-EJEREN punkt 1).
- **Sidevagt og llms.txt (B58):** `.github/workflows/monitor.yml` henter tretten adresser på
  den levende side to gange i døgnet og åbner en GitHub-sag med etiketten `monitor`, hvis en
  kontrol fejler (`docs/overvaagning.md`). `llms.txt` laves af bygget, og bygget stopper, hvis
  sitemappet får et område, som hverken er med eller valgt fra. Kørt lokalt mod den levende
  side: alle 13 kontroller bestod. **Udgivet 2026-11-14** (PR #202, `main` 66cae87, Worker
  `b3071424`). Workflowen er startet én gang i Actions bagefter: grøn, 13 af 13 bestod, ingen
  sag åbnet. `llms.txt` på den levende side er den byggede (43,8 KB). Ikke set køre: trinene,
  der åbner, kommenterer og lukker sagen (kræver en fejlende kontrol).
- **Diagrammer:** alle 36 diagrammer i guiderne er tegnet om til telefonbredde og mørkt tema,
  med engelske tvillinger og alt-tekster. Uafhængig gennemgang fandt én fejl i et 230 V-diagram
  (Shelly Wall Display har ingen jordklemme; rettet efter Shellys egen dokumentation) og fem
  mindre fakta, som er rettet. **Udgivet 2026-11-14** (PR #200, `main` efter 66cae87, Worker
  `e4b21205`); set på den levende side i 390 px bredde. Åbent: teksten er ca. 10 px på en
  telefon (mål: 11 px), og LD2410-tegningen har ikke printets benrækkefølge (guiden siger det).
  Begge dele kræver ny opsætning af tegningerne.
- **Værktøjer (B61):** ny sektion `/vaerktoejer/` på begge sprog med to værktøjer: elprisen
  lige nu med de billigste timer (Energinet, CC BY 4.0, gennem sidens eget `/api/elpris`) og
  "Hvad koster det at have apparatet tændt?". Fælles ramme, så et nyt værktøj er få filer
  (`docs/vaerktoejer.md`). Sidevagten har fået kontrol nr. 14 (`/api/elpris`).
  Forsiden har fået en værktøjssektion med elprisen lige nu (B63); den udgives sammen med
  værktøjerne. Den uafhængige gennemgang fandt én blokerende fejl (flere samtidige kald til
  Energinet ved kold start) og en række mindre; alle er rettet og står i
  `docs/vaerktoejer.md` under "Rettet efter gennemgangen". En opfølgende gennemgang fandt ingen
  blokerende fejl, men fem ting i endpointet og forsidens kort (ekstra kald til Energinet, halve
  svar, afbrudt besøgende, kortets højde, manglende tests); de er rettet, og ti prøver med
  rettelsen taget ud viser, at testene fanger hver af dem. Afprøvet 2026-11-14: alle tests,
  bygget side og en rigtig browser (tal med tusindtegn afvises, eksempler, enhedens ur en
  time forkert, forsidens kort). Kan først ses på den levende side: Cloudflares cache pr.
  datacenter, gæt på prisområde ud fra den besøgendes sted, og om Energinet begrænser kald
  fra Cloudflares adresser.

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
  - Diagrammerne i guiderne: alle 27 SVG-filer er tegnet om og holdt op mod guidens tekst og
    kode. Efter den seneste ændring (større tekst) er alle 36 filer set som billede i 656 px
    (2 × 328) på mørk baggrund, og en uafhængig gennemgang har set dem på lys baggrund og på den
    byggede side i 390 px; de er ikke set i 720 px efter ændringen. Teksten er mindst 22 enheder i
    en 640 enheder bred `viewBox` (ca. 11 px på en telefon; før 2,5-5 px), intet overlapper, og
    hver fil har `<title>` og `<desc>` på sit sprog. Syv engelske guides, der viste et dansk
    diagram, har fået et engelsk, og den engelske ESP32-startguide viser nu oversigten og
    benoversigten (ni nye engelske filer, 36 i alt). Reglerne for nye diagrammer står i
    `docs/billeder.md` under "Diagrammer". Tilbage:
    - LD2410-ledningsdiagrammet viser benene i printets rækkefølge (TX, RX, OUT, GND, VCC;
      Hi-Links manual til HLK-LD2410C, V1.00) og skriver "OUT bruges ikke" under tegningen. Før var der en valgfri ledning fra
      OUT til GPIO5, som guidens tabel og kode ikke bruger. Skal OUT bruges, vælges et frit ben,
      og guide, kode og diagram ændres samlet.
    - Den engelske LD2410-guide har ikke den danske guides tabel "ESP32 til LD2410C"; diagrammet
      og koden er dens eneste kilde til ESP32-benene.
    - Rettet i samme omgang: PIR-guiden, dens kode og diagram bruger nu GPIO13 (GPIO5 læses
      ved opstart, og ESPHome advarer om det); Raspberry Pi-tabellen nævner 15 W til Pi 4 og
      27 W til Pi 5 (Raspberry Pis dokumentation, "Recommended power supply", læst 2026-11-14);
      vaskemaskine-guiden skriver 100-2000 W begge steder; overskriften "Wiring diagram" i tre
      danske guider hedder "Ledningsdiagram".
    - Ikke set på en rigtig telefon, i Safari eller i Firefox.
  - Indtryk: emoji i tabelceller, emnekortene for automationer og produkter ligner hinanden,
    det store Home Assistant-kort har få detaljer, nyhedsartikler mangler brødkrumme, og
    nyhedsoversigtens store kort gentager dato og overskrift.
  - De danske navne i Home Assistant skrives forskelligt på tværs af guides ("Enheder og
    tjenester" mod "Enheder & tjenester"). Rettes samlet i fase 3.

Ting, der kræver ejeren, står i TIL-EJEREN.md.
