# Til ejeren

Ting, som kræver dig: en beslutning, et login eller betaling. Alt andet arbejdes der videre med.

Sidst opdateret: 2026-11-14.

## Kræver dit login

1. **Udgiv samtykkebeskeden i Google AdSense (vigtigst).** Der er ingen udgivet besked for
   smartbolig.net (set 2026-11-14). Siden spørger med den besked, før noget hentes fra Google
   (`docs/samtykke.md`). **Indtil den er udgivet, hentes hverken Google Analytics eller
   annoncer for nogen besøgende**: ingen tal i Analytics og ingen annonceindtægt. Det er gratis
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

   Tjek samme sted:
   - "Consent mode" er slået til for beskeden. Er den ikke det, virker siden stadig (svaret
     læses fra TCF), men Google Analytics får kun et ja fra læsere, der også siger ja til
     formål 1 og 8.
   - Vælg, om læsere, der siger nej, må få "begrænsede annoncer" (uden cookies). Siden henter
     i dag ingen annoncer efter et nej.
   - Annoncer: automatiske annoncer er til eller fra efter dit valg, og annonceenhederne findes.
     Siden har endnu ingen faste annoncepladser i guiderne.
   **Google Analytics:** tjek, at dataopbevaring står til 14 måneder (det står i
   privatlivspolitikken), og at Google-signaler er slået fra, hvis du ikke vil have dem.
2. **Partner-Ads.** Ikke logget ind. Flere Proshop-links åbner et forkert produkt (liste i
   `docs/redesign/guide-review/produkter.md`); de rigtige links skal hentes i Partner-Ads.

## Kræver din beslutning

3. **Juridiske sider.** Cookiepolitik, privatlivspolitik, brugsvilkår og "Om os" er skrevet
   om, så de passer med det, siden gør (Ezoic og nyhedsbrev er ude, samtykke først er
   beskrevet). Tre ting kan kun du afgøre:
   - Den dataansvarliges fulde navn, CVR-nummer (hvis du har et) og adresse mangler i
     privatlivspolitikken. Uden dem opfylder den ikke oplysningspligten helt.
   - Sætningen om overførsel til USA (EU-U.S. Data Privacy Framework og standardkontrakter) er
     den almindelige for Google og Cloudflare, men er ikke set efter af en jurist.
   - Partner-Ads: om deres vilkår kræver en bestemt ordlyd ved reklamelinks, er ikke læst bag
     login. Siden skriver "reklamelink" ved hvert link.

## Koster penge, hvis du vil

4. **Bedre nyhedstekster med Claude.** Workflowet kan bruge en Claude-nøgle i stedet for de
   gratis modeller. Ikke nødvendigt for drift.
5. **Cloudflare AI Search** fakturerer fra 2026-12-01 ud over 1.000 forespørgsler pr. måned.
   Assistenten bruger den ikke længere (den søger i sidens eget indeks). Instansen
   `smartbolig-ai-search` findes stadig i din Cloudflare-konto. Den koster ikke noget, når
   ingen spørger den, men den kan slettes: Cloudflare → AI → AI Search. Sletning kan ikke fortrydes.

## Kendte grænser

6. **OpenAI-nyheder.** OpenAI's artikelsider svarer 403 til robotter. Kun korte resuméer kan
   hentes, og de er for tynde til faktatjekket. Det omgås ikke.

7. **Store opdateringer flettes ikke af sig selv.** Små opdateringer af pakker kommer på
   siden uden dig. Disse bliver liggende som åbne pull requests, til nogen ser på dem: en ny
   hovedversion af en pakke, et nyt midterste tal for `@astrojs/starlight`, `three`, `sharp`
   og `esbuild` (fx 0.41 til 0.42), og opdateringer af GitHub Actions. Siden virker uden dem.
   Den første, du vil se, er Starlight 0.42: den kræver en ændring af mobilmenuen først.
   Så længe den ligger åben, får Starlight heller ingen små rettelser (sikkerhedsrettelser
   kommer stadig). Fremgangsmåde: `docs/opdateringer.md`.

## Rester fra den gamle nyhedskørsel

8. **Gamle filer fra den tidligere kørsel.** Den efterlod kørselsmapper og en launcher uden
   for repoet. De bruges ikke længere, og opgaven er slået fra. Sig til, hvis de skal slettes.
