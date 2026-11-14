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
- Afløst af B51 (2026-11-14): ventetiden er nu 14 dage og håndhæves af Dependabot.
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
  drejning er skjult. Kontrolleret i browser ved at slå WebGL fra. Siden B53 spørger siden
  browseren, før three.js hentes; uden grafikkort hentes det ikke.
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
- Billedets tekst var dansk, også på den engelske side. Rettet i B49.

### B48. ESP32 får sit eget nærbillede i stedet for et billede af huset
- Fund: ESP32-kortet på forsiden og banneret på ESP32-guiderne viste stuen; printpladen var
  en prik i en plante. Billedet sagde ikke, hvad emnet er.
- Valg: en scene for sig, `bench`: et udviklingskort på et breadboard med sensor, lysdiode,
  ledninger og en telefon med målingen, på et træbord. Bygget af de samme byggeklodser og
  tegnet med husets lys, så det ligner resten. Mål i centimeter, så delene har rigtige forhold
  (hulafstand 2,54 mm, 19 ben pr. side).
- Scenen ligger bag `stills.mjs`, som kun billedtegneren pakker. Forsiden henter den ikke.
- Telefonens skærm viser kun tal og en kurve, så billedet er ens på dansk og engelsk.

### B49. Nyhedsbilledet viser hovedhistorien og har ingen sprogtekst
- Fund: 63 af 64 billeder havde "AI-nyheder, <dato>" som stor overskrift med den samme dato
  nedenunder, og den engelske artikel viste det danske billede.
- Valg: overskriften er artiklens hovedhistorie (samme regel som i nyhedsoversigten, nu ét
  sted: `scripts/lib/news-lead.mjs`). Første overskrift er ens i de to sprog i alle 64
  artikler, så ét billede kan deles.
- Mærket hedder "SmartBolig.net · AI", og datoen står som `2026-11-14`. `--lang` er fjernet.
- Fravalgt: et engelsk sæt billeder. Det ville fordoble 320 filer og give nyhedsflowet et
  ekstra trin hver dag for en tekst, der i forvejen er ens.

### B50. Rettelser efter den uafhængige gennemgang før udgivelsen af runde 2
- Gennemgangen (uafhængig model, 2026-11-14) fandt ingen blokerende fejl. Disse er rettet:
- Rundturen: kapitler, der ikke er i fokus, trådte tilbage med `opacity: 0.45`, så tekst og
  links mistede kontrast. De træder nu tilbage i farve (`--sb-ink-muted`), og et kapitel med
  tastaturfokus dæmpes aldrig.
- Tabeller: alle 847 tabeller var stop for tastaturet og hed "Tabel". Nu er kun en tabel, der
  er bredere end spalten, et stop og et navngivet område, og navnet er overskriften over den.
  Det afgøres i browseren (`src/lib/table-scroll.mjs`), fordi bredden ikke kendes ved bygning.
  Uden script ruller en bred tabel stadig med berøring og hjul.
- 3D-huset: tager browseren grafikkonteksten (`webglcontextlost`), ryddes modellen væk, og
  stillbilledet vises igen. Ikke fremprovokeret i en browser; koden følger samme vej som
  "WebGL mangler", som er afprøvet.
- Datoen for seneste opdatering stod både øverst og nederst. Den står nu kun øverst.
  Engelske datoer skrives britisk (14 November 2026), som resten af den engelske tekst.
- `/_astro/*` får et års cache: filnavnene har en hash af indholdet.
- Punktet om et gammelt adgangstoken er taget ud af den offentlige ejerliste og gives til
  ejeren direkte.
- Udskudt med begrundelse står i STATUS.md under "Udskudt fra designgennemgangen".

### B51. Opdaterede pakker og automatiske opdateringer
- Fund (2026-11-14): `npm audit` viste 4 fund (3 moderate, 1 lav) i Astro,
  `postcss-selector-parser`, `smol-toml` og `fast-xml-parser`. Ingen var høje, så porten var
  grøn, men de er lukket nu: Astro 7.2.8 til 7.4.7 med `@astrojs/markdown-remark` 7.3.0.
- Undtagelse fra reglen om 14 dage gamle versioner: 16 pakker i lockfilen var yngre end
  14 dage den 14/11.
  - 5 følger af sikkerhedsrettelsen, og der findes ingen ældre rettet version: `astro`
    7.4.7 (9 dage), `@astrojs/internal-helpers` 0.13.1, `@astrojs/markdown-satteri` 0.4.7,
    `fast-xml-parser` 5.12.0 (11 dage) og `is-unsafe` 2.0.3.
  - 11 kom med, da npm løste træet: `shiki` 4.6.0 med syv `@shikijs/*` (12 dage),
    `@babel/parser` og `@babel/helper-string-parser` 7.29.13 (10 dage) og
    `mdast-util-mdx-jsx` 3.2.1 (11 dage). Forsøgt holdt tilbage: npm lægger da fem kopier af
    `shiki` 4.5.0 ind ved siden af hinanden, så lockfilen er beholdt. Alle 16 er over
    14 dage gamle fra 2026-11-19.
- Automatiske opdateringer: Dependabot med 14 dages ventetid. Små opdateringer af
  npm-pakker (patch, og minor fra version 1) flettes af et job, der selv venter på
  `deploy`-kontrollen. Dependabots advarsler og sikkerhedsrettelser er slået til i repoet.
- Efter uafhængig gennemgang (2026-11-14):
  - Minor af pakker under version 1 flettes ikke. Starlight 0.42 fjernede den
    mobilmenu-knap, sidens stylesheet og assistentknap bygger på; `deploy` ville være grøn.
    De fire 0.x-pakker står uden for gruppen, så de ikke holder resten tilbage.
  - Den fremmede Action kører i et job, der kun kan læse; jobbet, der fletter, har ingen
    fremmed kode. Workflow-filen kommer fra pull requesten, så en opdatering af Actionen
    ville ellers køre med skriveadgang, før nogen havde set den.
  - Efter en fletning startes kontrollerne på `main` (uden udgivelse). Ellers bliver
    pakke-kontrollen ved med at regne lockfilen for ændret, og et nyt fund i en uændret
    pakke ville stoppe nyhedsudgivelsen: den fejl, B16's to tilstande blev lavet mod.
- Fravalgt: GitHubs egen auto-fletning. Den kræver grenbeskyttelse på `main`, og så kan
  nyhedskørslen ikke længere pushe dagens udgave. Uden grenbeskyttelse fletter den straks,
  før kontrollerne er kørt.
- Fravalgt: at flette GitHub Actions og major-opdateringer automatisk. En ny hovedversion
  kan ændre opførsel, testene ikke fanger, og en Action ændrer selve udgivelsesvejen.
  Accepteret risiko: også npm-pakker kører i job med Cloudflare-nøglen; for små
  opdateringer er værnet ventetiden, lockfilens integritetskontrol og `deploy`.
- En flettet opdatering udgives ikke med det samme (en fletning foretaget af GitHubs
  workflow-nøgle starter ingen udgivelse). Den kommer med næste udgivelse: næste push fra et
  menneske til `main` eller næste nyhedskørsel, der udgiver en udgave. Alle kontroller kører
  igen først.
- Anden gennemgang (uafhængig model, 2026-11-14) fandt intet blokerende og fem ting, der er
  rettet: (1) flettejobbet stolede på, hvad `fetch-metadata` svarede om økosystemet, og en
  pull request, der opdaterer den Action, bestemmer selv svaret; nu læser jobbet grenens
  navn og de ændrede filer fra GitHub. (2) En rettelse uden læsbart versionsnummer slap
  forbi 0.0.x-reglen; nu tæller den som stor. (3) Fejlede sletningen af grenen, kørte
  trinnet efter fletningen ikke; grenen slettes nu af repo-indstillingen. (4) En
  kontrolkørsel kunne skubbe en ventende udgivelse ud af køen; den har nu sin egen kø i
  `deploy.yml`, og Dependabot har et fast tidspunkt væk fra nyhedskørslerne. (5) En pakke
  under version 1 får ingen rettelser, mens en nyere minor venter; det står nu i
  `docs/opdateringer.md`. Reglerne afprøves af `scripts/site-dependabot.test.mjs`.
### B52. Assistenten søger i sidens eget indeks
- Baggrund: B8. Cloudflare AI Search fakturerer fra 2026-12-01 ud over 1.000 forespørgsler
  pr. måned, og kravet er ingen udgifter.
- Valg: et ordbaseret indeks (BM25) over de byggede sider, delt i små JSON-filer, som
  Workeren læser fra sine egne statiske filer. Et spørgsmål læser højst 19 filer.
- Hvorfor ikke vektorsøgning: den kræver enten en betalt tjeneste (Vectorize, AI Search)
  eller et modelkald pr. spørgsmål til indlejring, og den skal genindekseres uden for bygget.
  Det ordbaserede indeks koster intet, bygges med siden og kan fejlsøges med ét
  kommandolinjekald. Modellen får uddragene som baggrund og har stadig egen viden.
- Hvorfor ikke Pagefind (som sidens søgefelt bruger): Pagefinds indeks læses af dens egen
  WebAssembly i browseren og er ikke lavet til at blive læst i en Worker.
- Hvorfor små filer: en Worker på gratisplanen har 10 ms CPU pr. kald. Ét stort indeks
  skulle parses ved hvert spørgsmål; ordfilerne sigter efter 12 KB (største i dag: 18 KB).
  Målt værst tænkelige spørgsmål: ca. 160 KB læst og 1,7 ms CPU i Node.
- Dansk: bøjningsendelser skæres af ("sensorerne" → "sensor"), og sammensatte ord deles ved
  bygning ("bevægelseslys" → "bevægelse" + "lys"). Synonymer forstås ikke.
