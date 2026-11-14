# 3D-huset

Sidst opdateret: 2026-11-14.
Kontrolleret ved: forsiden åbnet i browser (1440, 820 og 390 px, mørkt og lyst tema, dansk og
engelsk), WebGL slået fra, `npm run house:posters` kørt, `npm run site:test` grøn. Scenen
`bench` er kontrolleret ved at se de to tegnede billeder. Tegningen i en worker er målt og
set i headless Chrome med grafikkort, med firedoblet CPU-belastning, i telefonstørrelse og
med software-tegning (tallene står under "Kvalitet og hastighed"). De fire veje (worker,
på siden, software-tegning, slået fra) er kørt igen på den byggede side 2026-11-14 efter
den uafhængige gennemgang.
Ikke kontrolleret: Safari og Firefox på en rigtig enhed. Safari 16.4 til 16.6 (lærred i
worker uden WebGL) er kun afprøvet med en efterlignet browser i
`scripts/site-house-stage.test.mjs`.

Huset på forsiden er en three.js-model, bygget af egne dele. Der er ingen hentede modeller
eller billeder i det. three.js (MIT, version låst i `package.json`) hentes først, når huset
skal vises levende, og kun i en browser, der kan tegne det med et grafikkort.

## Hvor tingene ligger

| Sti | Indhold |
|---|---|
| `src/lib/house3d/index.mjs` | Indgangen, når huset tegnes på siden: `mountHouse(canvas, options)`. Giver `null` uden WebGL |
| `src/lib/house3d/remote.mjs` | Indgangen, når huset tegnes i en worker: samme `mountHouse`, men lærredet gives til workeren, og hvert kald sendes som en besked. Indeholder ikke three.js |
| `src/lib/house3d/worker.mjs` | Workeren: bygger huset med `engine.mjs` og sender markørernes pladser tilbage for hvert billede |
| `src/lib/house3d/protocol.mjs` | Beskederne mellem side og worker, og listen over de kald, siden må sende |
| `src/lib/house3d/probe.mjs` | Spørger browseren, hvor huset kan tegnes: `drawingPlace` svarer `worker`, `page` eller `none`. Henter intet selv |
| `src/lib/house3d/canvas.mjs` | Et tomt lærred til tegnede teksturer, på siden eller i en worker |
| `src/lib/house3d/first-frame.mjs` | Hvornår første billede må vises: når shaderne er oversat, dog senest efter 2,5 sekunder |
| `src/lib/house3d/engine.mjs` | Løkken og kameraets flyvning. Med bevægelse slået til tegnes hvert billede, mens huset er synligt; uden bevægelse kun, når noget ændrer sig. `setMode`, `setView`, `rotate`, `resize`, `dispose` |
| `src/lib/house3d/stage.mjs` | Scene, kamera, lys, skygger og blanding mellem to tidspunkter |
| `src/lib/house3d/modes.mjs` | **Tidspunkter** (sol, himmel, hvad der er tændt) og **kameraer** |
| `src/lib/house3d/rig.mjs` | Samler modellen af delene i `parts/`: kanaler (hvad der kan tændes), vægge, bevægelige ting og markørernes punkter |
| `src/lib/house3d/post.mjs` | Efterbehandling i høj kvalitet (kontaktskygger, glød) |
| `src/lib/house3d/backdrop.mjs` | Disen bag huset i tidspunktets farve |
| `src/lib/house3d/kit.mjs`, `textures.mjs`, `palette.mjs` | Byggeklodser, tegnede teksturer og farver |
| `src/lib/house3d/parts/` | Én fil pr. del: `shell` (hus), `interior` (møbler), `devices`, `outdoor`, `foliage`, `car`, `links` |
| `src/lib/house3d/stills.mjs` | Indgangen for stillbilleder: huset plus **scener**, der kun findes som billede |
| `src/lib/house3d/parts/workbench.mjs`, `workbench-faces.mjs` | Scenen `bench`: ESP32-kort på et arbejdsbord (mål i centimeter) og dens tegnede flader |
| `src/lib/home-house.mjs` | Forsidens tilstand: tidspunkt og kapitel |
| `src/lib/home-house-stage.mjs` | Spørger `probe.mjs`, henter modellen til det sted, den kan tegnes, kobler lærred og markører, og går tilbage til stillbilledet, hvis tegningen falder ud |
| `src/lib/home-house-input.mjs` | Træk og de to drejeknapper, og hvornår modellen hentes |
| `src/components/home/HomeStage.astro`, `HomeTour.astro` | Skærmen og rundturen |
| `scripts/house-render.mjs`, `house-posters.mjs` | Tegner stillbilleder i headless Chrome |

