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

### B28. Værtskørslerne for nyheden er fjernet
- Fjernet: Windows-opgaven, systemd-timeren og OpenClaw-jobbet med installationsscripts,
  fejlmelder, forældelsestjek i shell, PR-identitetshjælperen, hjælperen til gentagne forsøg,
  hjælperen til offentlig kontrol efter udgivelse og deres tests. Desuden det valgfri
  ComfyUI-billedspor (vagten for GPU-køen lå i det fjernede shell-script), det ubrugte
  `scripts/indexnow-ping.sh` (`deploy.yml` sender selv til IndexNow) og et forældet researchnotat.
- Begrundelse: ét udgivelsesforløb (B5, B15). De tre seneste fejlklasser var alle værtsfejl.
  Ældre kørsler ved siden af workflowet kan udgive det samme to gange.
- Bevaret: workflowtestene (ét flyttet til `scripts/ai-news-workflow.test.mjs`),
  `ai-news-staleness.mjs` og alle kontroller, som workflowet bruger. Nyhedsbilledet er altid
  den tegnede illustration.
- Pris: det fjernede forældelsestjek læste den udgivne side uafhængigt af workflowet, og den
  fjernede efterkontrol så begge sprog og begge oversigter efter. Workflowets `watch`-job
  dækker kun, at der mangler udgaver i repoet. En uafhængig sidevagt bygges i fase 6.
- Kontrolleret 2026-11-14: første rigtige kørsel i GitHub Actions udgav dagens nyhed;
  Windows-opgaven er slået fra.

### B29. Mørkt tema er standard; lyst vælges til
- Ejerens beslutning 2026-11-14. Erstatter B2.
- Valg: alle nye besøgende ser mørkt tema, uanset enhedens indstilling. Lyst tema vælges med
  temavælgeren og huskes. Siderne leveres med `data-theme="dark"`, så det også gælder uden
  JavaScript. Browserens temafarve følger det aktive tema.
- Konsekvens: begge temaer vedligeholdes fuldt ud. Kontrasttesten i
  `scripts/site-design-tokens.test.mjs` dækker fortsat begge.
- Kontrolleret: `scripts/site-ui.test.mjs` (standard, gemt valg, blokeret lager, temafarve) og
  i browser på forside, guide og 404.

### B30. Forsidens hus er en rigtig 3D-model. Erstatter B23
- Ejerens krav 2026-11-14: forsiden skal have wow-effekt, grafikken skal være i høj kvalitet,
  og huset skal se virkeligt ud, ikke som en tegnefilm.
- Valg: et gennemskåret hus bygget i three.js 0.187.0 (MIT) af egne dele i `src/lib/house3d/`:
  vægge, møbler, enheder, have, solceller og elbil. Materialerne er fysisk baserede med egne
  tegnede teksturer, lyset er sol, himmel og lamper, og billedet efterbehandles (kontaktskygger,
  glød, tonekurve). Ingen købte eller hentede 3D-modeller, teksturer eller billeder.
- Fravalgt: færdige modeller fra modelbiblioteker (licens og stil kan ikke styres, og filerne
  er store) og en forudindspillet video (kan ikke drejes eller følge teksten).
- Kontrolleret i browser: fire tidspunkter, 375 og 1440 px, mørkt og lyst tema.

### B31. Huset vises først som billede; modellen hentes bagefter
- Valg: `HomeStage.astro` viser et stillbillede af aftenen (AVIF/WebP, tre bredder). Det er
  sidens største billede og hentes med høj prioritet. three.js ligger i sit eget stykke kode
  og hentes først, når siden er færdig: på computer i en ledig stund efter indlæsning, på
  telefon efter første berøring eller rul, og med Datasparer kun når læseren rører huset.
- Billedet tegnes af den samme model (`npm run house:posters`), så skiftet til den levende
  model ikke kan ses.
- To kvaliteter: "høj" (efterbehandling, skygger i 2048 px) på brede skærme med mus, "lav"
  (direkte tegning, 1024 px, højst 1,5 gange opløsning) på telefoner.
- Reserve: uden WebGL eller JavaScript bliver billedet stående, og knapper til tidspunkt og
  drejning er skjult. Kontrolleret i browser ved at slå WebGL fra.
- En test i `scripts/site-quality.test.mjs` afviser, at three.js importeres direkte fra forsiden.

### B32. Skærmen bag huset er mørk i begge temaer
- Valg: `--sb-stage` har samme værdi i lyst og mørkt tema. I mørkt tema er skærmen uden kant;
  i lyst tema er den et mørkt kort.
- Begrundelse: lyset fra lamper, skærme og solnedgang kan kun ses på mørk baggrund, og ét
  stillbillede passer til begge temaer.