- Efter uafhængig gennemgang (2026-11-14):
  - Overskrifter uden tekst under sig blev til egne stykker og vandt over rigtige afsnit
    (hver femte danske stykke, plus "Kommentarer" på 151 sider). De giver nu intet stykke,
    og et kort stykke får ingen fordel af at være kort.
  - Afsnit, der næsten kun er links ("Næste skridt", sider med linkkort), udelades: de
    nævner andre siders emner uden at sige noget om dem. Det samme gælder tekst, der står
    ordret på tre sider eller flere (noten under hver nyhedsudgave).
  - Ental og flertal var forskellige ord ("device"/"devices", "pris"/"priser"). Rettet,
    med parvise tests.
  - Faneblade ud over det første blev sprunget over (5,7 % af den danske tekst). Rettet.
  - Emneregel: nævner spørgsmålet et ord fra en sidetitel, skal hvert svar indeholde et
    sådant ord. Fravalgt: at kræve to af spørgsmålets ord i hvert svar; det gav ét svar på
    "Hvad koster en Shelly?" og ingen Shelly-side.
  - Loftet pr. ord er hævet fra 160 til 600 stykker (ramte 127 danske ord, nu 4).
  - Korte forled i sammensatte ord ("elpris", "dørsensor") deles kun fra en fast liste.
    Uden listen blev "seneste" til "se" + "nest" og "parring" til "par" + "ring".
  - Indeksfilerne spærres ikke i `robots.txt`: de har `noindex`-hovedet, og en spærret fil
    kan søgemaskinen ikke hente for at se det.
- Sikring mod forringelse: faste prøvespørgsmål på begge sprog stilles efter hvert byg og
  stopper det, hvis den rigtige side falder ud af de tre bedste svar.
- Kildekontrollen er uændret: kun `smartbolig.net`-adresser kan blive kilder, teksten
  afkortes, og en fejl eller en overskredet tidsgrænse giver et svar uden guideuddrag.
- AI Search-instansen hos Cloudflare er ikke slettet (se TIL-EJEREN).

### B53. 3D-huset tegnes i en worker, og siden spørger først, hvor det kan tegnes
- Valg: huset bygges, oversætter sine shadere og tegner hvert billede i en worker
  (`OffscreenCanvas`, `src/lib/house3d/worker.mjs`). Siden sender kald som beskeder og får
  markørernes pladser tilbage.
- Hvorfor: målt i headless Chrome med grafikkort var sidens tråd blokeret 2.502 ms, mens huset
  startede, og i brug 0,78 s pr. sekund i hvile. I en worker er det ca. 30 ms og 0,15 s. Rul,
  klik og søgefelt virker dermed, mens huset starter.
- Før noget hentes, spørger `probe.mjs` browseren med et prøvelærred: worker, side eller slet
  ikke. Fundet i den uafhængige gennemgang: Safari 16.4 til 16.6 har lærred i worker uden
  WebGL og ville have mistet det levende hus; en browser uden grafikkort hentede ca. 680.000 bytes for
  at få et stillbillede. Begge dele er rettet og låst med tests mod en efterlignet browser.
- Første billede venter på shaderne, højst 2,5 sekunder. Uden grænsen kunne en browser, der
  aldrig svarer, lade stillbilledet stå for altid.
- Fravalgt: at dele three.js mellem de to pakker (worker og side). En browser henter kun den
  ene, så deling sparer intet over nettet og gør pakningen sværere at følge.
- Fravalgt: at falde tilbage til tegning på siden, når workeren fejler efter start. Lærredet
  er da givet væk og kan ikke tages tilbage; stillbilledet er den sikre reserve.
- Pris: three.js ligger to gange i `dist/` (ca. 680.000 bytes hver, ca. 170 KB over nettet).
  Så længe `public/_headers` har en `worker-src`, skal den indeholde `'self'`.
- Anden gennemgang (2026-11-14): indstillinger, der ikke kan sendes til en worker, opdages nu,
  før lærredet gives væk (ellers stod siden med et dødt lærred); ventetiden på shaderne er
  flyttet til `first-frame.mjs` og prøves med et efterlignet ur; et fjernet hus udleveres ikke
  igen. Opskriften på at slå workeren fra er gjort præcis i `docs/3d-hus.md`.
- Kontrolleret 2026-11-14 på den byggede side i headless Chrome: med grafikkort levende i
  worker (16 ms blokeret), tvunget til siden levende (675 ms), software-tegning og slået fra
  giver stillbillede uden three.js og uden fejl i konsollen. Ikke kontrolleret: Safari og
  Firefox på en rigtig enhed.

### B54. Søgemaskinernes grundregler: omdirigeringer, robots.txt og strukturerede data
- Baggrund: en gennemgang af den levende side 2026-11-14 fandt gamle adresser med 404,
  `robots.txt`-grupper, der fik Googlebot og Bingbot til at springe `Disallow` over, og
  ugyldige HowTo-data på 50 af 52 sider.
- Valg: gamle adresser får faste 301-regler i `public/_redirects`, lagt før reglerne med `*`
  (Cloudflare tæller alt efter den første `*`-regel mod en grænse på 100).
- Valg: ingen egne grupper til Googlebot og Bingbot. En crawler med egen gruppe læser ikke
  `*`-gruppen. De AI-søgemaskiner, der er tilladt ved navn, gentager de to `Disallow`-linjer.
  Fravalgt: at gentage linjerne også for Googlebot; uden egen gruppe følger den `*` og kan
  ikke komme ud af trit.
- Valg: HowTo-data fjernes helt i stedet for at blive rettet. Google viser ikke HowTo-resultater
  mere, og data uden synlig modpart på siden er imod Googles retningslinjer. FAQ-data bliver.
- Valg: `og:type` følger artikeldata (`shouldRenderArticleSchema`), så de to aldrig siger
  forskelligt. Forsiden har ingen brødkrumme-liste, fordi en liste kræver mindst to led.
- Sikring: `npm run seo:validate` afviser hver af fejlene på de byggede sider, og
  `scripts/site-redirects.test.mjs` låser reglerne, rækkefølgen og at målet findes.
- Dokumentation: `docs/seo.md`.
- Efter den uafhængige gennemgang (2026-11-14): `ClaudeBot` er Anthropics træningscrawler
  (Anthropics egen side, læst samme dag) og stod som tilladt, mod sidens egen regel om ingen
  træning. Den er nu spærret som `GPTBot`; `Claude-User` og `Claude-SearchBot` har ingen gruppe
  og er tilladt gennem `*`. `seo:validate` kræver nu også de to `Disallow`-linjer i `*`-gruppen
  og `Sitemap:`-linjen. Tre regler med `:slug` giver produktadresser uden skråstreg ét hop.
- Efter udgivelsen (2026-11-14): på den levende side fik `/produkter/shelly` stadig to hop.
  Cloudflare lod `*`-reglen vinde over `:slug`-reglen, selv om `:slug` stod først i filen
  (lokalt og i Cloudflares dokumentation vinder den første). Valg: ingen to dynamiske regler må
  kunne ramme samme adresse. Hvert præfiks har nu `/:slug` (uden skråstreg) og `/:slug/*` (alt
  dybere), og `scripts/site-redirects.test.mjs` fejler, hvis en adresse rammer to regler.
### B55. Guidernes billeder går gennem Astros billedbehandling
- Baggrund: 16 guides åbnede med et PNG-billede på 2,2 til 2,7 MB fra `public/images/guides/`.
  Filer i `public/` sendes, som de er: ingen WebP, ingen bredder, ingen `width` og `height`.
- Valg: billeder i en guides tekst ligger i `src/assets/guides/` og skrives med en relativ sti.
  Astro laver dem som WebP i seks bredder (`image.layout: "constrained"`), og
  `config/markdown/body-images.mjs` fortæller browseren, at de vises i tekstspalten (45rem).
  Uden den oplysning antager browseren, at billedet fylder hele vinduet, og henter den
  bredeste fil.
- Tegninger (SVG) bliver én fil: flere bredder af en SVG er den samme fil flere gange.
- Det første billede i en guide, der åbner med et billede, hentes straks med høj prioritet
  (`config/markdown/lead-image.mjs`). Ellers har sidehovedet allerede sit eget billede med høj
  prioritet, og en side skal kun have ét.
- Fravalgt: `responsiveStyles`. Starlights egne regler holder allerede billederne inden for
  spalten; Astros ekstra stilark ville ændre udseendet for alle billeder.
- Fravalgt: at flytte sidehovedets billeder, forsidens billeder og nyhedsbillederne. De har en
  fast offentlig adresse (sociale kort, RSS) og laves allerede i de rigtige bredder af egne scripts.
- Målt på den byggede side 2026-11-14: Zigbee2MQTT-guidens første billede var 2.420.126 bytes
  og er nu 32.326 bytes i 640 px (telefon og 1280 px bærbar ved almindelig pixeltæthed), 40.184
  i 750 px (fuld spalte), 65.936 i 1080 px (telefon med tredobbelt pixeltæthed) og 132.868 i
  1536 px (fuld spalte ved dobbelt pixeltæthed). Billedfilerne i repoet fylder 26,5 MB mod
  55 MB før.
- Sikring: `scripts/site-images.test.mjs` afviser `/images/...` i en guides tekst, og at
  spaltebredden i `body-images.mjs` kommer ud af trit med `--sb-measure`.
