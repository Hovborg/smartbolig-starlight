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
  Et svar tog ca. 45 sekunder, fordi modellen svarede i ét stykke.
- **Assistenten skriver svaret, mens læseren ser på (B62):** `/api/chat` kan sende svaret som
  Server-Sent Events, og vinduet viser en statuslinje ("Søger i guiderne ...") og derefter
  teksten, mens den kommer. Uden strøm (ældre browser, fejl undervejs) falder vinduet tilbage
  til det gamle JSON-svar. Slås fra ét sted: `STREAMING_ENABLED` i `functions/lib/chat/limits.js`.
  To uafhængige gennemgange; fundene er rettet, og 13 prøver med en rettelse taget ud fanges
  alle af testene. Dokumentation: `docs/assistent.md`. Kendt i vinduet og ikke rettet: på en
  telefon på 375×760 px er samtalefeltet ca. 209 px højt; ved 320 px står overskriftens tekst
  under nulstil-knappen; statusteksten kan stå to gange et øjeblik; "Kopiér kode" vises også
  på en kodeblok, der endnu skrives. Udgivet 2026-11-14 (PR #206, `main` 9caab95, Worker
  `234155f6`). Set på den levende side: status efter 0,10 s, kilder efter 0,14 s, første ord
  efter ca. 19 s og hele svaret efter ca. 31 s for et spørgsmål om Zigbee; teksten strømmer.
  Vej tilbage: `npx wrangler rollback e7f0c884-ed6a-4ec8-880c-e76a412809bd -m "<besked>" -y`.