## Ændr et tidspunkt

Åbn `src/lib/house3d/modes.mjs`. Hvert tidspunkt har `sun` (retning i grader, styrke, farve),
`sky`, `env`, `haze` og `levels`. `levels` er tal mellem 0 og 1 for hver kanal, fx `living`
(stuens lamper), `garden`, `tv`, `lock`, `ev` og `blinds.living`. Ret tallet, og se resultatet
på forsiden. Kør `npm run house:posters` bagefter: der findes stillbilleder for alle fire
tidspunkter (heroen viser aftenen).

## Tilføj et kapitel i rundturen

1. Tilføj kameraet i `views` i `modes.mjs` (`az` og `el` i grader, `dist` afstand, `target` punktet
   kameraet ser på).
2. Tilføj kapitlet i `src/lib/home-copy/da.ts` og `en.ts` under `hero.tour.chapters` med samme
   `id` som kameraet og et `mode`, der findes.
3. Kør `npm run site:test`. Testen "the tour, the hotspots and the 3D house agree" fejler, hvis
   navnene ikke passer sammen.

## Tilføj en ting i huset

Læg den i den fil under `parts/`, den hører til, eller i en ny fil, som `rig.mjs` henter.
Brug byggeklodserne i `kit.mjs` og farverne i `palette.mjs`. En ting, der skal kunne tændes,
melder sig til en kanal; se lamperne i `parts/devices.mjs`.

## Stillbillederne

Alle billeder af huset står i listen `PICTURES` i `scripts/house-posters.mjs`:

| Navn | Bruges i |
|---|---|
| `house-evening` | Heroen, før modellen er hentet, og hvor WebGL mangler |
| `house-morning` | Udvalgte guides (`HomeFeaturedGuides.astro`) |
| `topic-<emne>` | Emnekortene (`HomeGoalNavigator.astro`), ét pr. emne-id i `src/lib/home-copy/types.ts` |
| `guide-<motiv>` | Toppen af hver guide (`GuideHead.astro`), ét pr. motiv i `src/lib/guide-art.mjs`. 1600 × 640, i `public/images/guide/` |

Tegn dem igen:

```bash
npm run house:posters
```

Kræver Chrome på maskinen (stien kan sættes med `CHROME_PATH`). Scriptet pakker modellen med
esbuild, tegner hvert billede i dobbelt størrelse og skriver AVIF og WebP i hver bredde i
`public/images/home/` (guidebillederne i `public/images/guide/`; mappen er billedets `folder`). Kør det, hver gang huset, lyset eller et kamera er ændret. Ét billede
alene: `npm run house:posters -- topic-esp32` (navnets begyndelse).

### Scener, der ikke er huset

Et billede med `scene: "<navn>"` viser en scene fra `src/lib/house3d/stills.mjs` i stedet for
huset. Der er én: `bench`, et ESP32-udviklingskort på et breadboard med en sensor, en lysdiode
og en telefon, der viser målingen. Den bruges af `topic-esp32` og `guide-diy`. Scenen bruger
husets lys, kamera og efterbehandling, så `mode` og `camera` virker som ellers.

Forsiden henter `worker.mjs` eller `index.mjs` og får derfor aldrig scenerne med; kun
`house-render.mjs` pakker `stills.mjs`.

Ny scene:

1. Byg den i en ny fil under `parts/` som en funktion `(parent, colors) => gruppe`. Læg den
   omkring scenens midte `(0.6, 0, 0.7)`, og hold den inden for 14 enheder derfra, ellers
   falder den uden for solens skygge.
2. Tilføj den i `scenes` i `stills.mjs`: tøm `rig.root`, og byg scenen i den.
3. Brug navnet som `scene` i `PICTURES`, og tegn billedet.

Fjern scenen `bench`: slet de to `workbench`-filer og linjen i `scenes`, og giv de to billeder
et kamera på huset igen.

### Tilføj et billede