- Efter den uafhængige gennemgang (2026-11-14):
  - `sizes` var for grov (45rem fra 50rem, ellers hele vinduet). Spalten er målt ved 22
    vinduesbredder, og `COLUMN_SIZES` følger nu layoutets brudpunkter. En test holder værdien op
    mod den målte spalte: aldrig mindre end spalten, højst 32 px mere.
  - Anden gennemgang fandt et hul ved 752 til 799 px (spalten er 720 px, browseren fik op til
    767 px at vide); `COLUMN_SIZES` har fået et led til det. Tallene gælder sider med
    indholdsfortegnelse; en test afviser billeder i teksten på sider uden. LD2410-oversigtens
    mærkater TX og RX på sensoren var byttet om og er rettet. Testen af omdirigeringer laver nu
    prøveadresser ud fra hver dynamisk regel i stedet for ni faste adresser.
  - Tegninger stod i deres egen bredde (ofte 600 px i en spalte på 720), fordi Astro skriver
    `width` og `height` på dem. En regel i `prose.css` lader dem fylde spalten som før.
  - Et billede er Astros, når stien er relativ, også uden `./` (`local-picture.mjs`). Før blev
    `billede.webp` overset af begge plugins. `content-audit.py` kontrollerer de samme stier.
  - `npm run seo:validate` kontrollerer det byggede åbningsbillede på Home Assistant-guiden:
    flere bredder, spaltens `sizes`, høj prioritet, `width` og `height`.
  - `public/images/guides/` er tom og væk. LD2410-diagrammet viste TX0 og RX0, mens guidens kode
    bruger GPIO17 og GPIO16; mærkaterne er rettet, og den danske guide viser nu diagrammet.
  - Fravalgt nu: at gå alle diagrammer igennem for overlappende tekst, sprog og fakta. Det er
    en opgave for sig (åbent punkt i STATUS).


### B57. Kort overskrift og egen søgetitel på oversigtssider
- Baggrund: oversigtssiderne hed "Automationer", "Produkter" og "Sikkerhed". Det er gode
  overskrifter, men i et søgeresultat siger "Automationer | SmartBolig.net" ikke,
  hvad siden indeholder. En længere `title` løste det, men blev også overskrift, sidste led i
  brødkrummen og navn i strukturerede data ("Automationer til Home Assistant: opskrifter" som
  H1).
- Valg: et valgfrit felt `seoTitle` (10 til 60 tegn) i sidens frontmatter. Det bruges i
  `<title>`, `og:title` og `twitter:title`. `title` er fortsat overskrift, sidste led i
  brødkrummen og navn i strukturerede data. Menunavne er ikke `title`: de er faste tekster i
  `config/sidebar/`. Sider uden feltet er uændrede.
- Fravalgt: Starlights `head`-felt med et `title`-tag pr. side. Det virker, men forfatteren skal
  selv skrive " | SmartBolig.net", og sociale kort følger ikke med.
- Brugt på fire oversigtssider (AI, automationer, produkter, sikkerhed) og kontaktsiden, hver
  på begge sprog (ti filer). Guides bruger `title` alene.
- Samme gren: ca. 70 titler rettet (sigt på højst 45 tegn, fordi " | SmartBolig.net" lægges til
  `<title>`; op til 60 er tilladt; dansk stavemåde på danske sider), interne links
  til 18 guides, som få sider pegede på, årstal ud af overskrifter, og rå diagramkode på otte
  produktsider erstattet af lister.
- Sikring: `npm run seo:validate` kræver på alle sider, at `<title>` er `og:title` og `twitter:title`
  med sidenavnet efter, og på `/da/automationer/` søgetitel, kort overskrift og kort brødkrumme.
### B56. Samtykke først, og en CSP uden `'unsafe-inline'` for scripts
- Baggrund (den levende side, headless Chrome, 2026-11-14): før læseren havde svaret, hentede
  hver side `gtag.js`, `adsbygoogle.js` og giscus og sendte et kald til Google Analytics.
  Samtykket styrede kun, hvad scripts måtte gemme ("advanced consent mode"). De juridiske sider
  beskrev noget andet (bl.a. Ezoic og et nyhedsbrev, der ikke findes).
- Valg: "basic consent mode". Googles samtykkebesked hentes for sig, og Analytics og AdSense
  hentes først efter et ja (`src/lib/consent/`). Begrundelse: det er det, cookiereglerne
  kræver, og det er det eneste, læseren kan efterprøve i sin egen browser.
- Pris: Google Analytics tæller kun læsere, der siger ja, og modellerer ikke resten. Samlede
  sidevisninger ses i Cloudflare Web Analytics, som ikke bruger cookies.
- Valg: svaret læses fra beskedens samtykke-API, og fra TCF, hvis "consent mode" ikke er slået
  til i AdSense. Så virker siden rigtigt, uanset hvordan AdSense står, og ejeren kan slå det
  til senere uden kodeændring.
- Valg: et tilbagetrukket ja genindlæser siden. Et script, der er hentet, kan ikke fjernes igen.
- Valg: kommentarer (giscus) hentes ved tryk. De sender læserens IP til giscus og GitHub, og de
  færreste læser dem.
- Valg: Cloudflare Web Analytics beholdes uden samtykke og beskrives i cookiepolitikken. Den
  sætter ingen cookies (Cloudflares egen oplysning).
- Fjernet: cookien `preferred-lang`. Siden satte den, når læseren skiftede sprog, og Workeren
  læste den ved `/`. Nu vælger `/` sprog efter land (Danmark: dansk, ellers engelsk), og et
  sprogskift huskes ikke dér. Sproget står i adressen, så links og bogmærker er uberørte.
- CSP: de små scripts, Astro skrev ind i siden, er nu filer (`config/vite.mjs`), og de fire
  tilbageværende får en hash. Den strenge politik sendes som Report-Only, til den er set på den
  levende side med annoncer; derefter slås den til med én konstant.
- Fravalgt: nonce pr. svar sat af Workeren. Det kræver, at Workeren står foran hver side
  (i dag kun `/api/*`), og det koster svartid og gratis kald. Hashes dækker de fire scripts,
  der står i siden, fordi de er ens på alle sider. Scripts, som Cloudflare selv skriver ind
  (e-mail-sløring, robotkontrol), dækkes ikke; se `docs/sikkerhed.md`.
- Fravalgt: egen samtykkebanner. Googles besked er certificeret til AdSense i EU/EØS; en egen
  ville skulle certificeres eller betales for.
- De juridiske sider er skrevet om på begge sprog, så de passer med koden. Det, kun ejeren kan
  afgøre (navn og adresse på den dataansvarlige, jurist-tjek), står i TIL-EJEREN.
- Efter den uafhængige gennemgang (2026-11-14):
  - Fund på den levende side: der er ingen udgivet samtykkebesked for smartbolig.net i AdSense.
    Googles script, hentet alene fra en dansk forbindelse, melder "inaktiv": ingen dialog,
    intet svar fra læseren i TCF, "consent mode" ikke sat op. Siden hentede altså Analytics og
    AdSense uden at spørge nogen. Med denne ændring hentes ingen af dem, hvor GDPR gælder, før
    beskeden er udgivet (målt fra Danmark).
  - Valg: udgiv alligevel. Siden overholder reglerne med det samme; prisen er ingen
    Analytics-tal og ingen annoncer, til beskeden er udgivet. AdSense kunne ikke åbnes herfra
    (kræver ejerens login), så det står øverst i TIL-EJEREN.
  - Fravalgt for nu: sidens eget spørgsmål som reserve, når Googles besked ikke er udgivet. Det
    ville give Analytics tal med det samme, men er en samtykkeflade mere at holde rigtig, og
    annoncer i EU/EØS kræver alligevel Googles certificerede besked. Tages op igen, hvis
    beskeden ikke bliver udgivet.
  - Lande, hvor Google ikke spørger: siden følger Googles signal og henter. De juridiske sider
    siger det nu på begge sprog (før lovede de "intet før et svar" uden forbehold). Om en dansk
    dataansvarlig bør spørge alle, er en juridisk vurdering; ejeren kan vælge "alle lande" i
    AdSense, og så spørges alle uden kodeændring.
  - Koden læste Googles statusliste med navne uden præfiks; den levende liste har præfiks
    (`CONSENT_MODE_PURPOSE_STATUS_GRANTED`). Med tomme værdier og tom liste gav den gamle kode
    ja til alt. Nu kræves tal for både navne og værdier, begge navneformer forstås, og alt
    andet er "intet svar".
  - TCF-lytteren sættes altid op, og hvor både "consent mode" og TCF svarer, kræver et formål
    ja fra begge. Før blev et tilbagetrukket ja ikke opdaget, når "consent mode" var slået til.
  - "Cookieindstillinger" vises kun, hvor Google har spurgt (før: så snart scriptet var hentet).
  - CSP: værterne følger Googles liste for Analytics (`*.google.com` i `connect-src`,
    `www.googletagmanager.com` i `frame-src`). Hash regnes af teksten, som browseren læser den.
  - Kommentarer: knappen bliver stående, til feltet er hentet (fokus tabes ikke), med tekst for
    "henter" og "kunne ikke hentes".
  - Tests: gennemgangen ændrede koden 31 steder og så, at 21 ændringer ikke blev opdaget. De
    er dækket nu: rækkefølgen af `consent update` og scripts, hvert TCF-formål, mislykkede
    TCF-svar, genindlæsning når kun annoncer trækkes tilbage, Googles signalramme, alle filer i
    `config/head/`, hashens præcise tekst og at den strenge politik ikke slås til ved en fejl.
- Efter anden uafhængige gennemgang (2026-11-14, af rettelserne; 1 blokerende fund, 2 andre):
  - Uden en udgivet besked kalder Google alligevel TCF-lytteren med "GDPR gælder", men uden
    svar. Knappen "Cookieindstillinger" blev derfor vist og åbnede ingenting. Nu vises den kun,
    når Google faktisk har spurgt (hændelsen har en status).
  - Googles kald kommer i rækkefølgen TCF-lytter, så "consent mode". Koden glemte TCF-svaret,
    når "consent mode" kom sidst, så et ja i "consent mode" alene kunne hente scripts. Nu
    huskes det seneste TCF-svar, et formål kræver ja i begge, og hvor GDPR gælder, er "consent
    mode" alene aldrig et ja. Testene følger Googles rigtige rækkefølge.
  - De juridiske sider lovede et spørgsmål og en knap, som ingen får, før beskeden er udgivet.
    Ordlyden er nu sand i begge tilstande.
  - Kontrollen mod fremmede værter dækker også 404-siden og springer kodeeksemplers
    kopiér-knap over. Kommentarfeltet har fået rigtige tests (afsender, tidsgrænse, oprydning).
  - Ikke afprøvet, før ejeren har udgivet beskeden: et rigtigt ja og et tilbagetrukket ja i
    Googles rigtige besked, og om "consent mode" for statistik følger TCF-formål 1 og 8.