- **Assistenten søger først (B62, tilføjelser):** fundet på den levende side, at et
  spørgsmål uden et smart home-ord ("Hvordan får jeg lyset til at tænde ved bevægelse?") gav
  33 s uden tekst, hele svaret på én gang og ingen kilder. Nu søges sidens indeks for hver
  besked, der ikke er en ren afslutning (»Tak for det«, »Okay«), med beskeden alene og højst
  én gang. Resultatet bruges, når beskeden har et smart home-ord og opslaget fandt noget,
  eller bedste svar har mindst 12 point (`USEFUL_SCORE`), og modellen får aldrig et værktøj:
  ét modelkald, der altid strømmer. Et fejlet opslag meldes til modellen som »ikke
  tilgængeligt«, et tomt som »intet fundet«, og en senere besked uden sider som »ingen side
  til den seneste besked« (`continued`): modellen svarer da ud fra samtalen. Bygget advarer
  (stopper ikke), når et spørgsmål i prøvelisterne flytter over grænsen. Fire uafhængige
  gennemgange før udgivelsen: den første fandt, at et emneskift gav sider om det gamle emne;
  den anden, at en opfølgning uden »den« eller »det« ingen sider fik; den tredje, at
  ordreglerne fra den rettelse tog rigtige spørgsmål med sig; den fjerde, at reglen, der stod
  tilbage (søg sammen med beskeden før, når beskeden intet finder alene og kun har ord, siden
  kender), gav et nyt emne lige under grænsen og afslutninger som »Tak for din hjælp« det
  tidligere spørgsmåls sider. Målt bagefter: indekset kan ikke skelne en opfølgning fra et
  nyt emne eller en afslutning (hverken point, antal søgeord eller ordenes sjældenhed).
  Derfor søges en besked nu aldrig sammen med en tidligere. Målt med den tredje og den
  fjerde gennemgangs 2.261 samtaler mod det byggede indeks: i alle viser den senere besked
  præcis de kilder, den viser som første besked. En femte gennemgang fandt ingen besked, der
  får et tidligere spørgsmåls sider (520 egne samtaler, også som strøm og i kæder); dens
  mindre fund er rettet (»HA« med store bogstaver søges, undtagen i en besked helt med store bogstaver, ordlisterne sammenlignes med koden,
  prompten til en opfølgning). 195 prøver med en fejl sat ind i koden fanges alle af
  testene. Pris, kendt: en opfølgning uden eget emne (»Kan du uddybe?«) får
  ingen nye sider og ingen kildelinks (356 af 524 danske og 340 af 485 engelske
  opfølgningssamtaler); svaret bygger på samtalen. Kendt i øvrigt: en tak i ord, listerne
  ikke har (»Tak, jeg vender tilbage«), søges alene og viste en irrelevant kilde i 11 af den
  femte gennemgangs 100 nye takkebeskeder; en opfølgning, der selv når
  grænsen (»Hvad koster det cirka?«), får sine egne sider; et nyt smart home-emne under
  grænsen (»Hvordan styrer jeg min garageport?«) får ingen kilder; nogle hverdagsspørgsmål når
  stadig grænsen (2 af 20 danske, 6 af 24 engelske) og kan få en kilde; tiden til første ord
  (ca. 19 s, modellens tænketid) er ikke ændret og står på listen til ejeren. Muligt næste
  skridt, ikke bygget: lade modellen skrive søgeteksten til en opfølgning (ét modelkald mere).
  Tal og grænser: `docs/assistent.md`, "Målt med samtaler". Udgivet 2026-11-14 (PR #209,
  `main` 22fface, Worker `fd3bd2e3`). Set på den levende side med én samtale på tre beskeder:
  "Hvordan får jeg lyset til at tænde ved bevægelse?" viser fire kilder fra siden, første ord
  efter 20 s og hele svaret efter 36 s (før: 33 s uden tekst og ingen kilder); "Kan du
  uddybe?" viser ingen kilder og svarer ud fra samtalen, første ord efter 32 s; "Tak for det"
  viser ingen kilder og er færdig efter 12 s. Opfølgningen blev sendt med en forkortet udgave
  af det første svar som historik. Vinduet på forsiden (telefonbredde, skjult Chrome): fire
  kildelinks vises straks, teksten kommer løbende fra ca. 27 s, og vinduet er klar igen efter
  42 s. Ikke set: en opfølgning skrevet i vinduet.
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
  rigtig enhed (TIL-EJEREN punkt 15). Vej tilbage: Worker-version db439722.
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
  - Assistentens udseende følger designsystemet (farveværdier, lyst og mørkt tema) og er set i
    headless Chrome ved 320, 375 og 1440 px (B62).
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
  sag åbnet. `llms.txt` på den levende side er den byggede (43,8 KB). Trinnet, der åbner sagen, er
  set køre 2026-11-14 i en prøve mod en adresse, der fejler (sag #210, lukket i hånden bagefter).
  Ikke set køre: at en grøn kørsel selv lukker en åben sag.
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
  time forkert, forsidens kort). **Udgivet 2026-11-14** (PR #204, `main` efter a6dcfde, Worker
  `bec7ef7c`; vejen tilbage til før værktøjerne er Worker `26dcf207`).
  Fundet på den levende side: `/api/elpris` svarede 502, fordi Energinets datasæt-adresse
  afviser Cloudflares delte adresse med 429 (14 af 14 kald). Siderne, strømforbrugsværktøjet og
  forsidens kort (med tekst i stedet for tal) virkede imens. Rettet i en opfølgende ændring
  (grenen `fix/elpris-source`): download-adressen spørges først (200 i 15 af 15 kald fra
  Cloudflare), og fire mindre fund fra gennemgangen efter udgivelsen er rettet med hver sin
  test (B61, tilføjelsen efter udgivelsen). Vejen tilbage fra rettelsen er Worker `bec7ef7c`.
  **Rettelsen er udgivet 2026-11-14** (PR #205, `main` efter c6045d5, Worker `e7f0c884`). Set
  på den levende side: `/api/elpris` svarer 200 med 96 priser for DK1, DK2 og gættet område,
  400 på et ukendt område og 405 på POST; forsidens kort og elprisværktøjet viser tal på dansk
  og engelsk i headless Chrome (390 px) uden fejl i konsollen; sidevagtens kontrol af
  `/api/elpris` bestod i en kørsel startet i hånden.
- **Tidsplaner og repo (B64):** nyhederne har en reserve for hver af de to daglige kørsler
  (08:37 og 14:37 UTC), som kun skriver, hvis den almindelige kørsel ikke er startet
  (`scripts/ai-news-slot.mjs`). Sidevagten kører tre gange i døgnet (02:23, 10:23, 18:23 UTC)
  og kan i en manuel kørsel pege på en anden adresse. `SECURITY.md` med privat indberetning;
  wikien er slået fra; en test kræver, at hver handling i hver workflow er låst til et commit.
  Set 2026-11-14: den første planlagte nyhedskørsel startede selv kl. 11:43 UTC og lykkedes;
  sidevagten bestod alle 14 kontroller i en kørsel startet i hånden. **Udgivet 2026-11-14**
  (PR #208, Worker `b79c25e4`). Ikke set endnu: en planlagt sidevagtskørsel, en reservekørsel,
  og at en grøn kørsel selv lukker en åben sag (se "Næste skridt").
- **Værktøjer, to mere (B66):** Zigbee-kanalvælger (`/vaerktoejer/zigbee-kanal/`) og
  batterilevetid (`/vaerktoejer/batterilevetid/`) på begge sprog, i den fælles ramme, med
  kilder på siderne. Set i headless Chrome i mørkt og lyst tema ved 320, 375 og 1440 px, med
  tastatur og uden JavaScript. **Udgivet 2026-11-14** (PR #207, Worker `bd23498c`).
- **Gamle adresser (Search Console 2026-11-14):** rapporten viste 24 adresser med 404. 19 blev
  allerede sendt videre; tre fik en regel i `public/_redirects`, og resten af de danske sider
  under de gamle engelske sektionsnavne og de gamle feed-adresser fik det samtidig (21 regler).
  To er ladt være (`docs/seo.md`). **Udgivet 2026-11-14** (PR #211, Worker `4eaa513f`). Set på
  den levende side samme dag: disse syv svarer 301 med den nye adresse:
  `curl -sI https://smartbolig.net/da/legal/affiliate-disclosure/`, `/da/automations/`,
  `/da/about/`, `/da/contact/`, `/da/security/`, `/da/index.xml` og `/en/index.xml`.
- **Startsæt-bygger (B65):** femte værktøj, `/vaerktoejer/startsaet/`, på begge sprog. Fire
  spørgsmål giver et startsæt i tre lag og de første skridt, med købslinks fra registret (11
  dele, 9 produkter) og ingen priser. **Udgivet 2026-11-14** (PR #212, `main` e77b1ca, Worker
  `202ffebc`). Set på den levende side: begge sider svarer 200, alle 384 kombinationer af svar
  giver på hvert sprog det samme som koden, siden virker uden JavaScript, og forsiden viser
  fem værktøjer. Indeksering er anmodet i Search Console. Åbent: registret har ingen produkter
  til computeren til Home Assistant, en aflæser til HAN-porten og ESP32-delene, så de tre
  steder siger sættet "Ingen købsanbefaling endnu".

- **Dokumentationen er afprøvet af læsere uden kendskab til repoet (B68).** Tre friske
  underagenter fik hver én opgave (ny guide på begge sprog, ret en designværdi, fejlsøg dagens
  nyhedskørsler) og kun repoets egne dokumenter. Første runde: alle tre løste opgaven, men
  svarede "delvist" på, om dokumenterne var nok. Det, de snublede over, er rettet i
  `CONTENT-GUIDE.md`, `docs/designsystem.md`, `docs/nyhedsflow.md`, `AGENTS.md` og `README.md`.
  Anden runde med tre nye læsere og nye opgaver af samme slags: guiden "ja"; design og
  nyheder "delvist", begge med ordene "opskriften virker som skrevet" og hver med ét hul
  (en tredje kopi af accentfarven; en kørsel uden tidspunkt i titlen), som også er rettet.
  Tredje runde (design og nyheder): designlæseren fandt en fejl i den nye tabel over
  hjørnetrin og fem kopier mere af den mørke sidefarve; rettet, og testen holder dem nu.
  Fjerde runde (design og nyheder): design "ja"; nyheder "delvist", fordi der manglede en
  opskrift for en manglende udgave og en tabel over lofterne. Begge dele er skrevet ind.
  Ikke kontrolleret: en femte runde efter de sidste rettelser.

## Udgivelser og vej tilbage

De seneste udgivelser, nyeste først. Vejen tilbage fra en udgivelse er Worker-versionen i
rækken under den: `npx wrangler rollback <version> -m "<besked>" -y`. En tilbagerulning
flytter kun Workeren og de statiske filer; `main` er uændret, så den næste udgivelse fra
`main` bringer ændringen tilbage, medmindre den også tages ud af `main`.

| Udgivelse | Pull request | Worker-version |
|---|---|---|
| Assistenten søger først, hver besked alene | #209 | `fd3bd2e3-b4c5-4b4b-9bd6-11f719ada749` |
| Startsæt-bygger | #212 | `202ffebc-da12-4db7-8b7d-865293a6cfd2` |
| Gamle adresser sendes videre | #211 | `4eaa513f-7377-4e9c-97c4-6ac39cac9278` |
| Zigbee-kanalvælger og batterilevetid | #207 | `bd23498c-04ac-40d5-82b0-72b8a8d03689` |
| Tidsplaner, `SECURITY.md`, workflow-regler | #208 | `b79c25e4-4ce0-4c43-b136-83fcbb8e4c72` |
| Assistenten skriver svaret, mens læseren ser på | #206 | `234155f6-5826-4a53-bfb4-369c44e26f7e` |

Nyhedsflowet udgiver selv hver dag gennem samme workflow, så den levende version kan være
nyere end tabellens øverste række. Se den aktuelle med `npx wrangler deployments list`.

## Åbent

Det, der ikke er gjort. Det, kun ejeren kan gøre, står i [TIL-EJEREN.md](TIL-EJEREN.md).

- **Tegninger i guidernes tekst:** 23 af 86 danske guides har en tegning eller et billede i
  teksten (alle har topbilledet af 3D-huset). Uden: Home Assistant 22, produkter 25, AI-CLI 9,
  automationer 4, ESP32 2, sikkerhed 1. Talt 2026-11-14 med et skript, der leder efter et
  billede i brødteksten. Reglerne for nye tegninger står i `docs/billeder.md` ("Diagrammer");
  en tegning skal holdes op mod guidens tekst og kode af en anden end den, der tegnede den.
- **Guide, der mangler:** Companion App på telefonen (installation, sensorer, placering).
  `home-assistant/mobilnotifikationer` dækker kun beskedgrupper. De to andre emner fra den
  gamle planfil er dækket: fjernadgang med Home Assistant Cloud står i `sikkerhed/fjernadgang`,
  og backup til et sted uden for huset i `home-assistant/backup-sikkerhed`.
- **Strukturerede produktdata:** produktsiderne har ikke `Product` i deres strukturerede data.
  Fravalgt for nu: uden pris, lagerstatus eller anmeldelser giver de ingen udvidet visning, og
  siden viser ingen priser (B65). Tages op igen, hvis registret får priser.
- **Startsættet:** registret har ingen produkter til computeren til Home Assistant, en aflæser
  til HAN-porten og ESP32-delene (B65).
- **Den strenge CSP:** sendes kun som rapport. Den slås til, når samtykkebeskeden er udgivet
  (TIL-EJEREN punkt 1) og den levende side er set uden overtrædelser med annoncer
  (`docs/sikkerhed.md`, "Den strenge politik").
- **Assistentens tid til første ord:** ca. 20 s for et spørgsmål og 32 s for en opfølgning
  (modellens tænketid; opfølgningen er målt én gang). Står på listen til ejeren, fordi en
  hurtigere model koster.
- **`allowScripts` i `package.json`** nævner `sharp@0.34.5`, mens låsefilen har en nyere
  version. npm 11 viser ingen brug af linjen ved installation; den er ladt stå.
- **Fire pull requests fra Dependabot står åbne med vilje:** #189, #190 og #191 (ny hovedversion
  af tre GitHub Actions) og #193 (Starlight 0.42, som fjerner den mobilmenu-knap, sidens
  stylesheet og assistentknap bygger på). De flettes ikke af sig selv (`docs/opdateringer.md`).
- **Ikke set køre endnu:** en planlagt sidevagtskørsel, en reservekørsel for nyhederne, og at
  en grøn sidevagtskørsel selv lukker en åben sag.

## Næste skridt

1. Følg nyhedsdriften tre dage i træk fra 2026-11-15: en planlagt kørsel (04:37 eller 11:37
   UTC, reserver 08:37 og 14:37) skal have skrevet og udgivet dagens udgave uden hjælp. Se
   kørslerne med `gh run list --workflow ai-news.yml`; fejlsøgning står i `docs/nyhedsflow.md`.
2. Se den første planlagte sidevagtskørsel (02:23, 10:23 eller 18:23 UTC) i Actions.
3. Mål siden igen (Lighthouse, Core Web Vitals, sikkerhedshoveder) efter samme fremgangsmåde
   som før-målingen i `docs/measurements/2026-11-13-baseline/README.md`, og læg tallene ved
   siden af.
4. Tegninger til de guides, der mangler en (se "Åbent"), og guiden om Companion App.
5. Når ejeren har udgivet samtykkebeskeden: se forløbene ja og nej på den levende side, og
   slå den strenge CSP til.

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
    `public/images/produkter/`, `public/images/logo-email.png`): tjek ekstern brug, før de
    slettes (TIL-EJEREN punkt 7).
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