1. Tilføj en linje i `PICTURES`: `name`, `mode` (tidspunkt), enten `view` (et navngivet kamera
   fra `modes.mjs`) eller `camera` (`az`, `el`, `dist`, `target`), størrelsen og bredderne i
   `widths`. `focus` fremhæver et system, som markørerne på forsiden gør. `scene` vælger en
   scene i stedet for huset.
2. Kør `npm run house:posters -- <navn>`, og se billedet i `public/images/home/`.
3. Brug det i komponenten med `<picture>` (AVIF først, så WebP) og faste `width` og `height`.
4. Kør `npm run site:test`. Testen "every picture rendered from the 3D house exists in every
   size and is used" fejler, hvis en fil mangler, eller billedet ikke bruges.

## Kvalitet og hastighed

- Høj kvalitet bruges på brede skærme med mus, lav på telefoner. Valget står i
  `src/lib/home-house-stage.mjs`.
- Modellen tegner ikke, når den er uden for skærmen, eller når fanen er skjult.
- Med bevægelse slået fra (enhedens indstilling eller knappen på skærmen) flyver kameraet
  ikke, og døgnet går ikke af sig selv.
- Huset tegnes i en worker (`OffscreenCanvas`), så siden kan rulles og klikkes, mens modellen
  bygges og tegnes. Første billede vises først, når alle shadere er oversat
  (`compileStage` i `stage.mjs`), så der ikke kommer et halvfærdigt billede. Det venter
  højst 2,5 sekunder (`COMPILE_LIMIT_MS` i `first-frame.mjs`); derefter tegnes huset alligevel.
- Tegner browseren WebGL i software (ingen grafikkort), bliver stillbilledet stående, og
  three.js hentes ikke: `probe.mjs` spørger, før noget hentes. `stage.mjs` afviser også en
  software-tegner, hvis den alligevel når dertil.
- three.js findes i to pakker i `dist/_astro/`: én til workeren (`worker-*.js`) og én til
  tegning på siden (`house3d.*.js`), hver på ca. 680.000 bytes (ca. 170 KB over nettet). En
  browser henter kun den ene.

Målt 2026-11-14 i headless Chrome (forsiden, dansk, mørkt tema):

| Måling | Før (på siden) | Nu (worker) |
|---|---|---|
| Sidens tråd blokeret, mens huset starter (computer med grafikkort) | 2.502 ms | 29-32 ms |
| Sidens tråd i brug i hvile | 0,78 s pr. sekund | 0,15 s pr. sekund |
| Software-tegning | huset startede og hakkede | stillbillede, 2 ms blokeret, three.js hentes ikke |
| Tegnet på siden (ingen worker) | 2.502 ms | 675 ms (shaderne oversættes ved siden af tegningen) |

På en telefon med firedoblet CPU-belastning er sidens tråd blokeret 547 ms under
indlæsningen. Det er sidens egen opbygning og Google Analytics, ikke huset.

### Sådan virker workeren

1. `home-house-stage.mjs` spørger `drawingPlace` i `probe.mjs`. Den laver et lille
   prøvelærred, beder om WebGL 2 med et grafikkort og giver det tilbage med det samme:
   - `worker`: et lærred i en worker kan tegne. `remote.mjs` hentes.
   - `page`: kun et lærred på siden kan tegne (ældre browsere, og Safari 16.4 til 16.6, hvor
     lærredet i en worker ikke har WebGL). `index.mjs` hentes, og huset tegnes på siden.
   - `none`: intet grafikkort. Stillbilledet bliver stående, og intet hentes.

   Kan workeren ikke startes, selv om svaret var `worker`, tegnes huset på siden.
2. `remote.mjs` starter `worker.mjs`, læser sidens farver og sender dem med lærredet.
   Et lærred, der er givet til en worker, kan ikke tages tilbage.
3. Hvert kald (`setMode`, `rotate`, `resize` ...) sendes som en besked. Workeren udfører kun
   kald, der står i `CONTROLS` i `protocol.mjs`.
4. Workeren sender markørernes pladser for hvert billede. Det første svar skifter skærmen fra
   stillbillede til levende.
5. Fejler workeren, eller tager browseren grafikken fra den, sender den `failed` eller `lost`,
   og siden går tilbage til stillbilledet.