- Efter tredje uafhængige gennemgang (2026-11-14, af rettelserne; 0 blokerende fund, 4 andre):
  - Et TCF-ja kunne hente scripts, før Googles "consent mode"-værdier kunne læses, og et nej
    derfra et øjeblik efter ville genindlæse siden, måske igen og igen. Nu afgøres intet, før
    Google har meldt, at værdierne kan læses.
  - "Consent mode" kunne afgøre alene, hvis det meldte sig før TCF. Nu ventes der på TCF's
    første melding, hvor siden har en TCF-API, og en senere melding kan ikke lave "GDPR
    gælder" om.
  - Knappen vises kun ved de tre kendte TCF-statusser; privatlivspolitikkens sætning om en
    besked, der ikke vises, gælder nu kun i lande, hvor Google skal spørge.
  - Kontrollen mod fremmede værter læser nu hvert tag for sig (et ">" i en alt-tekst eller et
    tag skrevet som tekst i en attribut snyder den ikke) og gennemgår alle byggede HTML-filer.
  - Valgt fra: at trække samtykket tilbage, mens beskeden er åbnet igen og ubesvaret. Det
    tidligere ja står, til læseren svarer.

### B58. Sidevagt i GitHub Actions, og llms.txt lavet af bygget
- Baggrund: ingen holdt øje med den levende side. En udløbet omdirigering, et tomt sitemap
  eller nyheder, der holdt op med at udkomme, ville først blive set af en læser.
- Valg: et workflow i repoet (`monitor.yml`) to gange i døgnet. Det sender kun GET, tjekker
  tretten ting (statuskoder, sikkerhedshoveder, sitemappets størrelse, kanonisk adresse,
  `www`-omdirigering, feeds, nyhedernes alder) og bruger en GitHub-sag som alarm: én sag med
  etiketten `monitor`, som åbnes, får en kommentar og lukkes af workflowen selv.
- Fravalgt: en ekstern overvågningstjeneste (ny konto, ny hemmelighed, gratisniveauer der
  ændres) og en Worker med cron (endnu et sted med kode i drift). GitHub-sager giver ejeren
  besked på mail uden opsætning.
- Fravalgt: at stille assistenten et spørgsmål i hver kørsel. Det bruger modelkvote, og
  svaret kan ikke tjekkes med en fast regel.
- Nyheder: grænsen er 60 timer, målt på nyhedernes eget feed. Én stille dag åbner ingen sag;
  to dage i træk gør.
- `llms.txt`: bygget laver filen ud fra de byggede sider og sitemappet. Et nyt område i
  sitemappet, som hverken står i `SECTIONS` eller `LEFT_OUT`, stopper bygget med områdets
  navn i fejlen, så filen ikke stille mister sider.
- Kontrol: `npm run site:test` (falsk `fetch`), og kørslen mod den levende side. Ikke set
  køre: selve workflowen i Actions og trinene, der åbner og lukker sagen; de køres én gang
  efter udgivelsen.
- Uafhængig gennemgang før udgivelsen (ingen blokerende fund). Rettet:
  - Rapporten sætter "forventet" og "set" i kodefelter, så tekst fra siden ikke kan blive til
    en overskrift, et link, en omtale af en bruger eller en sagshenvisning, og "set" klippes
    til én linje på 240 tegn, før den når loggen.
  - Nyhedsgrænsen er 84 timer i stedet for 60, så kontrollen først fejler efter nyhedsflowets
    egen sag (`ai-news-stalled`, dag 3). Den er sikkerhedsnettet, hvis nyhedsflowet slet ikke kører.
  - Workflowen finder kun den sag, den selv har åbnet (ikke en, et menneske har mærket
    `monitor`), retter sagens titel ved hver fejlende kørsel, har 15 minutters frist og kører
    ikke i en fork.
  - HSTS skal have `max-age` over nul, og `Referrer-Policy` skal være en af de fire strenge.
  - `llms.txt`: sider under et område ved navn `start` faldt stille ud; nu stopper bygget.
  - Valgt fra: at begrænse læsningen af et svar i bytes. Fristen på 15 sekunder sætter loftet,
    og kontrollerne henter kun sidens egne adresser.
### B60. Indtjening: klik på reklamelinks tælles, og én fast annonceplads står klar
- Baggrund: reklamelinkene lå i et register (115 produkter), men ingen kunne se, hvilke guider
  og produkter læserne trykkede på; Partner-Ads viser kun klik og salg pr. butik. Siden havde
  heller ingen fast annonceplads, kun AdSenses automatiske annoncer.
- Valg, klik: efter et ja til statistik sender et tryk på et reklamelink hændelsen
  `affiliate_click` (produkt og butik) til Google Analytics. Lytteren sættes først op i
  `boot.mjs`, når Analytics er hentet; før et ja og efter et nej sendes intet.
- Fravalgt, klik: en egen tæller i Workeren (uden samtykke). Den ville kræve lager, drift og en
  juridisk vurdering af, om tælling uden samtykke er i orden. Analytics findes allerede og er
  bag samtykket.
- Valg, annonceplads: én plads under teksten i guides og nyheder, over kommentarerne
  (`AdSlot.astro`). Den står ikke i den byggede side, før den har et nummer fra AdSense
  (`src/data/ad-slots.mjs`), og den er skjult, til læseren har sagt ja til annoncer. Ingen
  inline-style og intet script i komponenten, så den strenge CSP holder.
- Fravalgt, annonceplads: pladser midt i teksten og på forsiden. De flytter indhold, mens
  læseren læser, og forsiden skal være ren. Automatiske annoncer kan ejeren stadig slå til i
  AdSense.
- Samme regel ét sted: "er det en guide eller en nyhed" lå i `Giscus.astro` og bruges nu også
  af annoncepladsen; den er flyttet til `src/lib/article-page.mjs`.
- Ideer, ikke bygget: startsæt-bygger med reklamelinks fra registret (bygges som værktøj), og
  henvisning til elaftaler ved elprisværktøjet (kræver et godkendt program; ejerens liste).
- Kontrol: `npm run site:test`; bygget side i headless Chrome med efterlignet samtykke.
  Ikke set: hændelsen i Google Analytics og en rigtig annonce i pladsen (kræver udgivet
  samtykkebesked og et annoncenummer).
- Uafhængig gennemgang før udgivelsen (ingen blokerende fund). Rettet:
  - Etiketten er "Annoncer"/"Advertisements"; Googles regler tillader ikke "Annonce".
  - Pladsen skjules igen, hvis AdSense-scriptet ikke kan hentes, og den er væk på print.
  - Cookiepolitikken nævner klikmålingen på begge sprog.
  - Testene ser nu en lytter, der sættes op to gange, det samme id to gange i én gruppefil og
    en anden fil end `boot.mjs`, der importerer klikmålingen eller annoncepladserne.
  - Ikke rettet: pladsen flytter kommentarerne ned, når den vises (teksten i dokumentationen
    er rettet, så den ikke lover andet), og fem produkter har to id'er, til de rigtige
    adresser er hentet i Partner-Ads.

### B59. Tekst i guidernes tegninger er mindst 22 enheder
- Baggrund: efter første omtegning var teksten 18 enheder i en 640 enheder bred `viewBox`,
  ca. 9 px i telefonens tekstspalte på 328 px. Det er under de 11 px, resten af siden bruger
  som mindste tekst.
- Valg: mindst 22 enheder (ca. 11 px) i alle 36 filer. Lange linjer brydes, kasser bliver
  højere, og dele, der stod side om side, stables, så tegningerne bliver højere i stedet for
  bredere. Reglen står i `docs/billeder.md` under "Diagrammer".
- Fravalgt: en særlig, smallere tegning til telefoner (to filer pr. sprog at holde ens) og
  vandret rulning (læseren mister overblikket over en ledningsføring).
- LD2410-tegningen viser benene i printets rækkefølge (TX, RX, OUT, GND, VCC; Hi-Links manual
  til HLK-LD2410C, V1.00, læst 2026-11-14), så ingen ledning krydser. OUT har ingen ledning;
  det står under tegningen, fordi guidens kode ikke bruger benet.
- Efter den uafhængige gennemgang: den stiplede stump fra OUT er fjernet (den lignede en løs
  ledning), "bruges ikke" er flyttet ud af ESP32-kassen, og den engelske Proxmox-tegning
  skriver "USB passthrough" i to ord som guiden.
## B61. Værktøjer: egen sektion, elpris og strømforbrug (2026-11-14)

- Valgt: en sektion `/vaerktoejer/` med sit eget punkt i topbjælken, og en fælles ramme
  (`ToolFrame`, `src/styles/content/tools/`, `src/lib/tools/format.mjs`), så hvert nyt værktøj
  er en komponent, et par moduler og en side pr. sprog. Begrundelse: værktøjer er det, en
  læser kommer tilbage efter, og det, andre sider linker til.
- Valgt, elpris: priserne hentes af Workeren (`/api/elpris`), ikke af læserens browser.
  Begrundelse: Energinet gemmer kalderens IP-adresse i tre måneder (deres vilkår, læst
  2026-11-14), og CSP'en skal ikke åbnes for en fremmed vært. Ét kald henter begge prisområder,
  fordi Energinet afviste det andet kald inden for et minut.
