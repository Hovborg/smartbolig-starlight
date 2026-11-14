# Beslutningslog for redesignet

Nyeste nederst. Hver post: valg, begrundelse, og hvordan det er kontrolleret.

## 2026-11-13

### B1. Starlight beholdes til guides; forside, oversigter og værktøjer bliver egne Astro-sider
- Begrundelse: 320 MDX-sider bruger Starlights komponenter, i18n, sidebar, indholdsfortegnelse og
  Pagefind. Det er velafprøvet og tilgængeligt. Forside, oversigter og værktøjer har brug for frit
  layout, som Starlights sideramme modarbejder.
- Konsekvens: `starlight-theme-galaxy` fjernes. Udseendet styres af egne tokens i `src/styles/tokens/`.

### B2. Tema følger enheden; mørk er ikke længere tvunget standard (erstattet af B29)
- Tidligere valg: mørk som standard for nye besøgende.
- Nyt valg: `prefers-color-scheme` bestemmer første visning; brugerens valg gemmes.
- Begrundelse: opgaven beder om et lyst, luftigt udtryk med begge temaer.

### B3. 3D bygges som isometrisk SVG ved build; WebGL kun hvor læseren selv styrer
- Begrundelse: three.js vejer ca. 192 kB gzip. Udgangspunktet er Lighthouse 96–100 på mobil.
  Isometrisk SVG koster ingen JavaScript, kan læses af søgemaskiner og virker på alle enheder.
- WebGL (three.js, MIT) indlæses først, når læseren åbner det interaktive hus, og kun på
  enheder der kan køre det. Ellers vises SVG-udgaven.

### B4. Animationer: CSS scroll-animationer og View Transitions; ingen GSAP
- Begrundelse: 0 kB, ingen afhængighed. GSAP's licens er proprietær og kan opsiges.
- `prefers-reduced-motion` respekteres, og der er en synlig pauseknap (WCAG 2.2.2).

### B5. Nyhedsflowet flyttes til GitHub Actions og udgiver selv
- Begrundelse: de tre seneste fejlklasser skyldes alle værten (login, Windows-konto, lokal npm).
- Ejeren har besluttet, at nyheder må udgives uden godkendelse, når kontrollerne er bestået.
- En dag uden godkendt udkast er en vellykket kørsel uden udgivelse.

### B6. Tekstkontrollen gøres træfsikker pr. historie i stedet for pr. udgave
- Målt: af 19 afvisninger indeholdt ca. 12 mindst én reel fejl; 7 var overstrenge eller skyldtes,
  at kontrollen manglede udgivelsesdatoen, som skribenten fik.
- Ændring: hver historie kontrolleres for sig, en fejl giver rettelse af netop den historie, og en
  historie der ikke kan rettes udelades. Kildekrav, kildesikkerhed og dubletkontrol er uændrede.

### B7. Afhængighedskontrol blokerer kun, når afhængigheder ændres
- Begrundelse: en ny advarsel om en uændret pakke stoppede nyhederne i 25 dage. Tekstændringer gør
  ikke en kendt svaghed værre.
- Ændring: fuld `npm audit` er port for ændringer i `package-lock.json` og kører dagligt som
  overvågning. Automatiske opdateringer flettes selv, når CI består.

### B8. Cloudflare AI Search udfases som kilde til assistenten
- Begrundelse: AI Search fakturerer fra 2026-12-01 ud over 1.000 forespørgsler pr. måned.
  Kravet er ingen udgifter.
- Ændring: assistenten søger i et indeks over sidens egne guides, som bygges sammen med siden.

### B9. Åbne pull requests
- #170 og #169: rettelser til Windows-runneren, som pensioneres i fase 1. Lukkes som afløst.
- #166 og #165: to udkast til samme dato (2026-10-02). #166 er den nyeste. Afgøres i fase 1, når
  den nye kvalitetskontrol kan køres på udkastet.
- #147: kladde fra 2026-08-19 med konflikt. Lukkes som forældet.

### B10. Open source vælges efter licens, vægt og vedligehold
- Se `docs/open-source.md` for version og licens for hvert projekt.
- Fravalgt: GSAP (licens), transformers.js og Monaco i browseren (vægt), kopiering fra Home
  Assistants dokumentation (CC BY-NC-SA) og `home-assistant/brands` (ingen licens).

