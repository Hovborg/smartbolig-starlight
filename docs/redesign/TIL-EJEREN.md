# Til ejeren

Ting, som kræver dig: en beslutning, et login eller betaling. Alt andet arbejdes der videre med.

Sidst opdateret: 2026-11-14.

## Kræver dit login

1. **Udgiv samtykkebeskeden i Google AdSense (vigtigst).** Der er ingen udgivet besked for
   smartbolig.net (set 2026-11-14). Siden spørger med den besked, før noget hentes fra Google
   (`docs/samtykke.md`). **Indtil den er udgivet, hentes hverken Google Analytics eller
   annoncer for besøgende i EU/EØS, Storbritannien og Schweiz** (målt fra Danmark): ingen tal
   i Analytics og ingen annonceindtægt. Det er gratis
   og tager omkring ti minutter:
   1. Åbn AdSense → "Privatliv og beskeder" → "Europæiske forordninger" → opret en besked.
   2. Vælg websitet smartbolig.net, sprog dansk og engelsk, og sæt linket til
      privatlivspolitikken til `https://smartbolig.net/da/juridisk/privatlivspolitik/`.
   3. Slå knappen "Giv ikke samtykke" til, så beskeden har tre knapper: "Giv samtykke",
      "Giv ikke samtykke" og "Administrer valgmuligheder". Uden nej-knappen er et ja ikke frivilligt.
   4. Vælg, hvem der spørges: kun EU/EØS, Storbritannien og Schweiz (Googles standard), eller
      alle lande. Med standarden hentes Analytics og annoncer uden spørgsmål i andre lande; de
      juridiske sider siger det. "Alle lande" er det forsigtige valg for en dansk side; hvad
      der kræves, er en juridisk vurdering.
   5. Tryk "Udgiv". Åbn derefter smartbolig.net i et privat vindue: beskeden skal komme, og
      "Cookieindstillinger" skal stå nederst på siden, når du har svaret.
   6. Sig ja, tryk "Cookieindstillinger", og sig nej: siden skal indlæses igen uden annoncer.
      Det kan først afprøves med en udgivet besked. Virker det ikke, så skriv det til Claude.

   Tjek samme sted:
   - "Consent mode" er slået til for beskeden (Googles anbefaling). Siden virker i begge
     tilfælde: svaret læses fra TCF, og er "consent mode" slået til, skal begge sige ja.
     Google Analytics tæller kun læsere, der siger ja til formål 1 og 8 ("Gem oplysninger på
     en enhed" og "Mål indholdets effektivitet"); knappen "Giv samtykke" siger ja til alle.
   - Vælg, om læsere, der siger nej, må få "begrænsede annoncer" (uden cookies). Siden henter
     i dag ingen annoncer efter et nej.
   - Annoncer: automatiske annoncer er til eller fra efter dit valg.
   - Fast annonceplads: siden har én plads under hver guide og nyhed, men den er slukket, til
     den får et nummer. Opret en annonceenhed (Annoncer → Efter annonceenhed → Displayannonce,
     responsiv), og giv Claude tallet efter `data-ad-slot=`, eller skriv det selv i
     `src/data/ad-slots.mjs` (`docs/indtjening.md`).
   **Google Analytics, klik på reklamelinks:** opret to tilpassede dimensioner (Administrator
   → Datavisning → Tilpassede definitioner → Opret tilpasset dimension, omfang "Hændelse") med
   hændelsesparametrene `product` og `store`. Så viser rapporterne, hvilke produkter læserne
   trykker på (hændelsen hedder `affiliate_click`). Gør det med det samme: dimensionerne
   virker ikke bagud, så tryk før oprettelsen tælles uden produktnavn. Menunavnene er ikke
   set i din konto.
   **Google Analytics:** tjek, at dataopbevaring står til 14 måneder (det står i
   privatlivspolitikken), og at Google-signaler er slået fra, hvis du ikke vil have dem.
2. **Partner-Ads.** Ikke logget ind. Flere Proshop-links åbner et forkert produkt (liste i
   `docs/redesign/guide-review/produkter.md`); de rigtige links skal hentes i Partner-Ads.
   Hent samtidig links til de tre ting, startsættet (`/da/vaerktoejer/startsaet/`) ikke har et
   produkt til: en lille computer til Home Assistant, en aflæser til elmålerens HAN-port og
   ESP32-dele (kort, LED-strip, bevægelsessensor, temperatursensor). Indtil da skriver sættet
   "Ingen købsanbefaling endnu" de steder. Sådan tilføjes et produkt: `docs/indtjening.md`.
3. **Mail fra domænet (DKIM og DMARC).** Domænet har SPF, men ingen DKIM-signatur, og DMARC
   står til kun at overvåge (`p=none`). Det betyder, at mail fra `@smartbolig.net` lettere
   havner i spam, og at andre lettere kan udgive sig for domænet. Gratis, ca. ti minutter:
   1. Google Admin → Apps → Google Workspace → Gmail → "Godkend e-mail" → vælg
      `smartbolig.net` → "Generér ny post" (2048 bit).
   2. Giv Claude værdien (den er offentlig, ikke en hemmelighed), eller opret den selv i
      Cloudflare → DNS som TXT-post med navnet `google._domainkey`.
   3. Tryk "Start godkendelse" i Google Admin, når posten findes.
   4. Efter en uge uden fejl i DMARC-rapporterne: sig til, så ændres `_dmarc` til
      `p=quarantine`.
   Menunavnene er ikke set i din konto. Status i dag: `docs/drift.md`, "DNS og mail".

## Kræver din beslutning

4. **Juridiske sider.** Cookiepolitik, privatlivspolitik, brugsvilkår og "Om os" er skrevet
   om, så de passer med det, siden gør (Ezoic og nyhedsbrev er ude, samtykke først er
   beskrevet). Tre ting kan kun du afgøre:
   - Den dataansvarliges fulde navn, CVR-nummer (hvis du har et) og adresse mangler i
     privatlivspolitikken. Uden dem opfylder den ikke oplysningspligten helt.
   - Sætningen om overførsel til USA (EU-U.S. Data Privacy Framework og standardkontrakter) er
     den almindelige for Google og Cloudflare, men er ikke set efter af en jurist.
   - Partner-Ads: om deres vilkår kræver en bestemt ordlyd ved reklamelinks, er ikke læst bag
     login. Siden skriver "reklamelink" ved hvert link.
5. **Licens for koden.** Repoet er offentligt, men har ingen licensfil. Uden en licens må
   andre læse koden, men ikke genbruge den. Det er et fint valg for en side, der tjener penge
   på sit indhold. Vil du give koden fri (fx MIT), og holde teksterne og billederne for dig
   selv, så sig til.
6. **Henvisning til elaftaler ved elprisværktøjet.** Værktøjet viser elprisen lige nu, og
   en læser dér er tæt på at vælge elselskab. En henvisning kræver et godkendt program hos
   Partner-Ads eller et elselskab. Intet er bygget (`docs/indtjening.md`).
7. **Gamle filer på siden og en gammel DNS-post.** `public/logo-animated.gif` (75 KB) og
   de 22 billeder i `public/images/produkter/` (2,9 MB) bruges ikke af siden, men kan være
   brugt udefra (mailsignatur, gamle indlæg). TXT-posten `ezoic-domain-verification` er fra
   Ezoic, som ikke bruges mere. Sig "slet dem", så bliver det gjort.

## Oprettet for dig

8. **Bing Webmaster Tools.** Oprettet 2026-11-14 med din Google-konto (kun navn og
   mailadresse deles med Microsoft). Siden er bekræftet, sitemap er sendt ind, og Bing får
   besked om ændrede sider ved hver udgivelse. Du skal ikke gøre noget. Hvordan det fjernes
   igen: `docs/drift.md`.

## Koster penge, hvis du vil

9. **Bedre nyhedstekster med Claude.** Workflowet kan bruge en Claude-nøgle i stedet for de
   gratis modeller. Ikke nødvendigt for drift.
10. **Cloudflare AI Search** fakturerer fra 2026-12-01 ud over 1.000 forespørgsler pr. måned.
   Assistenten bruger den ikke længere (den søger i sidens eget indeks). Instansen
   `smartbolig-ai-search` findes stadig i din Cloudflare-konto. Den koster ikke noget, når
   ingen spørger den, men den kan slettes: Cloudflare → AI → AI Search. Sletning kan ikke fortrydes.

## Kendte grænser

11. **OpenAI-nyheder.** OpenAI's artikelsider svarer 403 til robotter. Kun korte resuméer kan
   hentes, og de er for tynde til faktatjekket. Det omgås ikke.

12. **Store opdateringer flettes ikke af sig selv.** Små opdateringer af pakker kommer på
   siden uden dig. Disse bliver liggende som åbne pull requests, til nogen ser på dem: en ny
   hovedversion af en pakke, et nyt midterste tal for `@astrojs/starlight`, `three`, `sharp`
   og `esbuild` (fx 0.41 til 0.42), og opdateringer af GitHub Actions. Siden virker uden dem.
   Den første, du vil se, er Starlight 0.42: den kræver en ændring af mobilmenuen først.
   Så længe den ligger åben, får Starlight heller ingen små rettelser (sikkerhedsrettelser
   kommer stadig). Fremgangsmåde: `docs/opdateringer.md`.

13. **Assistenten er langsom til det første ord.** Der går omkring 19 sekunder, før svaret
   begynder (målt 2026-11-14). Det er den gratis models tænketid, ikke siden. Imens viser
   assistenten, hvilke sider den har fundet. En hurtigere model koster penge pr. spørgsmål
   og er ikke valgt. Tal og grænser: `docs/assistent.md`.

## Rester fra den gamle nyhedskørsel

14. **Gamle filer fra den tidligere kørsel.** Den efterlod kørselsmapper og en launcher uden
   for repoet. De bruges ikke længere, og opgaven er slået fra. Sig til, hvis de skal slettes.

## Prøv selv

15. **3D-huset er ikke set på en iPhone, en iPad eller i Firefox.** Det er afprøvet i Chrome
   med og uden grafikkort. Åbn forsiden på din telefon og i Safari på en Mac: huset skal
   blive levende efter et øjeblik og kunne drejes. Bliver billedet stående, virker siden
   stadig; skriv det til mig, så ser jeg på det.

## Kun hvis det bliver nødvendigt

16. **Start af nyhedskørslen udefra.** GitHub starter de planlagte kørsler selv (set
    2026-11-14), og hver af de to daglige kørsler har en reserve nogle timer senere. Holder
    GitHub alligevel op med at starte dem i flere dage, kan en gratis tjeneste uden for
    GitHub starte workflowet. Det kræver et GitHub-token, som kun du kan oprette. Gør intet,
    før sidevagten åbner en sag om, at nyeste udgave er for gammel (`docs/overvaagning.md`).