- Valgt: en kopi i Workerens cache i ti minutter, den gamle kopi ved fejl, mens den dækker det
  aktuelle kvarter, og 60 sekunders pause efter en fejl. Fejlsvar er faste ord.
- Valgt: prisområdet gættes ud fra forbindelsens region og huskes ikke; et gættet svar er
  `private`, så det aldrig deles mellem læsere. En forkert `area` afvises (400).
- Valgt: ingen satser for elafgift og nettarif i værktøjet. De skifter og afhænger af
  netselskabet; læseren skriver sit eget tillæg. Momsen (25 %) regnes af summen.
- Valgt ved integrationen: en værktøjsside har intet billede øverst (værktøjet skal stå
  først), oversigten har ingen kommentarer eller annonceplads, privatlivspolitikken har fået
  afsnit 2.4, og sidevagten spørger endpointet to gange i døgnet.
- Fravalgt for nu: Cron Trigger og KV til priserne. Workerens cache er pr. datacenter, så
  flere datacentre henter hver sin kopi. Bygges, hvis Energinet begynder at afvise kald fra
  Cloudflare; det kan kun ses på den levende side.
- OSS og data: ingen nye pakker. Data: Energinet, Energi Data Service, CC BY 4.0, krediteret i
  værktøjet, på siden og i `docs/oss.md`.
- Kontrol: `npm run site:test` (28 tests for værktøjerne), bygget side i headless Chrome i
  begge temaer ved 320, 375 og 1440 px, og ét rigtigt kald til Energinet gennem endpointets
  kode. Ikke set: endpointet hos Cloudflare før udgivelsen.

### B61, tilføjelse efter den uafhængige gennemgang (2026-11-14)

- Valgt: et tal med ét tegn fulgt af præcis tre cifre ("1.500", "1,500") afvises i stedet for
  at blive gættet. Begrundelse: gættet kan være tusind gange forkert, og siden læses af både
  danskere og andre. Fravalgt: at læse efter sidens sprog; en dansker på den engelske side
  ville få det forkerte tal uden at se det.
- Valgt: samtidige kald styres af tidspunkter i Worker-instansens hukommelse, ikke af et delt
  løfte. Begrundelse: Cloudflare kan afbryde det kald, der ejer løftet, og de andre ville
  hænge. Et tidspunkt udløber af sig selv.
- Valgt: gæt på prisområde efter længde- og breddegrad, når regionskoden er ukendt.
  Begrundelse: Hovedstaden og Sjælland lægges efter planen sammen 1. januar 2027, og den nye
  kode kendes ikke. Uden reserven ville alle på Sjælland få Vestdanmarks priser den dag,
  Cloudflare skifter kode.
- Valgt: enhedens ur rettes først, når det er over et kvarter fra serverens. Begrundelse:
  browseren må gemme svaret i ti minutter, så en mindre forskel kan skyldes svarets alder.
- Valgt: eksemplet "Køleskab 40 W i snit" er fjernet. Begrundelse: tallet havde ingen kilde og
  er højt for et nyt køleskab.
- Valgt: forsidens sektion (B63) udgives sammen med værktøjerne. Begrundelse: den viser de
  samme tal gennem den samme kode, og rettelserne ovenfor gælder begge steder.

### B61, tilføjelse efter den opfølgende gennemgang (2026-11-14)

- Valgt: kaldet til Energinet gives til `waitUntil` og har en hård tidsgrænse på 8 sekunder,
  som ikke afhænger af, at `fetch` reagerer på afbrydelsen. Begrundelse: forlader læseren siden,
  skal svaret stadig gemmes til den næste, og et kald må aldrig hænge. Tidspunktet i
  hukommelsen (se ovenfor) er stadig den sidste sikring.
- Valgt: et svar, der slutter før det kvarter, vi er i, gemmes ikke. Begrundelse: det ville
  erstatte en kopi, der stadig har prisen for nu, med en, der ikke kan vises.
- Valgt: forsidens kort sammenligner prisen med dagens timer, mens værktøjet sammenligner med
  alle kendte timer. Begrundelse: kortet tegner kun i dag, og "lav" ved siden af dagens
  højeste søjle ville se forkert ud. Fravalgt: samme regel begge steder; i værktøjet er
  morgendagen med i grafen, og dér er sammenligningen med begge dage den rigtige.
- Valgt: pladsen til kortets tal holdes fra siden åbnes (`data-state="loading"`). Begrundelse:
  ellers flytter resten af forsiden sig, når priserne kommer. Uden JavaScript tages pladsen
  ikke, og teksten står der.
- Kendt og ladt være: søjler for timer, der er gået, har lav kontrast, og første svar fra
  browserens cache kan give et ur, der er op til ti minutter bagud (`docs/vaerktoejer.md`).

### B61, tilføjelse efter udgivelsen (2026-11-14)

- Fundet: på den levende side svarede `/api/elpris` 502. Workerens log viste
  `UpstreamStatus429`. Målt fra Cloudflares net med en prøve-Worker: Energinets datasæt-adresse
  svarede 429 i 14 af 14 kald (grænsen er ét kald i minuttet pr. IP-adresse, og en Worker deler
  adresse med alle andre Workers), mens download-adressen for samme datasæt svarede 200 med
  alle 192 rækker i 15 af 15 kald.
- Valgt: Workeren spørger download-adressen først og datasæt-adressen som reserve.
  Begrundelse: kilden er stadig Energinet (officiel, CC BY 4.0, kvartersopløsning, kroner), og
  ændringen er lille: én fil, samme kontrol af rækkerne.
- Fravalgt: elprisenligenu.dk som kilde eller reserve. Den svarede 200 fra Cloudflare, men har
  timepriser og ikke kvarterer, regner selv om fra ENTSO-E's europriser med en valutakurs, og
  morgendagens fil findes ikke før ca. kl. 13. To kilder med forskellig opløsning ville give
  to sæt tal for samme time.
- Fravalgt nu: Cron Trigger og KV. Begrundelse: det er en ny binding og en ny ting at holde
  øje med; det bygges først, hvis download-adressen også bliver begrænset
  (`docs/vaerktoejer.md`, "Ikke bygget").
- Valgt: siden blev ikke rullet tilbage, mens rettelsen blev lavet. Begrundelse: siderne,
  strømforbrugsværktøjet og forsidens kort (med sin tekst i stedet for tal) virkede, og de nye
  sider var allerede meldt til søgemaskinerne.
- Valgt: mangler ét prisområde i et svar, holder Workeren samme pause som efter en fejl.
  Begrundelse: et nyt kald med det samme ville mangle området igen og koste et kald.
- Valgt: browserens kald til `/api/elpris` afbrydes efter 12 sekunder, uden `AbortSignal.any`
  og `AbortSignal.timeout`. Begrundelse: Workeren bruger højst 8 sekunder på Energinet, og de
  to funktioner findes ikke i de ældste browsere, siden skal virke i.
- Valgt: en forskel mellem enhedens og serverens ur, der er mere end et kvarter mindre end den
  største sete, starter aflæsningen forfra. Begrundelse: et svar fra browserens cache er højst
  ti minutter gammelt, så en større ændring betyder, at enhedens ur er blevet stillet.

### B62. Assistenten skriver svaret, mens læseren ser på
- Baggrund: et svar tog 10-40 sekunder, og læseren så kun tre prikker. Modellerne bruger
  det meste af tiden på at ræsonnere, før første ord.
- Valg: `/api/chat` kan sende svaret som Server-Sent Events (`Accept: text/event-stream`):
  hvad der sker nu, kilderne, teksten i stykker og til sidst det kontrollerede svar. Kun
  selve svartrinnet strømmes. Alle kontroller er de samme som for JSON-svaret, og kun det
  kontrollerede svar gemmes.
- Vist tekst: en anden model skriver aldrig videre på den. Fejler hovedmodellen, eller består
  udkastet ikke en kontrol, trækkes det tilbage (»Skriver svaret om …«), og reservemodellen
  skriver et nyt. Først var en fejl efter vist tekst en fejl for læseren; efter den
  uafhængige gennemgang får læseren i stedet reservemodellens svar, som uden strøm.
- Interne navne fra prompten: slutningen af teksten holdes tilbage, så længe den kan være
  begyndelsen på et sådant navn, så navnet heller ikke vises i dele.
- En strøm, der lukker uden at modellen har sagt, den er færdig, er et halvt svar.
- Formen på Workers AI's strøm er ikke dokumenteret. Den er læst for begge modeller
  2026-11-14 gennem REST-API'et og lagt ind som test. En ukendt form har sin egen loglinje.
- Fravalgt: at strømme det trin, der kan ende i et værktøjskald (det er ikke altid et svar),
  og WebSocket (kræver mere kode og giver intet, Server-Sent Events ikke giver her).
- Nødbremse: `STREAMING_ENABLED` i `functions/lib/chat/limits.js`; sat til `false` får alle
  kald JSON-svaret som før. Det kræver en udgivelse.

#### B62, tilføjelse efter den opfølgende gennemgang (2026-11-14)
- Et udkast, der slutter, fordi tokengrænsen er nået, trækkes altid tilbage. Derfor vises
  den tilbageholdte slutning heller ikke: den kan være første halvdel af et internt navn.
- Afslutningsårsagen læses også, når den står ved siden af `response` (den ældre form), så
  et afskåret udkast i den form ikke tæller som færdigt.
- Et stykke er kun kendt, når det har svartekst, en afslutningsårsag, ræsonnering, en rolle
  eller er den tomme hale med forbrug. Alt andet er en ukendt form og logges som
  `unknown_primary_stream` eller `unknown_fallback_stream`, også når strømmen lukker uden
  `[DONE]`. Før blev det logget som et afskåret svar, og fejlen ville ligne en langsom model.
- Kontrollen af det færdige svar og tilbageholdelsen under strømmen sammenligner bogstaver
  ens (kun ASCII foldes), så det ene ikke lader noget passere, som det andet afviser.