### B11. Modellerne kører på Cloudflare Workers AI gennem et privat relay
- GitHub Models, som var planen, er lukket af GitHub (2026-07-30). GitHub Actions kan ikke kalde
  Workers AI uden et kontotoken, så en lille Worker (`workers/news-llm/`) står imellem.
- Relayet har nøgle, liste over tilladte modeller, loft pr. minut og et dagsloft.

### B12. Modelvalg efter måling, ikke efter navn
- Skriver: `deepseek-v4.1-flash`, reserve `gemma-4-26b`. Kontrol: `gpt-oss-120b`, reserve
  `nemotron-3-120b`. Målingerne står i `docs/nyhedsflow.md`.
- Skriver og kontrol er to forskellige modeller i standardlisterne. Det er ikke tvunget:
  sættes en liste om, kan rollerne ende på samme model (se `docs/nyhedsflow.md`).

### B13. Hårdt dagsloft på 8.000 neurons
- Fund 2026-11-13: forbrug over 10.000 neurons pr. døgn koster penge hos Cloudflare, og
  modelmålingerne den dag gik over den grænse. Derfor et loft, der ikke kan omgås.
- Ændring: relayet afviser kald, når dagens forbrug når 8.000 (chatten har resten). Kan tælleren
  ikke læses, afvises kaldet. En kørsel stopper selv ved 6.000.

### B14. Kildeteksten skæres fra `<article>`/`<main>`
- Målt: de første ca. 2.500 tegn af den tekst, modellerne fik, var sidens navigation. Det forklarer
  en del af de gamle afvisninger som "ikke dækket af kilden".
- Nye officielle kilder: Google DeepMind, Mistral, Home Assistant-bloggen og Ollama.

### B15. Ét udgivelsesforløb
- Nyhedsworkflowet kalder `deploy.yml` i stedet for at udgive selv. Samme kontroller, ét sted.
- En fejlet dag gør ikke workflowet rødt; kun tre dage uden udgivelse giver en GitHub-sag.