- Tidspunktets farve (`--sb-time-*`) tegnes inde i 3D-scenen som en dis bag huset, der toner
  ud til skærmens farve i alle kanter. Som CSS-lag oven på lærredet kunne kanten ses.

### B33. Forsiden fortæller "Et døgn i et smart hjem"
- Valg: under overskriften følger fire kapitler (07:00 varme, 12:00 energi, 19:30 lys,
  23:00 sikkerhed). Når et kapitel når midten af vinduet, skifter huset tidspunkt, og kameraet
  flyver hen til det, kapitlet handler om. På telefon bliver huset stående øverst, mens
  teksten ruller under det. Hvert kapitel linker til de guides, der viser, hvordan det bygges.
- På introen går døgnet af sig selv hvert 9. sekund, indtil læseren selv vælger et tidspunkt.
  Det sker kun, når bevægelse er slået til.
- Begrundelse: det viser, hvad et smart hjem gør, før læseren skal vælge en guide.
- En test kontrollerer, at kapitler, markører og kameraer passer sammen i begge sprog, og at
  alle forsidens interne links fører til en side, der findes.

### B34. Start/pause-knappen står øverst på husets skærm. Erstatter B24
- Valg: en ikonknap i skærmens øverste hjørne; teksten er bevaret til skærmlæsere. På telefon
  vises kun start/pause, ikke "følg enheden".
- Med bevægelse slået fra flyver kameraet ikke: billedet skifter i ét trin.

### B35. Heroens emnemarkører og nyhedslink er fjernet; søgefelt er tilføjet
- Valg: heroen har én primær knap, ét tekstlink, et søgefelt med tre forslag og huset.
  Markørerne på huset og kapitlerne viser emnerne; nyhederne har deres egen sektion.
- Søgefeltet åbner sidens søgning (Pagefind) og er skjult uden JavaScript.

### B36. Brandfiler og temafarve følger farveværdierne
- Fund: `scripts/lib/brand/palette.mjs`, `config/head/icons.mjs` og `public/site.webmanifest`
  havde de gamle farver efter farveskiftet. `scripts/site-brand.test.mjs` fangede det.
- Valg: værdierne er rettet, og `npm run brand:build` er kørt igen (favicon, ikoner, logoer,
  delebillede).

### B37. Emnekortene viser billeder fra 3D-huset. Stregtegningerne er fjernet
- Valg: de fem emner under rundturen er billedkort. Hvert billede er tegnet af 3D-huset med
  sit eget kamera (stuen med dashboardet til Home Assistant, huset set ovenfra om natten til
  AI). Det første kort er stort; de fire andre står to og to. Teksten ligger på en mørk toning
  nederst i kortet.
- Begrundelse: ejeren bad om grafik i høj kvalitet og realistisk 3D. De animerede SVG-scener
  lignede en anden side end huset og er fjernet sammen med deres bevægelsesregler.
- Kortene er mørke i begge temaer af samme grund som husets skærm (B32).
- Kendt mangel: ESP32-kortet viser huset, ikke en ESP32. Et nærbillede af et kredsløbskort
  kommer med illustrationerne til guiderne (fase 3).

### B38. Rækkefølgen under rundturen: emner, tre etaper, udvalgte guides, nyheder
- Valg: emnevælger, feltguide, udvalgte guides, AI-nyheder, troværdighed, afslutning.
  Nyhederne stod før øverst.
- Begrundelse: den, der lige har set, hvad et smart hjem kan, skal først vælge retning.
  Nyhederne er til den, der kommer igen, og har deres egen side og RSS.
- Testen "the portal keeps its sections in a fixed order" følger den nye rækkefølge.

### B39. Stillbilleder beskrives ét sted, og et billede kan have sit eget kamera
- Valg: `PICTURES` i `scripts/house-posters.mjs` er den eneste liste over billeder af huset.
  `engine.mjs` tager nu imod et kamera som objekt, så et billede ikke kræver et navngivet
  kamera i `modes.mjs`, som kun er til rundturen.
- En test læser listen og kræver, at hver fil findes i hver bredde og bruges af en komponent.

### B40. Billeder i indholdet må ikke få Starlights afstand
- Fund: Starlight giver ethvert element, der følger et andet i indholdet, 1 rem topmargen.
  Et `<img>` efter sine `<source>`-elementer blev derfor skubbet 16 px ned i kortet.
- Valg: én regel i `src/styles/home/layout.css` nulstiller topmargenen for `picture > img`
  på forsiden.