- Fravalgt: at vise et afskåret udkast med en bemærkning. Et halvt svar om elinstallation
  eller YAML er værre end ti sekunders ventetid på reservemodellen.

### B62, tilføjelse efter udgivelsen (2026-11-14)
- Fundet: målt på den levende side med »Hvordan får jeg lyset til at tænde ved bevægelse?«
  (intet smart home-ord) valgte modellen selv, om der skulle søges. Læseren så »Læser dit
  spørgsmål …« i 33 sekunder, fik hele svaret på én gang og ingen kildelinks, selv om siden
  har flere guides om netop det. Et spørgsmål med et ord som »Zigbee« viste kilder efter
  0,14 sekunder og strømmede teksten.
- Valgt: søg i sidens eget indeks ved hvert spørgsmål, og lad modellen aldrig få et værktøj.
  Opslaget er lokalt (få små filer, millisekunder, ingen pris). Resultatet bruges, når
  spørgsmålet har et smart home-ord, eller når det bedste svar har mindst 12 point
  (`USEFUL_SCORE`). Ellers svarer modellen uden sidens tekst og uden kilder.
- Grænsen er målt mod det byggede indeks: spørgsmål om siden fik 13,33 eller mere, spørgsmål
  om andet 9,42 eller mindre. Bygget vogter den med to lister og giver en advarsel på
  kørslen, når et spørgsmål flytter over grænsen.
- Fravalgt: at lade bygget stoppe på de to lister. Point flytter sig med hver ny side, og
  nyhederne udgives af sig selv hver dag. Et stop ville lade hele siden stå stille for en
  fejl, der kun giver et svar med eller uden en kilde. Grænsen selv er holdt af en test mod
  et fast indeks.
- Søgningen får det seneste spørgsmål alene (opslag A). Kun når A er svagt, og spørgsmålet
  peger tilbage (»den«, »det«, »it«, »og …«, »hvad med …«, »what about …«), søges det igen sammen
  med den ene brugerbesked før det (opslag B, det seneste først, da kun de første 10 ord
  tæller). B bruges kun, når det selv er stærkt. Højst to opslag, og `searching` meldes én gang.
  Første udgave søgte altid de to beskeder som ét og kunne ikke skifte emne.
- Fundet af den uafhængige gennemgang: (1) blokerende: »Hvilken robotstøvsuger er bedst?« og så
  »Hvad er MQTT?« gav kun sider om robotstøvsugere. (2) Et smart home-ord med et fejlet eller
  tomt opslag gav modellen »referencedata er givet« og `{"results":[]}`; nu giver fejl
  »søgningen er ikke tilgængelig« og et tomt resultat »intet fundet«, uden referenceblok.
  (3) Hverdagssnak nåede pointgrænsen, mest på engelsk (»Tell me a joke« 16,14, »ja tak« 14,43):
  fyldord er tilføjet (4 af 20 danske og 10 af 24 engelske hverdagsspørgsmål lå på 12 eller
  mere; efter 2 og 6). (4) Enkeltordsspørgsmål som »Hvad er en hub?« (6,45) nåede ikke grænsen:
  utvetydige smart home-ord er føjet til ordlisten. (5) Rester af værktøjsruten (`reading`).
  Fem ændringer af koden overlevede de tests, gennemgangen prøvede; fire har nu en test (alle tidligere
  beskeder i søgeteksten, smart home-ordet fra en ældre besked, en besked på ét tegn og
  `<`-undgåelsen i referenceblokken). Den femte, at bygget stopper i stedet for at advare, kræver et byggeri og er ikke prøvet.
- Fravalgt: altid at sammenføje de to beskeder. Det forurenede søgningen ved emneskift, og et
  »Tak« efter et emne fik det emnes kilder vist igen.
- Fravalgt: at bruge flere beskeder end den ene før den seneste. Et emne to svar tilbage er
  oftere støj end hjælp, og højst to opslag holder underforespørgslerne under Workerens grænse.
- Værktøjsruten er fjernet helt (`SEARCH_TOOLS`, `MAX_MODEL_RUNS`, trinnet `reading`):
  ét modelkald, der altid kan strømmes.
- Fravalgt: at lade modellen vælge med et værktøj. Det gav 33 sekunder uden tekst, ingen
  kilder og to modelkald, og valget var ikke til at forudsige.
- Fravalgt: kun en ordliste, som i dag tvinger opslaget. Den misser almindelige spørgsmål som
  »lys ved bevægelse« og skulle følge hver ny side.
- Kendt grænse: nogle engelske spørgsmål om andet ligger tæt på grænsen (»Who won the 2022
  World Cup?« 13,23), så de får en irrelevant kilde. De står ikke i prøvelisterne.

### B62, tilføjelse efter den anden gennemgang af søg først (2026-11-14)

Valgene her om »den« først, kendeord, ord der peger tilbage og tak er taget tilbage efter den
tredje gennemgang; se næste tilføjelse. Tallene i denne tilføjelse er målt med 522 samtaler,
som den, der skrev reglen, selv valgte. Det, der står om, hvad reglen fangede, gjaldt den
udgave og ikke den udgivne.

- Fundet af gennemgangen, blokerende: en opfølgning uden et ord, der peger tilbage (»Kan du
  uddybe?«, »Hvorfor?«, »Forklar nærmere«, »Vis mig et eksempel«), blev kun søgt alene og fik
  ingen sider. Målt med 20 opfølgninger efter fem danske og fire engelske åbningsspørgsmål
  fik 35 af 100 danske og 29 af 80 engelske samtaler en side fra åbningens emne.
- Valgt: en besked er også en opfølgning, når den spørger om noget (et spørgsmålstegn eller en
  åbning som »hvad«, »kan«, »forklar«, »vis«), og opslaget alene ikke mødte et søgeord, som
  ingen side bruger. Begrundelse: »Kan du uddybe?« består kun af ord, siden kender, og siger
  intet om et nyt emne. »Hvad er hovedstaden i Frankrig?« har to ord, ingen side bruger, og er
  et emneskift. Søgningen tæller de ukendte ord og giver tallet videre (`report.unknownTerms`).
- Valgt: et spørgsmål med et ord, der kun kan stå for en ting, samtalen har nævnt (»den«,
  »dem«, »dens«, »them«, »which one«, »Does it …?«), søges sammen med spørgsmålet før først.
  Begrundelse: »Virker den med Zigbee?« alene finder sider om Zigbee, ikke om tingen. Når
  opslaget sammen med spørgsmålet før ikke grænsen, søges spørgsmålet alene.
- Valgt: »den«, »det« og »de« foran et tillægsord er kendeord og peger ikke tilbage (»den
  bedste lås«). Reglen kender det på, at næste ord ender på -e eller er »mest« eller »mindst«.
  Begrundelse: uden undtagelsen gav »Hvad er den bedste smart lås?« det gamle emnes sider i 5
  af 5 samtaler. Prisen: »Kan den styre varmen?« læses også som kendeord; beskeden spørger
  stadig og fanges af reglen ovenfor.
- Valgt: »Does it …?« tæller kun i begyndelsen af beskeden, og »they«, »these«, »those«,
  »denne« og »disse« står ikke for en ting. Begrundelse: »How does it work with solar panels?«
  gav det gamle emne i 4 af 4, og »Do they make a smart lock?« handler ikke om noget nævnt.
- Valgt: en tak eller et farvel uden spørgsmålstegn søges der ikke efter. Begrundelse:
  »Perfekt, tak skal du have« fik kilder, fordi »have« også er havens ord, og »Tak for det«
  peger tilbage med »det«.
- Valgt: flere former af smart home-ordene (»hubberne«, »gatewayen«, »kameraer«, »elpriserne«),
  »Ok Nabu«, »Nabu Casa« og »wake word«, og fire undtagelser for hverdagsbrug (»ha'«, »not
  matter«, »this thread«, »social security«). Begrundelse: »ok« er fyldord, så »Ok Nabu« gav
  ingen søgeord; »It doesn't matter« tvang et opslag.
- Målt efter ændringen: 83 af 100 danske og 73 af 80 engelske opfølgninger får en side fra
  åbningens emne. Takker og bekræftelser: 10 af 80 og 12 af 64 (alle uden et takkeord).
  Spørgsmål om andet: 15 af 50 og 21 af 40. Nye smart home-emner: 5 af 25 og 2 af 20.
- Kendte grænser, ikke rettet: en bekræftelse uden tak (»Det lyder godt«, »That helps«) og et
  spørgsmål om andet med »det«, »it« eller »this« i (»Hvad er det for et vejr i dag?«) får det
  gamle emnes kilder. Et engelsk spørgsmål om andet, hvor siden bruger alle ordene (»Who won
  the 2022 World Cup?«), tæller som opfølgning. En opfølgning, der når grænsen alene (»Hvor
  lang tid tager det?«), får sine egne sider. Smart home-ord med en hverdagsbetydning (»hue«,
  »pære«, »IKEA«) tvinger stadig opslaget.
- Fravalgt: at lade enhver besked efter et emne arve emnet. Det giver kilder til »Super« og
  til ethvert emneskift. Fravalgt: at lade modellen afgøre det; det var fejlen i første udgave.
- Kontrolleret: `npm run site:test`; 45 fejl sat ind i koden én ad gangen, og testene fejler
  på dem alle (den ene først efter et nyt eksempel i testen); målingen ovenfor.

### B62, tilføjelse efter den tredje gennemgang af søg først (2026-11-14)

- Fundet af gennemgangen, blokerende. Alle tre fejl var indført af ordreglerne i forrige
  tilføjelse: (1) takkereglen slugte en anmodning med et takkeord og uden spørgsmålstegn
  (»Vis mig hvordan jeg sætter Zigbee2MQTT op, tak« blev ikke søgt); (2) reglen om »den«
  først tog over, også når beskeden selv nævnte sin ting (»Jeg har købt en Shelly Plug S.
  Hvordan sætter jeg den op?« efter et spørgsmål om elbilen); (3) kendeordsreglen gjorde, at
  »Det virkede ikke« intet fik.