### B16. Afhængigheder: kontrol mod seneste vellykkede udgivelse, og tre døgns karenstid
- Kontrollen sammenligner med det seneste commit, der blev udgivet uden fejl (PR #171).
- Nye pakkeversioner tages først i brug, når de er tre døgn gamle. Astro og Starlight blev derfor
  på de afprøvede versioner.

### B17. Vejen tilbage er afprøvet
- 2026-11-13: `npx wrangler rollback <version>` til forrige version og frem igen på
  produktionssiden; siden svarede 200 begge gange. Fremgangsmåden beskrives i `docs/udgivelse.md`
  (fase 7).

### B18. Arkivværktøjet `ai-news-regenerate.mjs` er fjernet
- Det var et engangsværktøj fra juli 2026 og brugte det gamle tekstmodul.

### B19. Relayets dagsloft: reservation før kaldet, talt ét sted
- Fund i gennemgangen: det gamle loft læste tælleren, kaldte modellen og skrev bagefter. Et afbrudt
  kald og to samtidige kald blev ikke talt, og forbruget byggede på et felt (`usage.neurons`), som
  Cloudflare ikke dokumenterer.
- Valg: regnskabet ligger i ét Durable Object, som behandler én forespørgsel ad gangen. Relayet
  bogfører kaldets højeste mulige pris før modelkaldet og retter til den rigtige pris bagefter.
  Prisen regnes fra de meldte tokens gange Cloudflares pris pr. model (`workers/news-llm/src/prices.js`).
- Fravalgt: KV (ingen atomar læs-og-skriv) og en fast reserve pr. kald (for lav for store kald).
- Durable Objects med SQLite-lager er med i Workers-planen; forbruget her er omkring 100 kald i døgnet.

## 2026-11-14

### B20. Egne designværdier (`--sb-*`); Galaxy-temaet og Tailwind er fjernet
- Valg: alle farver, størrelser, hjørner, skygger og bevægelse står i `src/styles/tokens/`.
  `src/styles/starlight/bridge.css` oversætter dem til Starlights variabler.
- Begrundelse: Galaxy-temaet tvang et mørkt, tæt udtryk og lagde sine egne farver oven på vores.
  Tailwind blev kun brugt af det tema. Ét sæt værdier gør et lyst og et mørkt tema muligt
  uden dobbelt arbejde.
- Kontrolleret ved: `scripts/site-design-tokens.test.mjs` måler kontrasten for hvert
  tekst/baggrund-par i begge temaer; en test afviser farvekoder uden for token-filen.

### B21. Skrifttyper ligger på eget domæne; intet hentes fra en CDN
- Valg: Figtree (brødtekst) og Bricolage Grotesque (overskrifter), begge OFL-1.1, pakket med
  siden gennem Astros skriftfunktion (`config/fonts.mjs`).
- Begrundelse: ingen forespørgsel til tredjepart (privatliv, CSP), og siden virker, selv om en
  CDN er nede. Variable skrifter giver alle vægte i én fil pr. skrift.

### B22. Forsiden er fortsat en Starlight-side, men med egne komponenter
- Ændrer B1 for forsiden: den er en Starlight "splash"-side (`index.mdx`), som kun indeholder
  `<HomeStyles />` og `<HomePortal />`. Topbjælke, sprogvalg, søgning, `<head>` og
  struktureret data kommer derfor fra samme sted som resten af siden.
- Begrundelse: en helt egen side skulle gentage `<head>`, sprogskift og søgning. Det er to steder
  at vedligeholde for samme resultat. Layoutet er frit inde i `HomePortal`.

### B23. Forsidens hus er ren CSS, ikke 3D
- Valg: "Et hus gennem et døgn" er en SVG, der styres af fire radioknapper, `:has()` og
  CSS-variabler. Der er ingen JavaScript i den.
- Begrundelse: den forklarer, hvad en automation gør (tid → regel → lys, varme, energi, lås),
  virker med tastatur og skærmlæser, og koster 0 kB script. Uden `:has()` vises aftenen,
  og vælgeren skjules. Rigtig 3D er forbeholdt det interaktive hus (B3).
- Kontrolleret i browser: fire tilstande, lyst og mørkt, 375 og 1440 px.

### B24. Knappen til at starte og standse bevægelse står i husets fod
- Valg: knappen er en del af illustrationen, ikke en flydende pille.
- Begrundelse: som flydende pille lå den oven på AI-assistentens knap på telefon. Siden følger
  enhedens indstilling for bevægelse; knappen lader læseren vælge selv (WCAG 2.2.2).

### B25. Reklamelinks er en blød brik, ikke en udfyldt knap
- Fund: Starlights linkfarve vandt over komponentens egen, så teksten på den udfyldte knap ikke
  kunne læses (blå på blå).
- Valg: lys baggrund i butikkens farvetone, tekst i samme tone, og mærkatet "Reklamelink" i
  dæmpet tekst. Brikken fylder mindre i tabeller og kan ikke forveksles med sidens egne knapper.

### B26. AI-assistenten flyttes til slutningen af `<body>`, når den starter
- Fund: sidefoden ligger i Starlights hovedspalte, som er sit eget lag. På brede skærme lå
  indholdsfortegnelsen derfor oven på assistenten, og knappen kunne ikke klikkes.
- Valg: scriptet flytter assistenten ud af spalten (én linje i `src/scripts/assistant/index.ts`).
  Fravalgt: at overskrive Starlights sideramme (skal følges ved hver opgradering) og at fjerne
  spaltens lag (det beskytter indholdsfortegnelsen mod indhold med egne lag).
- Kontrolleret i browser med rigtigt museklik, 1440 px, lyst og mørkt.

### B27. Kodeblokke bruger Expressive Codes standardtemaer
- Valg: ingen egne syntaksfarver. Rammen (hjørner, kant, skrift) følger vores værdier.
- Begrundelse: standardtemaerne er kontrastprøvede og følger med ved opgradering.

### B29. Mørkt tema er standard; lyst vælges til
- Ejerens beslutning 2026-11-14. Erstatter B2.
- Valg: alle nye besøgende ser mørkt tema, uanset enhedens indstilling. Lyst tema vælges med
  temavælgeren og huskes. Siderne leveres med `data-theme="dark"`, så det også gælder uden
  JavaScript. Browserens temafarve følger det aktive tema.
- Konsekvens: begge temaer vedligeholdes fuldt ud. Kontrasttesten i
  `scripts/site-design-tokens.test.mjs` dækker fortsat begge.
- Kontrolleret: `scripts/site-ui.test.mjs` (standard, gemt valg, blokeret lager, temafarve) og
  i browser på forside, guide og 404.