### B41. Hver guide åbner med et billede af 3D-huset, valgt ud fra stien
- Valg: `GuideHead.astro` tegner brødkrumme, titel, dato og et banner (1600 × 640). Tolv
  motiver dækker alle guides; `src/lib/guide-art.mjs` vælger motivet med en regelliste.
- Begrundelse: ejeren bad om illustrationer på alle sider i høj kvalitet. Ét byggesæt giver
  samme udtryk på forside og guides, og en ny guide får et billede uden arbejde.
- En guide med eget billede i toppen beholder det (ellers stod to billeder over hinanden).
  Nyhedsartikler og nyhedsoversigten har deres egne billeder.

### B42. Overskrifter, korttitler og fanenavne vises uden emoji
- Valg: tre små plugins i `config/markdown/` fjerner emoji først i teksten ved bygningen.
  Kildeteksten er uændret.
- Begrundelse: emoji tegnes forskelligt på hver enhed og brød med resten af grafikken.
  Ankre og indholdsfortegnelse bliver rene. Ingen interne links brugte de gamle ankre med
  bindestreg foran (søgt i hele indholdet 2026-11-14).
- Emoji i brødtekst og tabelceller er ikke rørt; de ses igennem med guiderne (fase 3).

### B43. Tabeller fylder spalten og ruller i deres egen ramme
- Fund: `display: block` på tabellen gav en ramme i fuld bredde med en smal tabel i.
- Valg: et rehype-plugin pakker hver tabel i `div.table-scroll` (`role="region"`, kan få
  tastaturfokus). Tabellen er igen en rigtig tabel i fuld bredde.

### B44. Sidemenuen åbner på det emne, læseren står i
- Fund: menuen viste altid Home Assistant øverst og åbent, også på produkt- og nyhedssider.
- Valg: Starlights route-middleware flytter det aktuelle emne øverst og åbner det; de andre
  emner følger lukket. Forrige/næste-links er uændrede.
- Fravalgt: kun at vise det aktuelle emne. Sikkerhed og Juridisk står ikke i topbjælken og
  ville blive svære at finde.

### B45. Sidefod med linkkolonner og YouTube
- Valg: mærke og tagline, tre kolonner (guides, om siden, følg med: nyheder, RSS, YouTube,
  GitHub) og de juridiske links. Links står i `src/lib/site-footer.mjs`.
- De juridiske links står til venstre med luft under på telefon, fordi assistentknappen
  ligger fast i nederste højre hjørne.
- På forsiden får sidefoden selv sidens bredde og margen; forsiden fjerner panelets polstring.

### B46. Tips er grønne, og kort har én ikonfarve
- Valg: Starlights lilla (tip-bokse) peger nu på mærkefarven, og alle kortikoner bruger den.
- Begrundelse: ejeren pegede på, at farverne ikke spillede sammen. Farve bruges nu kun til
  betydning: grøn (mærke/tip), blå (note), gul (advarsel), rød (fare).

### B47. Nyhedsoversigten: ét stort kort for seneste artikel og et kompakt arkiv pr. måned
- Fund: siden gentog sin egen titel i en boks, viste seneste artikel i en smal spalte med
  kæmpe overskrift og listede alle 64 artikler med fire links hver (over 16.000 px høj).
- Valg: én linje med antal og RSS, seneste artikel som kort med billedet øverst og historierne
  nummereret under, og derefter arkivet grupperet pr. måned med én række pr. artikel (9.500 px ved 1440 px bredde).
  Kildelisten er lukket, til man åbner den. Indholdsfortegnelsen er slået fra på siden.
- Rækken viser hovedhistorien i stedet for "AI-nyheder, <dato>", som 63 af 64 titler hed.
- Nyhedsoversigten og nyhedsartiklerne har deres egne billeder og får ikke 3D-husets banner.
- Kendt mangel: billedets tekst er dansk, også på den engelske side.

### B48. ESP32 får sit eget nærbillede i stedet for et billede af huset
- Fund: ESP32-kortet på forsiden og banneret på ESP32-guiderne viste stuen; printpladen var
  en prik i en plante. Billedet sagde ikke, hvad emnet er.
- Valg: en scene for sig, `bench`: et udviklingskort på et breadboard med sensor, lysdiode,
  ledninger og en telefon med målingen, på et træbord. Bygget af de samme byggeklodser og
  tegnet med husets lys, så det ligner resten. Mål i centimeter, så delene har rigtige forhold
  (hulafstand 2,54 mm, 19 ben pr. side).
- Scenen ligger bag `stills.mjs`, som kun billedtegneren pakker. Forsiden henter den ikke.
- Telefonens skærm viser kun tal og en kurve, så billedet er ens på dansk og engelsk.