- Valgt: de tre ordregler er taget ud igen i stedet for at blive lappet en gang til. Tilbage
  står én regel: en besked søges alene først, og et brugbart resultat bruges; finder den
  intet, og bruger siden alle dens søgeord, søges den sammen med brugerbeskeden før.
  Begrundelse: hver ordregel fangede sine egne eksempler og tog andre spørgsmål med sig, og
  tre runder viste, at flere ord ikke retter det. Reglen ser nu kun på to ting, søgningen selv
  måler: point og ukendte søgeord.
- Valgt: ord, der peger tilbage (»den«, »det«, »og …«), afgør ikke længere noget. Målt (på
  indekset før de seks nyeste sider) fik opfølgninger de samme sider med og uden dem, mens de
  lod spørgsmål om andet med »det« i få det gamle emnes sider: 48 af 96 danske spørgsmål om
  andet var uden kilder med ordene, 60 uden dem.
- Valgt: en ren afslutning søges der ikke efter. Den kendes på, at beskeden ikke har et
  spørgsmålstegn og kun består af afslutningsord (tak, farvel, hilsen, »fint«) og fyld omkring
  dem. Begrundelse: et takkeord et sted i beskeden var for bredt; nu gør ét andet ord beskeden
  til noget, der søges efter. »Ja« og »nej« er ikke afslutninger: de svarer på noget,
  assistenten spurgte om, og skal have emnets sider.
- Pris, kendt: et spørgsmål om andet, hvor siden bruger alle ordene (»Hvad er klokken?«,
  »Hvad er 12 gange 12?«), tæller som opfølgning og får det gamle emnes kilder. Rækken er
  dårligere end før (60 mod 66 af 96 danske uden kilder, 40 mod 55 af 80 engelske). Valgt
  alligevel, fordi opfølgningerne er meget bedre (57 mod 9 af 84 danske, 66 mod 6 af 80
  engelske; bare fortsættelser 54 mod 0 af 60 og 47 mod 2 af 50), og fordi en forkert kilde
  ved et spørgsmål om andet koster mindre end et svar uden sider på »Hvorfor?«.
- Pris, kendt: en opfølgning med ét ord, siden ikke bruger (»Den blinkede bare rødt«), søges
  ikke sammen med beskeden før. Modellen har stadig hele samtalen.
- Fravalgt: at beholde »den« først med flere undtagelser. Fravalgt: at lade ord, der peger
  tilbage, tilsidesætte de ukendte søgeord; det gav kilder til spørgsmål om andet.
- Kontrolleret: gennemgangens egne 1.281 samtaler (696 danske, 585 engelske) kørt mod det
  byggede indeks med ny og gammel kode; dens 15 fejleksempler (14 falder nu som ønsket, »Den
  blinkede bare rødt« får intet); 46 fejl sat ind i koden én ad gangen, og testene fejler på
  dem alle; `npm run site:test`. Tal og grænser: `docs/assistent.md`, "Målt med samtaler".

### B62, tilføjelse efter den fjerde gennemgang af søg først (2026-11-14)

Denne tilføjelse afløser reglerne om opfølgninger i de tre tilføjelser ovenfor.

- Fundet af gennemgangen, blokerende. Begge fejl kom af reglen »finder beskeden intet alene,
  og bruger siden alle dens søgeord, søges den sammen med brugerbeskeden før«: (1) et nyt emne
  lige under pointgrænsen (»Hvordan styrer jeg min garageport?«, 11,81 point) fik det
  tidligere spørgsmåls sider, i 55 af gennemgangens 240 samtaler med et nyt emne; (2)
  afslutninger og spørgsmål om assistenten i andre ord end listens (»Tak for din hjælp«,
  »Hvem er du?«, »👍«) fik det tidligere emnes kilder.
- Målt, før der blev valgt: på gennemgangens egne beskeder skiller hverken bedste point,
  antallet af søgeord eller hvor mange stykker af siden der bruger hvert ord, en opfølgning
  fra et nyt emne eller en afslutning. »Kan du uddybe?« og »Hvem er du?« ser ens ud for
  indekset. Fire runder har vist det samme på hver sin måde.
- Valgt: en besked søges altid alene og højst én gang, og siderne fra et tidligere spørgsmål
  gives aldrig til en senere besked. Begrundelse: det er den eneste regel, hvis fejl altid er
  den samme og den mildeste, nemlig et svar uden kilder. Et link til en side om noget andet
  under et »Tak« eller et nyt spørgsmål koster læserens tillid; en manglende kilde gør ikke.
- Valgt: en senere besked uden sider får sin egen tilstand i prompten (`continued`). Modellen
  får at vide, at der ikke er givet en side til den seneste besked: fortsætter den samtalen,
  svares der ud fra samtalen, uden at noget nyt fremstilles som kommende fra SmartBolig;
  spørger den om noget nyt, svares der ud fra bred viden. Begrundelse: teksten til en første
  besked (»der blev ikke fundet en relevant side«) passer ikke på »Kan du uddybe?«, hvor
  modellen lige har svaret ud fra sidens uddrag.
- Valgt: afslutningsordene og fyldet omkring dem står ord for ord i testen. Flere fyldord er
  kommet til efter gennemgangens egne afslutninger (din, dit, svar, og, jeg, vil, prøve,
  your, and, try m.fl.).
- Pris, kendt: en opfølgning uden eget emne får ingen nye uddrag og ingen kildelinks: 356 af
  524 danske og 340 af 485 engelske opfølgningssamtaler i målingen. Den forrige regel gav
  åbningens sider til en opfølgning uden »den« eller »det« i 57 af 84 danske og 66 af 80
  engelske samtaler. Modellen har stadig hele samtalen, også sit eget svar, og kilderne under
  det tidligere svar står der stadig.
- Pris, kendt: en opfølgning, der selv når grænsen (»Hvad koster det cirka?«), får sider om
  sine egne ord, ikke nødvendigvis om åbningens emne.
- Fravalgt: endnu en ordregel eller en grænse på point, antal søgeord eller ordenes
  sjældenhed. Målingen ovenfor viser, at ingen af dem skiller de tre slags beskeder ad.
- Fravalgt nu, muligt senere: at lade modellen skrive søgeteksten til en opfølgning. Det
  koster ét modelkald mere pr. opfølgning (neuroner og ventetid) og skal måles først. Også
  muligt: at give modellen det tidligere spørgsmåls uddrag mærket som tidligere, uden at vise
  dem som kilder.
- Kontrolleret: den tredje og den fjerde gennemgangs 2.261 samtaler på to beskeder (1.186
  danske, 1.075 engelske) mod det byggede indeks: i alle viser den senere besked præcis de
  kilder, den viser som første besked, og den søges højst én gang; 30 samtaler på tre
  beskeder ligeså. 181 fejl sat ind i koden én ad gangen, og testene fejler på dem alle;
  `npm run site:test`. Ikke kontrolleret før udgivelsen: hvordan den rigtige model svarer på
  en opfølgning med den nye prompt. Tal og grænser: `docs/assistent.md`, "Målt med samtaler".

### B62, tilføjelse efter den femte gennemgang af søg først (2026-11-14)

- Gennemgangen fandt ingen besked, der får et tidligere spørgsmåls sider: 520 samtaler i
  dens egne ord, også som strøm og med tre og fem beskeder, og de 2.261 kørt igen.
- Fundet: en tak i ord, ingen liste havde set, viser en irrelevant kilde i 11 af 100 (5 af 50
  danske, 6 af 50 engelske): »Tak, jeg vender tilbage«, »Thanks, I'll read the guide«. Det er
  beskedens egne sider. Fyldordene var udvidet ud fra de sæt, tabellen måler på, så tabellens
  to rækker om tak forudsagde det ikke.
- Valgt: ikke flere fyldord og ingen ny regel. Målt: et ord fra en sidetitel i beskeden
  skiller ikke en tak fra en anmodning med en tak i, og en regel om »tak først og intet
  spørgsmålstegn« tager anmodninger som »Mange tak, kan du også vise hvordan jeg opdager en
  vandlækage« med sig. Tallet står i dokumentationen som en kendt grænse. Den rigtige
  rettelse er den samme som for opfølgninger: at modellen selv siger, hvad der skal søges
  efter.
- Valgt: »HA« med store bogstaver er Home Assistant og gør en besked uden spørgsmålstegn til
  noget, der søges efter. Før blev »Hej, jeg skal have hjælp med HA« læst som en hilsen, fordi
  »ha« er fyld i »Ha en god dag«. Pris: »Tak, HA virker nu« søges og får sider om Home
  Assistant.
- Valgt: prompten til en senere besked uden sider siger nu, at modellen skal lægge bred viden
  til, hvor samtalen ikke har svaret, og nævner et svar på noget, assistenten spurgte om.
  Begrundelse: læst ordret gav den gamle tekst intet nyt til »Den blinker stadig rødt«.
  Prompten til en første besked siger ikke længere, at der blev søgt; efter en hilsen blev der
  ikke søgt.
- Valgt: de to ordlister er eksporteret, og testen sammenligner dem med sine egne. Før fejlede
  testen ikke på et ord, der blev sat ind, selv om dokumentationen sagde det.
- Kontrolleret: fem ændringer, gennemgangen viste, at ingen test fangede (modellen får kun den
  seneste besked; officielle kilder fra hele samtalen; en afslutning med et smart home-ord
  søges; kun et spørgsmålstegn til sidst tæller; et nyt emne afvises), har nu hver sin test.
  195 fejl sat ind i koden én ad gangen, og testene fejler på dem alle.

## B63. Forsiden: værktøjer med elprisen lige nu (2026-11-14)