Kode, der kører i workeren, må ikke bruge `document` eller `window`. Brug `blankCanvas` fra
`canvas.mjs` til tegnede teksturer. En test i `scripts/site-house-worker.test.mjs` fejler,
hvis en fil, workeren henter, bruger dem.

Workeren hentes fra siden selv. Så længe `public/_headers` har en `worker-src`, skal den
indeholde `'self'`: ellers afviser browseren workeren, og stillbilledet bliver stående. En
test i `scripts/site-quality.test.mjs` holder øje med linjen. Workeren får farver og
indstillinger som en besked; `remote.mjs` prøver beskeden af, før lærredet gives væk, fordi
et lærred, der er givet til en worker, ikke kan tages tilbage.

Prøv de andre veje i din egen browser: skriv i konsollen på forsiden, og genindlæs.

```js
sessionStorage.setItem("sb-house-draw", "page"); // tegn på siden, uden worker
sessionStorage.setItem("sb-house-draw", "none"); // som en browser uden grafikkort
sessionStorage.removeItem("sb-house-draw");      // tilbage til det normale
```

Valget gælder kun fanen og forsvinder, når den lukkes.

Slå workeren fra for alle (nødstop, hvis en browser tegner forkert i worker):

1. I `src/lib/house3d/probe.mjs`: slet linjen, der ender med `return "worker";`. Huset
   tegnes så altid på siden. Siden bygger stadig; resten kan blive liggende.
2. Slet de tests, der forventer en worker: `scripts/site-house-worker.test.mjs` og de
   tests i `scripts/site-house-stage.test.mjs`, der bruger `workers`. Kør `npm run site:test`.

Fjern workeren helt bagefter: slet også `handsOver` i `probe.mjs`, blokken
`if (place === "worker") { … }` og `handedOver` i `src/lib/home-house-stage.mjs`, filerne
`remote.mjs`, `worker.mjs` og `protocol.mjs`, og linjen om `remote.mjs` i
`scripts/site-quality.test.mjs`.

## Fejlsøgning

| Det ser du | Årsag og løsning |
|---|---|
| Billedet bliver stående, ingen markører, "3D house unavailable" i konsollen | Tegningen fejlede eller blev taget fra siden af browseren (`webglcontextlost`). Årsagen står i beskeden. Siden virker stadig |
| Billedet bliver stående, intet i konsollen | `probe.mjs` svarede `none`: browseren har ikke WebGL 2 med et grafikkort (se `chrome://gpu`), eller `sb-house-draw` står til `none` i fanen. Der hentes intet, og der skrives ingen fejl |
| Huset hakker, mens siden rulles | Det tegnes på siden. Se i udviklerværktøjets kildeliste, om `worker-*.js` kører. Gør den ikke, svarede `probe.mjs` `page`, eller workeren kunne ikke startes |
| Fejl i konsollen om `document is not defined` fra en worker | En fil under `house3d/` bruger `document`. Brug `blankCanvas` fra `canvas.mjs`, og kør `node --test scripts/site-house-worker.test.mjs` |
| Et ryk, når modellen tager over | Stillbilledet er forældet. Kør `npm run house:posters` |
| Et emnekort uden billede | Filen mangler i `public/images/home/`. Kør `npm run house:posters -- topic-<emne>` |
| Kapitlet skifter ikke ved rul | Kapitlets `id` mangler i `views`, eller siden kører uden `IntersectionObserver` |
| `house:posters` hænger | Chrome blev ikke fundet. Sæt `CHROME_PATH` |

## Fjern huset

Fjern `<HomeStage>`, `<HomeTour>` og `<HomeHouseScript>` fra `HomeHero.astro` og billederne
fra `HomeGoalNavigator.astro` og `HomeFeaturedGuides.astro`, slet
`src/lib/house3d/`, `home-house*.mjs`, `stage.css`, `tour.css`, `topics.css`, de to scripts og
`public/images/home/`, og kør `npm uninstall three esbuild`. Guidernes hoved bruger også
billeder af huset: fjern billedet i `src/components/guide/GuideHead.astro`, og slet
`src/lib/guide-art.mjs` og `public/images/guide/`. Slet `scripts/site-house-worker.test.mjs`,
`scripts/site-house-stage.test.mjs` og `scripts/lib/fake-house-page.mjs`, og ret testene i
`scripts/site-quality.test.mjs`, der nævner huset.
