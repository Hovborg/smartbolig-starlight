# 3D-huset

Sidst opdateret: 2026-11-14.
Kontrolleret ved: forsiden åbnet i browser (1440, 820 og 390 px, mørkt og lyst tema, dansk og
engelsk), WebGL slået fra, `npm run house:posters` kørt, `npm run site:test` grøn. Scenen
`bench` er kontrolleret ved at se de to tegnede billeder.

Huset på forsiden er en three.js-model, bygget af egne dele. Der er ingen hentede modeller
eller billeder i det. three.js (MIT, version låst i `package.json`) hentes først, når huset
skal vises levende.

## Hvor tingene ligger

| Sti | Indhold |
|---|---|
| `src/lib/house3d/index.mjs` | Indgangen: `mountHouse(canvas, options)`. Giver `null` uden WebGL |
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
| `src/lib/home-house-stage.mjs` | Henter modellen, kobler lærred, markører, træk og knapper |
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

Forsiden henter `index.mjs` og får derfor aldrig scenerne med; kun `house-render.mjs` pakker
`stills.mjs`.

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

## Fejlsøgning

| Det ser du | Årsag og løsning |
|---|---|
| Billedet bliver stående, ingen markører | WebGL mangler, fejlede eller blev taget fra siden af browseren (`webglcontextlost`). Se konsollen: "3D house unavailable". Siden virker stadig |
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
`src/lib/guide-art.mjs` og `public/images/guide/`. Ret testene i
`scripts/site-quality.test.mjs`, der nævner huset.