- Valgt: en sektion på forsiden efter de tre etaper med et kort, der viser elprisen i dette
  kvarter, dagens timer og de billigste tre timer i træk, og en række pr. værktøj.
  Begrundelse: forsiden skal vise noget, der er sandt lige nu, og som læseren kan bruge med
  det samme; værktøjerne er det, der adskiller siden fra en samling guides.
- Valgt: samme regnestykker og samme hentning som elprisværktøjet (`price-view.mjs`,
  `price-data.mjs`). Det samme ét sted: `isPrices` og kaldet til `/api/elpris` er flyttet ud
  af `price-ui.mjs`.
- Valgt: koden hentes først, når kortet er 600 px fra skærmen (IntersectionObserver og
  dynamisk import), så forsidens første visning ikke bliver tungere.
- Valgt: ingen tal i den byggede side og ingen opdigtede tal ved fejl. Kortet viser da en
  tekst og et link til værktøjet.
- Valgt: søjlerne står på nul, ikke på dagens laveste pris. En afkortet akse får små
  forskelle til at se store ud.
- Fravalgt: prisen i heroen. Heroen er husets; en pris dér ville konkurrere med 3D-huset og
  flytte indhold, når tallet kommer.
- Kontrol: `npm run site:test` (8 nye tests), bygget side i headless Chrome med et optaget
  svar fra Energinet gennem endpointets egen kode: mørkt og lyst tema, 390, 768 og 1440 px,
  dansk og engelsk, og med en fejl fra Energinet. Ikke set: kortet mod det levende endpoint.

### B64. Tidsplanerne tåler, at GitHub springer en kørsel over
- Baggrund: 2026-11-14 var der endnu ikke startet én planlagt kørsel i repoet, hverken af
  nyhederne eller sidevagten. GitHub lover ikke, at en planlagt kørsel starter.
- Valg, nyheder: hver af de to daglige kørsler får en reserve nogle timer senere (08:37 og 14:37 UTC; 08:37 holder 90 minutters afstand til Dependabot mandag kl. 07:00). Et lille job
  (`slot`) spørger GitHub, hvilke planlagte kørsler der er startet i dag; reserven skriver
  kun, hvis den kørsel, den står for, ikke er startet. Reglen ligger i
  `scripts/ai-news-slot.mjs` og er testet uden netværk.
- Hvorfor ikke bare fire forsøg: en dag uden nok kontrollerede historier ville bruge
  modelkald fire gange i stedet for to. Kvalitetskravene er uændrede.
- Kan listen over kørsler ikke læses, skriver kørslen. En mistet dag er værre end et ekstra
  forsøg, og dagsspærren i relayet (8.000 neurons) holder stadig prisen på nul.
- Valg, sidevagt: tre kørsler i døgnet i stedet for to, og en manuel kørsel kan pege på en
  anden adresse (`base`), så alarmen kan ses virke uden at ødelægge noget.
- Valg, repo: `SECURITY.md` med privat indberetning, den tomme wiki slået fra, og en test
  (`scripts/site-workflows.test.mjs`), der kræver, at hver handling i hver workflow er låst
  til et commit, og at intet job får rettigheder, det ikke selv har nævnt.
- Fravalgt: en udenforstående tjeneste til at starte workflowet. Den kræver et GitHub-token,
  som ejeren skal oprette; det står på ejerens liste (punkt 10) og tages kun i brug, hvis
  planlagte kørsler bliver ved med at udeblive.
- Set samme dag, efter at dette var skrevet: den første planlagte nyhedskørsel startede af sig
  selv 2026-11-14 kl. 11:43 UTC, seks minutter efter planen (11:37), og lykkedes. Planlagte
  kørsler virker altså i repoet. Reserven beholdes: GitHub lover stadig ikke, at hver kørsel
  starter, og den koster ingenting, når den almindelige kørsel er startet.
## B65. Startsæt-bygger (2026-11-14)

- Valgt: endnu et værktøj (det femte), `/vaerktoejer/startsaet/`, som ideen i B60 beskrev. Fire spørgsmål
  (hvad vil du starte med, ejer eller lejer, hvad har du i forvejen, vil du bygge selv med
  ESP32) giver et startsæt i tre lag (hjernen, forbindelsen, en blok pr. mål) og tre til fem
  første skridt.
- Valgt: produkter kun fra registret, købslinks kun gennem `<AffiliateLink>` bygget på
  serveren, og ingen priser. Hvor registret intet produkt har (computeren til Home Assistant,
  en aflæser til HAN-porten, ESP32-dele), står der "Ingen købsanbefaling endnu" og et link til
  guiden. Begrundelse: et værktøj må ikke opfinde produkter, og priser skifter.
- Valgt: alle dele og skridt står i siden fra start, og scriptet skifter kun `hidden`.
  Begrundelse: et svar kan aldrig blive til et link eller til HTML, og uden JavaScript viser
  siden stadig et helt sæt (lejerens, med alle mål).
- Valgt: lejer er startsvaret, og et ukendt svar bliver til det forsigtige valg. En lejer får
  aldrig en del af den faste installation; ejerens dimmer siger, at en autoriseret
  elinstallatør skal montere den. En lejer med radiatortermostat får "skriv til din udlejer"
  som første skridt.
- Valgt: sættet er bygget til Home Assistant med en Zigbee-koordinator, også for en læser med
  en bro fra Hue eller IKEA. Begrundelse: guiderne dækker Hue-pærer på en Hue Bridge (`smart-belysning.mdx`), men
  sættet giver stadig én vej, koordinatoren, og siger det åbent.
- Valgt: ZHA og Zigbee2MQTT nævnes begge, uden at sættet vælger. Begrundelse: `start.mdx` og
  `zigbee-koordinatorer.mdx` anbefaler hver sin til en begynder.
- Valgt: blokken Sikkerhed er besked på telefonen (dør- og bevægelsessensor), ikke sirene
  eller kamera; sættet siger, at det ikke er en alarm.
- Valgt: samme sensor står kun ét sted. Deler to mål en sensor, peger den anden blok på den
  første.
- OSS og data: ingen nye pakker og ingen data udefra. Intet gemmes, og intet sendes.
- Kontrol: `npm run site:test` (25 tests i tre nye filer; reglerne køres for alle 384
  kombinationer af svar), `python scripts/content-audit.py`, `npm run build` og
  `npm run seo:validate`; den byggede side i headless Chrome i begge temaer ved 320, 375, 390
  og 1440 px, på begge sprog, med tastatur og uden JavaScript. Ikke set: en skærmlæser, og om
  butikkernes adresser bag købslinkene virker.

## B66. Værktøjer: Zigbee-kanalvælger og batterilevetid (2026-11-14)

- Valgt: to værktøjer mere i den fælles ramme (B61): en Zigbee-kanalvælger og en beregner af
  batterilevetid. Begrundelse: begge svarer på spørgsmål, guiderne ellers kun kan svare på med
  "det kommer an på": hvilken Zigbee-kanal passer til mit Wi-Fi, og hvor længe holder en
  batterisensor.
- Valgt: kanalvælgeren regner kun på frekvenser. Zigbee-kanal n ligger på 2405 + 5 × (n − 11)
  MHz, Wi-Fi-kanal m på 2412 + 5 × (m − 1) MHz. En Wi-Fi-kanal regnes 22 MHz bred. Det er vores
  valg af den bredeste almindelige maske, ikke en kildeoplysning, og det står på siden.
- Valgt: kanal 26 anbefales aldrig først, og lige stillede kanaler vælges i rækkefølgen 15,
  20, 25, 11. Begrundelse: ZHA's dokumentation foretrækker 15, 20 og 25 og siger, at ikke alle
  enheder understøtter alle kanaler. Der er ingen officiel kilde til, hvorfor netop 26 volder
  problemer, så siden påstår det ikke.
- Valgt: frekvensstriben tegnes på serveren som inline SVG. Begrundelse: siden giver mening
  uden JavaScript, og der er intet at hente.
- Valgt: batteriberegneren har ét forvalg (ESP32-chip, 10 µA i Deep-sleep), og det har et
  kildelink til Espressifs datablad. Fravalgt: forvalg for færdige sensorer; vi har ikke et
  datablad for dem, og et tal uden kilde er et gæt. Siden beder læseren måle.
- Valgt: et tal med tusindtegn afvises med en tekst, der siger, hvordan tallet skal skrives,
  som i de andre værktøjer.
- Fravalgt: at gemme læserens tal i browseren (samme regel som B61).

### B66, tilføjelse efter gennemgangen (2026-11-14)

- Fundet: kanalvælgeren valgte kanalen med størst afstand og brugte 15, 20, 25, 11 kun ved lige
  stilling. Ved Wi-Fi 1 + 11 anbefalede den 17, selv om 15, 20 og 25 var fri. Det stred mod
  Zigbee2MQTT (ZLL-kanalerne 11, 15, 20, 25) og ZHA (15, 20, 25), som siden selv henviser til.
  Teksten glemte også, at kanal 26 holdes ude, og kaldte kanal 25 "længst fra Wi-Fi".
- Valgt: de anbefalede kanaler først. Er en af 15, 20, 25, 11 fri, vælges den med størst afstand.
  Er de alle dækket, vælges en anden fri kanal fra 11 til 25, og teksten siger, at den ikke er
  blandt de anbefalede. Overlapper alle, vælges 15, 20, 25, 11 og så det laveste nummer.
- Valgt: kanal 26 anbefales aldrig. Er den fri, siger teksten det og forklarer, at den holdes ude
  af en forsigtig regel, ikke ud fra en kilde.
- Valgt: batteriets levetid vises i timer under et døgn og "under en time" under en time, og
  procenterne for søvn og vågen giver tilsammen 100.
- Fravalgt: ren størst afstand. Den ser ud som den mest præcise regel, men den modsagde de kilder,
  siden viser, og den gav kanaler, ingen af kilderne nævner.
