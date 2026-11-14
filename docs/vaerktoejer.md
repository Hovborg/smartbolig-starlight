# Værktøjer: små beregnere på siden

Sidst opdateret: 2026-11-14.
De to nyeste værktøjer (Zigbee-kanalvælger og batterilevetid) er set i headless Chrome i mørkt og lyst tema ved
320, 375 og 1440 px, med flere indtastninger, med tastaturet og uden JavaScript. Siden er serveret uden
Cloudflares headers, så Content-Security-Policy er ikke prøvet i browseren; koden har ingen inline
handlers, ingen `style=` og ingen `innerHTML`, og en test holder øje med det.
En gennemgang 2026-11-14 af de to nyeste værktøjer rettede anbefalingen (se reglen under "Regler, der er valgt
med vilje"), tekster om kanal 26 og Wi-Fi-bredde, enheder i batterifelternes labels, timer under et døgn og
afrunding. Kontrolleret ved `npm run site:test` og med en lille falsk DOM, der kører `zigbee-ui.mjs` og
`battery-ui.mjs` (`scripts/site-tools-ui.test.mjs`). Kilderne er læst igen samme dag: ZHA's to grunde til 15/20/25,
Zigbee2MQTT's ZLL-kanaler, AN5185 (22 MHz i figur 1, 40 MHz som to tilstødende 20 MHz-bånd) og databladets
tabel 5-4. Ikke set i en browser efter rettelsen.
Kontrolleret ved: `npm run site:test`, `npm run build`, `npm run seo:validate`,
`npm run worker:build` og `npx wrangler deploy --dry-run` kørt på grenen. Elprisen og
strømforbruget er set i headless Chrome i mørkt og lyst tema ved 320, 375 og 1440 px, med et optaget svar fra
Energinet og med en fejl fra Energinet; kontrast og trykflader er målt, og tastaturet er prøvet.
Endpointets kode er kørt én gang mod det rigtige Energinet: ét kald gav begge prisområder.
En uafhængig gennemgang samme dag fandt, at et tal med tusindtegn blev læst tusind gange for
lavt, og seks mindre fejl; de er rettet og har hver sin test (se "Rettet efter gennemgangen").
En opfølgende gennemgang fandt fem ting mere i endpointet og forsidens kort; de er også rettet
(samme afsnit). Forsidens kort er målt i headless Chrome ved 320, 390 og 1440 px: kortet er lige
højt, før og efter priserne kommer (666, 582 og 611 px), så siden under det flytter sig ikke.
Efter udgivelsen 2026-11-14 svarede `/api/elpris` 502 på den levende side. Målt fra Cloudflares
net med en prøve-Worker samme dag: Energinets datasæt-adresse svarede 429 i 14 af 14 kald,
download-adressen svarede 200 med alle 192 rækker i 15 af 15 kald. Workeren spørger derfor
download-adressen først (se "Regler, der er valgt med vilje"). Rettelsen og fire mindre fund fra
gennemgangen efter udgivelsen har hver sin test; femten prøver med en rettelse taget ud viser, at
testene fanger hver af dem. En uafhængig gennemgang af rettelsen fandt ingen fejl, der skulle
rettes før udgivelse, og seks bemærkninger; fire er rettet, to står under "Kendt".
Startsæt-byggeren: `npm run site:test`, `python scripts/content-audit.py`, `npm run build` og
`npm run seo:validate` kørt på grenen. Den byggede side er set i headless Chrome i mørkt og lyst
tema ved 320, 375, 390 og 1440 px, på begge sprog, med tastatur og med JavaScript slået fra.
Alle 384 kombinationer af svar er sammenlignet med reglerne på den byggede side.
Ikke kontrolleret: Energinets svar omkring midnat og på de to dage, hvor uret stilles;
skærmlæsere på forsidens kort; Safari og Firefox.
Heller ikke: at butikkernes adresser bag startsættets købslinks virker (`docs/indtjening.md`),
og startsættet med en skærmlæser.

## Kort

Sektionen `/vaerktoejer/` har små værktøjer, der regner eller vælger for læseren. Der er fem:

- **Elprisen lige nu** (`/vaerktoejer/elpris/`): spotprisen i dag og i morgen, en graf time for
  time og de billigste timer i træk.
- **Hvad koster det at have apparatet tændt?** (`/vaerktoejer/stroemforbrug/`): watt, timer pr. dag og
  elpris giver kroner pr. dag, måned og år.
- **Zigbee-kanalvælger** (`/vaerktoejer/zigbee-kanal/`): læseren markerer Wi-Fi-kanal 1 til 13, og
  værktøjet tegner de 16 Zigbee-kanaler under dem, viser hvilke der overlapper og anbefaler én.
- **Batterilevetid** (`/vaerktoejer/batterilevetid/`): kapacitet, strøm i søvn og vågen, vågen tid og
  opvågningsinterval giver gennemsnitsstrøm og levetid.
- **Startsæt-bygger** (`/vaerktoejer/startsaet/`): fire spørgsmål giver et startsæt i tre lag
  (hjernen, forbindelsen, delene til målene) og tre til fem første skridt. Se
  "Startsæt-byggeren" længere nede.

Hvert værktøj er tre dele: en Astro-komponent (felterne), et rent modul (regnestykket eller
reglerne, med tests) og et UI-modul (kobler felterne til det rene modul). Alle værktøjer sidder
i den samme ramme, `ToolFrame.astro`.

Elprisværktøjet henter priserne hos sidens egen Worker på `/api/elpris`. Workeren henter dem hos
Energinet og gemmer en kopi i ti minutter. Læserens browser spørger aldrig Energinet.

## Hvor tingene ligger

| Sti | Indhold |
|---|---|
| `src/content/docs/da/vaerktoejer/`, `src/content/docs/en/vaerktoejer/` | Siderne: `index.mdx` (oversigt), `elpris.mdx`, `stroemforbrug.mdx`, `startsaet.mdx`. Samme filnavne på begge sprog |
| `config/sidebar/vaerktoejer.mjs` | Sidemenuen for sektionen |
| `src/lib/primary-nav.ts` | Punktet "Værktøjer" i topbjælken |
| `src/lib/tools/catalog.mjs` | Listen over værktøjer. Oversigtens kort tegnes af den (`ToolCards.astro`, `ToolIcon.astro`) |
| `src/components/tools/ToolFrame.astro` | Rammen, alle værktøjer sidder i: titel, felter, resultat, mere, fodnote. `noscript` er teksten til et værktøj, der viser noget uden JavaScript |
| `src/styles/content/tools.css`, `src/styles/content/tools/` | Fælles udseende, klasser med `sb-tool-`: `frame`, `result`, `fields`, `segment`, `range`, `buttons`, `chart`, `table`. Startsættets egne klasser (`sb-kit-`) står i `kit` (spørgsmål, tal, lag), `kit-parts` (delene), `kit-steps` (de første skridt) og `kit-states` (når en del kommer til, og siden uden JavaScript) |
| `src/lib/tools/format.mjs` | Tal, kroner, øre og procent på dansk og engelsk, klokkeslæt i dansk tid, læsning af et indtastet tal |
| `src/lib/tools/dom.mjs` | Små DOM-hjælpere: `part`, `setText`, `show`, `setInvalid`, `el`, `svgEl`, `bindRange` |
| `src/lib/tools/price-data.mjs` | Henter priserne fra `/api/elpris` (værktøjet og forsiden), og retter enhedens ur, når det går forkert |
| `src/components/tools/PowerPrice.astro`, `PriceChart.astro` | Elprisværktøjets felter og den tomme graf |
| `src/lib/tools/price-copy.mjs` | Elprisværktøjets tekster på dansk og engelsk |
| `src/lib/tools/price-window.mjs` | Regnestykket: øre/kWh, timegennemsnit, billigste timer i træk, lav/middel/høj |
| `src/lib/tools/price-view.mjs`, `price-chart.mjs` | Hvad der skal stå på siden, og grafens mål. Uden DOM |
| `src/lib/tools/price-ui.mjs`, `price-chart-ui.mjs`, `price-chart-dom.mjs`, `price-table-dom.mjs` | Henter priserne, kobler felterne og tegner graf og tabel |
| `functions/api/elpris.js` | Indgangen til `/api/elpris` |
| `functions/lib/elpris/` | `area.js` (prisområde), `upstream.js` (kaldet til Energinet og kontrol af rækkerne), `cache.js` (kopien i Workerens cache), `memory.js` (hvad én Worker-instans husker mellem kald), `responses.js` (svar og fejl), `handler.js` (forløbet) |
| `src/components/tools/PowerCost.astro` | Strømforbrugsværktøjets felter |
| `src/lib/tools/power-cost.mjs`, `power-copy.mjs`, `power-ui.mjs` | Regnestykket, teksterne med eksempler og startværdier, og koblingen |
| `src/components/tools/ZigbeeChannel.astro`, `ZigbeeStrip.astro` | Zigbee-værktøjets felter og frekvensstrimlen (inline SVG, bygget på serveren) |
| `src/lib/tools/zigbee-channel.mjs`, `zigbee-strip.mjs`, `zigbee-view.mjs` | Regnestykket (kanalernes frekvenser, overlap, anbefaling), strimlens mål og teksterne for et resultat. Uden DOM |
| `src/lib/tools/zigbee-copy.mjs`, `zigbee-ui.mjs` | Teksterne på dansk og engelsk, og koblingen (kun klasser og tekst; strimlen skiftes med `is-picked`, `is-overlap`, `is-best`) |
| `src/styles/content/tools/strip.css` | Strimlens udseende (`sb-strip`) og talknapperne til Wi-Fi-kanaler |
| `src/components/tools/BatteryLife.astro` | Batteriværktøjets felter og svaret for startværdierne (så siden giver mening uden JavaScript) |
| `src/lib/tools/battery-life.mjs`, `battery-view.mjs` | Regnestykket med grænser, og teksterne for et resultat (enhed, levetid, søvn eller vågen) |
| `src/lib/tools/battery-copy.mjs`, `battery-ui.mjs` | Teksterne, startværdier og preset med kilde, og koblingen |
| `src/components/tools/StarterKit.astro` | Startsæt-byggeren: rammen, de tre tal og scriptet. Bygger siden af `StarterKitQuestions.astro` (spørgsmålene), `StarterKitParts.astro` (lagene og reklameoplysningen), `StarterKitItem.astro` (én del) og `StarterKitSteps.astro` (de første skridt) |
| `src/lib/tools/starter-kit-items.mjs` | Kataloget: mål, dele, skridt, noter og hvad en blok ikke kan. Kun data |
| `src/lib/tools/starter-kit.mjs` | Reglerne: `buildKit(svar)` giver id'er på dele, blokke, skridt og noter. Uden DOM |
| `src/lib/tools/starter-kit-view.mjs` | Hvad et sæt betyder for siden: hvilke mærkede elementer vises, de tre tal, og starttilstanden. Uden DOM |
| `src/lib/tools/starter-kit-copy.mjs`, `starter-kit-parts-copy.mjs` | Teksterne på dansk og engelsk. Delenes tekster står i den anden fil |
| `src/lib/tools/starter-kit-ui.mjs` | Læser svarene og skifter `hidden` på de mærkede elementer |
| `scripts/site-tools.test.mjs`, `site-tools-price.test.mjs`, `site-tools-api.test.mjs`, `site-tools-zigbee.test.mjs`, `site-tools-battery.test.mjs`, `site-tools-ui.test.mjs`, `site-tools-kit.test.mjs`, `site-tools-kit-page.test.mjs` | Tests. Køres med `npm run site:test` |

## Regler, der er valgt med vilje

- **Browseren kalder aldrig Energinet.** Energinet gemmer IP-adressen fra hvert kald i tre
  måneder (deres vilkår, læst 2026-11-14). Når Workeren henter priserne, ser Energinet kun
  Cloudflare. En test fejler, hvis Energinets adresse står i `src/lib/tools/` eller
  `src/components/tools/`.
- **Værktøjerne gemmer intet i browseren.** Ingen `localStorage`, ingen cookies. Valg af
  prisområde, moms og tillæg gælder, til siden lukkes. Samme test holder øje med det.
- **Ét kald henter begge prisområder.** Kopien af hvert område gemmes hver for sig.
- **Energinet har to adresser til de samme rækker, og download-adressen spørges først.**
  Datasæt-adressen (`/dataset/DayAheadPrices`) tillader en kalder uden nøgle ét kald i minuttet
  pr. IP-adresse, og en Worker deler sin udgående adresse med alle andre Workers: fra Cloudflare
  svarede den 429 hver gang (14 af 14, målt 2026-11-14). Download-adressen
  (`/dataset/DayAheadPrices/download?format=json`) svarede 200 hver gang (15 af 15). Den spørges
  først; datasæt-adressen er reserve og spørges kun, når den første fejler. Download-adressen
  svarer med rækkerne som en liste, datasæt-adressen med `{ "records": [...] }`; koden læser
  begge former. Adresserne står ét sted: `UPSTREAM_URLS` i `upstream.js`.
- **Mangler et prisområde i svaret, får kilden også ro.** Det område, der kom, vises. Et kald
  efter det manglende område udløser ikke et nyt kald til Energinet de næste 60 sekunder, for
  området ville mangle igen: det får den gamle kopi, hvis den stadig dækker nu, og ellers 502.
  I loggen står `UpstreamAreaMissing` én gang.
- **En kopi er frisk i ti minutter.** Fejler Energinet, vises den gamle kopi, så længe den
  indeholder prisen for det kvarter, vi er i, og Workeren venter 60 sekunder med at prøve igen.
  Et svar med en gammel kopi har `"stale": true`; værktøjet læser ikke feltet i dag. Værktøjet
  skriver altid, hvornår priserne er hentet, og tilføjer dagen, når det er en anden dag end i dag.
- **Et halvt svar gemmes ikke.** Et svar fra Energinet, der slutter før det kvarter, vi er i,
  bliver ikke gemt og erstatter aldrig en kopi, der stadig har prisen for nu
  (`UpstreamIncomplete` i loggen).
- **Kaldet til Energinet slutter altid.** Efter 8 sekunder afbrydes det, også hvis `fetch` ikke
  reagerer på afbrydelsen. De 8 sekunder gælder begge adresser tilsammen: er tiden gået på den
  første, spørges reserven ikke. Kaldet gives til `waitUntil`, så det gøres færdigt og gemmes,
  selv om læseren, der udløste det, forlader siden.
- **Browserens kald slutter også altid.** Svarer `/api/elpris` ikke inden for 12 sekunder
  (`FETCH_TIMEOUT_MS` i `price-data.mjs`), afbrydes kaldet. Værktøjet viser da fejlteksten med
  "Prøv igen", og forsidens kort går tilbage til sin tekst. Uden grænsen blev kortet stående tomt.
- **Kald, der kommer samtidig til samme Worker-instans, koster ét kald til Energinet.** Hver
  instans husker, hvornår den sidst spurgte, og det sidste gode svar (`memory.js`); efter hver
  ventetid på cachen ser den i sin hukommelse igen, før den selv spørger. Mens ét kald er på vej,
  får de andre den gamle kopi; er der ingen, venter de op til tre sekunder på svaret. Flere
  instanser i samme datacenter deler cachen, og hvert datacenter har sin egen. Der deles
  aldrig et løfte (promise) mellem to kald: Cloudflare kan afbryde det kald, der ejer det, og
  så ville de andre vente for evigt. Derfor er "et kald er på vej" et tidspunkt, der udløber
  af sig selv, ikke et flag.
- **Fejlsvar er faste ord.** `{"error":"upstream"}` med 502. Energinets egen fejltekst sendes
  aldrig videre til læseren. I loggen står kun fejlens navn, ikke læserens prisområde.
- **Prisområdet gættes, men huskes ikke.** Uden `?area=` gætter Workeren ud fra den region,
  Cloudflare placerer forbindelsen i (`request.cf`). Et gættet svar er `private`, så kun
  læserens egen browser må gemme det. Hovedstaden og Sjælland bliver efter planen én region
  1. januar 2027, og dens kode kendes ikke endnu. En dansk forbindelse med en anden regionskode
  end de fem kendte placeres derfor efter længde- og breddegrad: øst for 11° er DK2, undtagen
  nord for 56,3° (Anholt og Læsø).
- **Siderne nævner ingen satser for afgift og nettarif.** Satserne skifter. Nettarif og
  elselskabets tillæg er forskellige fra selskab til selskab; elafgiften er ens for alle.
  Abonnement er et fast beløb pr. måned og hører ikke til i et tillæg pr. kWh. Læseren skriver
  selv sit tillæg. Momsen (25 %) er den eneste sats.
- **Et tal, der kan betyde to ting, afvises.** "1.500" er 1500 for en dansker og 1,5 for
  andre. `parseDecimal` gætter ikke: ét tegn fulgt af præcis tre cifre giver en fejltekst, der
  beder om tallet uden tusindtegn. "0,500" og "1234,567" kan kun være decimaltal og læses.
- **Uret rettes, når det går forkert.** "Lige nu" afhænger af enhedens ur. Er det mere end et
  kvarter fra tiden i svarets `Date`-header, lægges forskellen til (`clockOffset` i
  `price-data.mjs`). En mindre forskel rettes ikke: browseren må gemme svaret i ti minutter, og
  så er headeren lige så gammel.
- **Zigbee-kanalvælgeren regner kun frekvenser.** Zigbee-kanal n ligger på 2405 + 5 × (n − 11) MHz og
  er 2 MHz bred; Wi-Fi-kanal m på 2412 + 5 × (m − 1) MHz og regnes 22 MHz bred (AN5185 figur 1).
  Anbefalingen følger siderne egne kilder (Zigbee2MQTT: 11, 15, 20, 25; ZHA: 15, 20, 25), i tre trin.
  (a) Er en af 15, 20, 25, 11 fri for overlap: den af dem med størst afstand (midte til kanten af
  nærmeste markerede bånd); lige stillede 15, 20, 25, 11. (b) Ellers en anden fri kanal fra 11 til 25
  med størst afstand (lige: laveste nummer), og teksten siger, at den ikke er blandt de anbefalede,
  fordi de er dækket. (c) Ellers størst afstand, lige stillede 15, 20, 25, 11, derefter laveste nummer.
  Kanal 26 anbefales aldrig. Der er ingen officiel kilde til, hvorfor lige 26, så siden siger det
  ikke, men skriver, når 26 er fri, at den ikke anbefales. `advise()` giver `kind`
  (`none`, `preferred`, `other`, `covered`), som teksten vælges efter. Ren størst afstand er fravalgt:
  den gav fx 17 ved Wi-Fi 1 + 11, selv om 15, 20 og 25 var fri, og stred mod de kilder, siden henviser til.
- **Kendte grænser.** Kanalvælgeren kender ikke signalstyrke eller Wi-Fi på 40 MHz (læseren skal markere
  begge kanaler; siden siger det). Batteriet regner under et døgn i hele timer og under en time
  "under en time".
- **Batterilevetiden har ét preset, og det har en kilde.** ESP32-chip: 10 µA i Deep-sleep og 180 mA
  (sender 802.11n MCS7, +14 dBm, tabel 5-4), begge fra Espressifs ESP32 Series Datasheet v5.3
  (læst 2026-11-14). Siden siger ikke, at et udviklingskort bruger mere i søvn, for det har vi ingen
  kilde på; den beder læseren måle. Et nyt preset kræver et datablad, der er åbnet og læst, og et
  kildelink i `BATTERY_SOURCES`.
- **Fakta på siderne har kilder, og teksten er vores egen.** Zigbee2MQTT (standardkanal 11, ZLL-kanalerne
  11/15/20/25, skift af kanal er understøttet, sovende enheder skifter ved næste opvågning, nogle
  enheder kan kræve ny parring, kun adapterne zstack og ember), ZHA (bedst ikke at ændre, "Smart"
  foretrækker 15/20/25, op til en time til genforbindelse, ikke alle enheder understøtter alle kanaler)
  og NXP AN5185 (16 kanaler, 2405 MHz, 2 MHz, 5 MHz afstand, Wi-Fi-kanal 1 på 2412 MHz, 22 MHz i figur 1,
  802.11n kan bruge 40 MHz af to tilstødende 20 MHz-bånd). Linkene står
  under "Kilder" på siderne, læst 2026-11-14. Ret kun et faktum sammen med dets kilde.
- **Grafen bygges med DOM-kald** (`svgEl` i `dom.mjs`), aldrig med HTML-strenge. Der er ingen
  inline event handlers og intet inline script; værktøjets kode ligger i egne filer under
  `/_astro/`.
- **Startsættet opfinder ingen produkter.** En del med købslink er et id fra registret
  (`src/data/products/`), og linket bygges på serveren af `<AffiliateLink>`. Har registret intet
  produkt, står der "Ingen købsanbefaling endnu" og et link til guiden. Der står ingen priser.
- **Startsættets script bygger ingenting.** Alle dele og skridt står i siden fra start, mærket
  `data-kit`. Scriptet skifter kun `hidden`, så et svar aldrig kan blive til et link eller til
  HTML.
- **En lejer får aldrig en del af den faste installation.** En del med `fixed: true` vises kun
  for en ejer, og dér står, at en autoriseret elinstallatør skal montere den.

## Sådan svarer `/api/elpris`

`GET /api/elpris?area=DK1` eller `?area=DK2`. Uden `area` gættes området.

```json
{
  "area": "DK1",
  "areaGuessed": false,
  "source": "Energinet (www.energidataservice.dk)",
  "license": "CC BY 4.0",
  "fetched": "2026-11-14T09:00:00.000Z",
  "stepMinutes": 15,
  "points": [[1794610800, 1513.32], [1794611700, 1498.1]]
}
```

Hvert punkt er `[kvarterets start i sekunder siden 1970 (UTC), kroner pr. MWh uden moms]`. Et
døgn er 96 punkter og fylder cirka 2,2 kB (målt 2026-11-14); efter kl. 13 er morgendagen med.
Omregningen til øre/kWh sker i browseren (`toOre` i `price-window.mjs`).

| Svar | Betyder |
|---|---|
| 200, `cache-control: public, max-age=600` | Priser for et navngivet område |
| 200, `cache-control: private, max-age=600` | Priser for et gættet område |
| 200, `max-age=60` | En kopi, der er ældre end ti minutter: et nyt kald er på vej, eller Energinet svarede ikke |
| 400 `invalid_area` | `area` er ikke præcis `DK1` eller `DK2` |
| 405 `method_not_allowed` | Andet end GET og HEAD |
| 502 `upstream` | Energinet svarede ikke, og der er ingen kopi, der dækker nu |

## Sådan gør du

### Tilføj et nyt værktøj

1. Skriv regnestykket i `src/lib/tools/<navn>.mjs` som rene funktioner uden DOM. Skriv en test
   i `scripts/site-tools.test.mjs` (eller en ny `scripts/site-tools-<navn>.test.mjs`).
2. Skriv teksterne i `src/lib/tools/<navn>-copy.mjs` med `da` og `en` og de samme nøgler. Sæt
   objektet ind i listen i testen "the texts have the same keys ..." i `site-tools.test.mjs`.
3. Lav komponenten `src/components/tools/<Navn>.astro` med rammen:

   ```astro
   <ToolFrame id={id} title={t.title} lang={lang} data-tool="<navn>">
     <Fragment slot="form">felterne</Fragment>
     <Fragment slot="result">svaret</Fragment>
     <Fragment slot="note">sådan er tallet regnet</Fragment>
   </ToolFrame>

   <script>
     import { startTool } from "../../lib/tools/<navn>-ui.mjs";
     for (const root of document.querySelectorAll('[data-tool="<navn>"]')) startTool(root);
   </script>
   ```

   Brug klasserne i `src/styles/content/tools/` til felter, knapper og tal. Giv hvert felt en
   `<label>`, og mærk de dele, scriptet skal finde, med `data-part="..."`.
4. Skriv `src/lib/tools/<navn>-ui.mjs`. Find delene med `part(root, "navn")`, læs tal med
   `parseDecimal`, og skriv svaret med `setText`. Gem intet i browseren.
5. Opret siderne `src/content/docs/da/vaerktoejer/<navn>.mdx` og
   `src/content/docs/en/vaerktoejer/<navn>.mdx` med `title`, `description` og `lastUpdated`.
   Start med to sætninger, sæt komponenten ind, og forklar nedenunder, hvordan tallet er regnet,
   hvad der ikke er med, og hvor data kommer fra.
6. Tilføj siden i `config/sidebar/vaerktoejer.mjs` (med `translations: { en: "..." }`) og
   værktøjet i `src/lib/tools/catalog.mjs`. Et nyt ikon er en gren mere i `ToolIcon.astro`.
   En værktøjsside har intet billede øverst, så værktøjet står først (reglen `vaerktoejer/` i
   `src/lib/guide-art.mjs`); oversigten har husets billede.
7. Kør `npm run site:test` og `npm run build`. Se siden i mørkt og lyst tema ved 375 og
   1440 px, og gå den igennem med tastaturet.

Henter værktøjet data udefra, så lad Workeren hente dem, som `functions/lib/elpris/` gør, og
skriv kilden og licensen i `docs/oss.md`.

### Ret en tekst eller en standardværdi

- **Tekst i et værktøj:** `price-copy.mjs`, `power-copy.mjs`, `zigbee-copy.mjs`, `battery-copy.mjs` eller
  `starter-kit-copy.mjs` (delenes tekster: `starter-kit-parts-copy.mjs`). Ret både `da` og `en`.
- **Tekst under et værktøj:** MDX-siden i `src/content/docs/da/vaerktoejer/` og i `en/`.
- **Kortene på oversigten:** `src/lib/tools/catalog.mjs`.
- **Startværdier for strømforbrug** (100 W, 5 timer, 2,50 kr./kWh) og eksemplerne:
  `POWER_DEFAULTS` og `POWER_PRESETS` i `power-copy.mjs`.
- **Batteriets startværdier og grænser:** `BATTERY_DEFAULTS` i `battery-copy.mjs` og `BATTERY_LIMITS` i `battery-life.mjs`.
- **Wi-Fi-bredde og rækkefølge ved lige stilling:** `WIFI_WIDTH_MHZ` og `PREFERRED` i `zigbee-channel.mjs`.
- **Timer i træk** (1 til 8, starter på 3): skyderen i `PowerPrice.astro`.
- **Moms:** `VAT` i `price-window.mjs`.
- **Hvor længe en kopi er frisk:** `FRESH_SECONDS` i `functions/lib/elpris/responses.js`.
  Ventetiden efter en fejl er `BACKOFF_SECONDS` i `cache.js`, og tidsgrænsen for kaldet er
  `UPSTREAM_TIMEOUT_MS` i `upstream.js`. Browserens tidsgrænse er `FETCH_TIMEOUT_MS` i
  `src/lib/tools/price-data.mjs`; den skal være længere end Workerens.
- **Energinets adresser og deres rækkefølge:** `UPSTREAM_URLS` i `upstream.js`.

Kør `npm run site:test` bagefter. Testene holder fast i flere af værdierne og skal rettes med.

## Startsæt-byggeren

Læseren svarer på fire spørgsmål: hvad vil du starte med (flere valg), ejer eller lejer, hvad
har du i forvejen, og vil du bygge selv med ESP32. Svaret er et sæt i tre lag og tre til fem
første skridt.

### Sådan hænger det sammen

1. `starter-kit-items.mjs` er kataloget. En del er enten et produkt fra registret (`product`
   og `name`), et hul (`gap: true`: registret har intet produkt endnu) eller noget, der ikke
   skal købes. `radio` siger, hvordan delen taler med Home Assistant, `fixed` at den hører til
   den faste installation, og `guide` hvilken side læseren sendes videre til.
2. `buildKit(svar)` i `starter-kit.mjs` vælger id'er fra kataloget:
   - Hjernen er `brain-own`, når læseren har Home Assistant, ellers `brain-ha`.
   - Hvert mål giver sine dele (`GOAL_PARTS`). Deler to mål en sensor, peger den anden blok på
     den første (`...-shared`), så intet produkt står to gange.
   - En lejer får ingen del med `fixed`.
   - Forbindelsen følger delene: en koordinator kun, når sættet har Zigbee-dele.
   - Skridtene: udlejer (kun en lejer med radiatortermostat), installér eller backup, Zigbee
     (kun med koordinator), tilføj en del, og én automation til det første valgte mål.
3. Komponenterne bygger alle dele og skridt på serveren og mærker dem `data-kit="item:<id>"`,
   `block:`, `step:` eller `note:`. Det, startsvarene (`DEFAULT_ANSWERS`: lys, lejer, intet i
   forvejen) ikke viser, får `hidden`.
4. `starter-kit-ui.mjs` læser svarene, kalder `buildKit` og skifter `hidden`. De tre tal øverst
   kommer fra `kitCounts` i `starter-kit-view.mjs`.
5. Uden JavaScript skjuler `kit-states.css` spørgsmålene og viser sættet for `NOSCRIPT_ANSWERS` (alle
   mål, lejer, intet i forvejen) ud fra `data-noscript` på hvert element.

Kataloget har 21 dele: 11 med købslink (9 produkter fra registret, to af dem bruges i to
blokke), 6 huller og 4, der ikke skal købes.

### Tilføj eller skift en del

1. Produktet skal stå i registret. Gør det ikke, så tilføj det først (`docs/indtjening.md`) og
   brug det i en guide; registrets test kræver, at en guide bruger det.
2. Skriv delen i `ITEMS` i `starter-kit-items.mjs`: `block`, `product`, `name` (som registret
   staver modellen), `radio` og `guide`. Sæt `fixed: true`, hvis delen monteres i den faste
   installation. Skal kun produktet skiftes, så ret `product` og `name`.
3. Sæt id'et ind under sit mål i `GOAL_PARTS` i `starter-kit.mjs`.
4. Skriv `role`, `why` og `guide` på begge sprog i `starter-kit-parts-copy.mjs`. En del uden
   noget at købe får også `tag`.
5. Kør `npm run site:test` og `npm run build`. Testene kører alle 384 kombinationer af svar.

Et hul bliver til et produkt ved at erstatte `gap: true` med `product`, `name` og `radio`.
Skriv aldrig en pris og aldrig "bedst" eller "billigst" om en del; en test stopper det.

Et nyt mål er et navn i `GOALS`, en linje i `GOAL_PARTS`, et skridt `auto-<mål>` i `STEPS`, en
linje i `LIMITS` og teksterne under `goals`, `blocks`, `limits` og `steps` på begge sprog.

## Når noget ser forkert ud

- **"Vi kunne ikke hente priserne lige nu."** `/api/elpris` svarer 502. Energinet svarede ikke,
  eller afviste kaldet, og der er ingen kopi, der dækker nu. Workeren prøver igen efter 60
  sekunder; knappen "Prøv igen" spørger med det samme. I Workerens log står
  `SmartBolig elpris upstream failed` med fejlens navn: `UpstreamStatus429` (for mange kald),
  `UpstreamEmpty` (et svar uden brugbare rækker), `TimeoutError` (intet svar inden for 8
  sekunder) eller `UpstreamAreaMissing` (for få rækker for ét område; det andet område vises
  stadig). Fejler begge adresser, er det fejlen fra den første (download-adressen), der står i
  loggen. Se loggen med `npx wrangler tail smartbolig-starlight --format json`. Bliver
  `UpstreamStatus429` ved, begrænser Energinet nu også download-adressen fra Cloudflare. Så bør
  priserne hentes på et fast tidspunkt i stedet (se "Ikke bygget").
- **Forsidens kort viser sin tekst i stedet for tal.** Enten svarer `/api/elpris` 502 (se
  ovenfor), eller også gik der mere end 12 sekunder. Kortet prøver igen ved næste kvarter.
- **Der er ingen priser for i morgen.** De kommer mellem kl. 13 og 14 dansk tid (Energinets
  egen beskrivelse af datasættet; 2026-11-13 kom de kl. 13:28). Før det viser værktøjet kun i
  dag og skriver, at morgendagens priser ikke er ude endnu. Bagefter kan der gå op til ti
  minutter, før kopien er fornyet.
- **Værktøjet gætter på det forkerte prisområde.** Gættet bygger på Cloudflares region for
  forbindelsen: Hovedstaden og Sjælland giver DK2, de tre andre regioner DK1, og en ukendt
  regionskode afgøres af længde- og breddegrad. Mobilnet og VPN bliver ofte placeret i
  København. Læseren skifter selv område øverst i værktøjet. Lokalt (uden Cloudflare) er
  gættet altid DK1.
- **Prisen passer ikke med elregningen.** Værktøjet viser spotprisen med moms. Afgift,
  nettarif, abonnement og elselskabets tillæg er ikke med, medmindre læseren skriver et tillæg.
  Tallet "Lige nu" er kvarterets pris; grafen viser gennemsnittet pr. time.
- **`npm run build` stopper på et prøvespørgsmål.** En værktøjsside har skubbet en guide ud af
  de tre bedste svar i assistentens søgning (`docs/assistent.md`). Ret teksten på
  værktøjssiden; lad prøvespørgsmålet være.
- **Feltet viser en fejl ved et tal.** Felterne tager tal med komma eller punktum som
  decimaltegn. Bogstaver afvises, og det gør "1.500" og "1,500" også, fordi de kan være både
  1500 og 1,5. Skriv 1500.
- **"Lige nu" viser et andet kvarter end uret på væggen.** Enhedens ur går mellem ti og
  femten minutter forkert; først over et kvarter bliver det rettet (se reglen ovenfor).
- **Bygget stopper med "Unknown affiliate product".** En del i `starter-kit-items.mjs` peger på
  et produkt, der ikke står i registret mere. Ret `product`, eller gør delen til et hul.
- **Startsættet viser en forkert del.** Reglen står i `buildKit` i `starter-kit.mjs`. Skriv
  først en test for svaret i `scripts/site-tools-kit.test.mjs`, og ret så reglen.
- **Startsættets spørgsmål ændrer ikke sættet.** Scriptet kører ikke. Er JavaScript slået fra,
  skal siden vise hele lejersættet uden spørgsmål; det kræver en browser, der kender
  `@media (scripting: none)`.

## Rettet efter gennemgangen

En uafhængig gennemgang 2026-11-14 fandt disse fejl. Hver har en test, der fejler, hvis den
kommer igen:

| Fejl | Rettet i | Test |
|---|---|---|
| "1.500" watt blev læst som 1,5 watt | `format.mjs` (`parseDecimal`) | `site-tools.test.mjs` |
| "169 % lavere end at starte nu" ved negative priser | `price-view.mjs`: forskellen i øre/kWh, når en af priserne er nul eller negativ | `site-tools-price.test.mjs` |
| Dagens laveste pris stod som "Middel pris", når mange timer havde samme pris | `price-window.mjs` (`level`) | `site-tools-price.test.mjs` |
| Tyve samtidige kald gav tyve kald til Energinet; uden Cache API var der ingen pause efter en fejl | `memory.js`, `handler.js` | `site-tools-api.test.mjs` |
| Teksten sagde, at elafgiften afhænger af netselskabet | `price-copy.mjs`, begge sider | læst |
| Gættet på prisområde hang på to regionskoder, der forsvinder i 2027 | `area.js` | `site-tools-api.test.mjs` |
| Et ur, der går en time forkert, gav en forkert pris "lige nu" | `price-data.mjs` (`clockOffset`) | `site-home-tools.test.mjs` |

Mindre ting rettet samtidig: HEAD får aldrig en krop, heller ikke ved fejl; loggen nævner ikke
prisområdet; et svar over 500.000 tegn fra Energinet afvises; "100 øre" vises som "1,00 kr.",
og "-0,0" som "0,0"; fejlteksten læses kun op, når feltet er forkert; eksemplet "Gaming-pc"
arver ikke routerens 24 timer; eksemplet med køleskab er fjernet, fordi tallet ikke havde en
kilde.

En opfølgende gennemgang samme dag fandt disse; de er rettet på samme måde:

| Fejl | Rettet i | Test |
|---|---|---|
| Et kald, der ventede på cachen, mens et andet kalds svar kom, spurgte Energinet én gang til | `handler.js`: hukommelsen læses igen efter hver ventetid | `site-tools-api.test.mjs` |
| Et halvt svar fra Energinet erstattede en kopi, der stadig dækkede nu | `handler.js` (`UpstreamIncomplete`) | `site-tools-api.test.mjs` |
| Forlod læseren siden midt i kaldet, kunne svaret gå tabt | `handler.js`: kaldet gives til `waitUntil`; `upstream.js`: hård tidsgrænse | `site-tools-api.test.mjs` |
| Siden under forsidens kort flyttede sig, når priserne kom (kortet voksede 30 til 112 px) | `HomeTools.astro`, `tools.css`: pladsen holdes fra start (`data-state="loading"` og `data-room`) | `site-home-tools.test.mjs`, målt i browser |
| Forsidens kort kaldte en pris "lav" ud fra to dage, men tegnede kun i dag; nøglen "billigst" stod der, selv om ingen søjle var mærket | `price-view.mjs` (`levelOver`), `home-price.mjs` | `site-home-price.test.mjs` |
| Et svar fra browserens cache kunne ophæve rettelsen af et ur, der går forkert | `price-data.mjs` (`createClockReader`: den største forskel gælder) | `site-home-tools.test.mjs` |

Fundet på den levende side og i gennemgangen efter udgivelsen 2026-11-14; rettet på samme måde:

| Fejl | Rettet i | Test |
|---|---|---|
| `/api/elpris` svarede 502: Energinets datasæt-adresse afviser Cloudflares delte adresse med 429 | `upstream.js`: download-adressen først, datasæt-adressen som reserve, begge svarformer læses | `site-tools-api.test.mjs` |
| Manglede ét område i svaret, kaldte næste forespørgsel på det område Energinet igen med det samme | `handler.js`: pause og én linje i loggen (`UpstreamAreaMissing`) | `site-tools-api.test.mjs` |
| Svarede `/api/elpris` aldrig, blev forsidens kort stående tomt | `price-data.mjs`: `FETCH_TIMEOUT_MS` | `site-home-price.test.mjs`, `site-home-tools.test.mjs` |
| Et ur, der gik forkert og blev stillet rigtigt, mens siden var åben, blev ved med at blive rettet | `price-data.mjs` (`createClockReader`: en forskel, der er meget mindre end den største, starter aflæsningen forfra) | `site-home-tools.test.mjs` |
| Efter et svar, der rettede uret, blev næste kvarter talt fra det forkerte ur (testen manglede; koden var rigtig) | `home-price.mjs`, `price-ui.mjs` | `site-home-price.test.mjs`, `site-home-tools.test.mjs` |

Kendt efter den gennemgang og ikke rettet: at værktøjet (`price-ui.mjs`) tæller næste kvarter
forfra efter et svar, holdes kun af en test, der læser koden; forsidens kort har en test, der
kører den. Urets rettelse kan være forkert til næste svar i to sjældne tilfælde: når enheden
går i dvale midt i et kald i over et kvarter, og når uret stilles en time tilbage til en
forkert tid, mens siden er åben.

Kendt og ikke rettet: på de to dage om året, hvor uret stilles, står timen 02 to gange (eller
mangler) uden forklaring; en time, hvor Energinet mangler nogle kvarterer, vises som
gennemsnittet af de kvarterer, der er; grafens tekst til skærmlæsere siger ikke, hvilken dag
den laveste time ligger på, når to dage vises. På forsidens kort har søjlerne for timer, der
er gået, lav kontrast mod kortet (1,4–1,65:1), og "billigst" adskilles fra "kommende" kun med
farve; tallene står som tekst ved siden af, og grafen har en tekst til skærmlæsere. Kommer det
første svar fra browserens cache, kan uret være op til ti minutter bagud, til næste svar.

## Forsiden

Forsiden har en sektion "Værktøjer" (`src/components/home/HomeTools.astro`, stil i
`src/styles/home/tools.css`, tekster under `tools` i `src/lib/home-copy/da.ts` og `en.ts`):

- Til venstre et kort med elprisen lige nu, dagens timer som søjler og de billigste tre timer
  i træk. Tallene skrives af `src/lib/home-price.mjs`, som bruger de samme regnestykker som
  elprisværktøjet (`price-view.mjs`) og henter priserne samme vej (`price-data.mjs`, sidens
  eget `/api/elpris`). Søjlernes mål regnes i `src/lib/tools/price-spark.mjs`.
- Koden hentes først, når kortet er tæt på skærmen, så forsiden ikke bliver tungere at åbne.
  Pladsen til tallene tages med det samme (`data-state="loading"`), så siden under kortet ikke
  flytter sig, når de kommer. Hver tekst, koden skriver, har en usynlig pladsholder af samme
  længde i `data-room` (streger i stedet for tal), som fylder, indtil den rigtige tekst står der.
  Sætningen om de billigste timer findes i tre længder; pladsholderen er den mellemste, så
  kortet kan blive én linje højere eller lavere på en smal telefon. Kan koden eller priserne
  ikke hentes, går kortet tilbage til teksten.
- Kortet kalder prisen lav, middel eller høj i forhold til dagens timer, fordi det kun tegner i
  dag. Elprisværktøjet sammenligner med alle kendte timer.
- Uden JavaScript, eller hvis priserne ikke kan hentes, viser kortet en tekst og et link til
  værktøjet. Der står aldrig et tal i den byggede side.
- Til højre en række pr. værktøj fra `catalog.mjs`. Et nyt værktøj kommer med af sig selv.

Kortet gemmer intet og sender kun det, elprisværktøjet sender. Testene står i
`scripts/site-home-tools.test.mjs` (søjler, opsætning) og `scripts/site-home-price.test.mjs`
(kortets opførsel med en efterlignet side: priser, fejl, ur og nyt kald).

## Overvågning og privatliv

- Sidevagten (`docs/overvaagning.md`) spørger `/api/elpris?area=DK1` ved hver kørsel og
  åbner en sag, hvis svaret ikke er 200 med mindst 24 priser.
- Privatlivspolitikken (afsnit 2.4, begge sprog) siger, hvad værktøjerne sender: kun
  prisområdet, og at det første område er et gæt ud fra regionen (eller det omtrentlige sted),
  Cloudflare oplyser for forbindelsen, både i værktøjet og på forsidens kort. Et nyt værktøj,
  der sender eller gemmer mere, skal skrives ind dér.
- Startsæt-byggeren sender og gemmer ingenting: svarene bliver i siden. Dens købslinks er
  reklamelinks som i guiderne, med samme oplysning over sættet, og et tryk tælles som i guiderne
  efter et ja til statistik (`docs/indtjening.md`). Svarene følger ikke med.
- Kommentarer og annoncepladsen vises under et værktøj, men ikke på oversigten
  (`src/lib/article-page.mjs`).
- `llms.txt` har værktøjerne som eget afsnit (`SECTIONS` i `scripts/lib/llms-txt.mjs`).

## Ikke bygget

Workerens cache gælder pr. datacenter hos Cloudflare, så hvert datacenter henter sin egen
kopi. Hvis Energinet også begrænser download-adressen, kan priserne i stedet hentes af en Cron
Trigger og gemmes i KV. Det kræver en binding i `wrangler.jsonc` og er ikke lavet. En anden
kilde er overvejet og fravalgt (B61, tilføjelsen efter udgivelsen i
`docs/redesign/BESLUTNINGER.md`).

## Fjern det igen

Ét værktøj: slet dets to MDX-sider, komponenten og modulerne, og fjern det fra
`config/sidebar/vaerktoejer.mjs` og `src/lib/tools/catalog.mjs`.

Hele sektionen:

1. Slet `src/content/docs/da/vaerktoejer/`, `src/content/docs/en/vaerktoejer/`,
   `src/components/tools/`, `src/lib/tools/`, `src/styles/content/tools.css` og
   `src/styles/content/tools/`. Fjern linjen `@import "./content/tools.css";` i
   `src/styles/index.css`.
2. Slet `functions/api/elpris.js` og `functions/lib/elpris/`.
3. Fjern `vaerktoejer` i `config/sidebar/index.mjs` (og slet `config/sidebar/vaerktoejer.mjs`),
   i `src/lib/primary-nav.ts`, i `src/lib/guide-art.mjs`, i `src/lib/seo/page-kind.ts`, i
   `src/lib/seo/breadcrumbs.ts`, i `src/lib/article-page.mjs` og i `SECTIONS` i
   `scripts/lib/llms-txt.mjs`. Fjern kontrollen `/api/elpris` i `scripts/monitor/checks.mjs`
   (og dens linjer i testen), og afsnit 2.4 i privatlivspolitikken på begge sprog.
4. Slet testfilerne `scripts/site-tools*.test.mjs`.
5. Har siderne været udgivet, så send adresserne videre i `public/_redirects` (`docs/seo.md`).
6. Fjern rækken om Energinet i `docs/oss.md` og afsnittene om værktøjer i `CONTENT-GUIDE.md`,
   `README.md`, `AGENTS.md`, `docs/designsystem.md` og `docs/overvaagning.md`.
7. Fjern kontrollen "/api/elpris has prices for DK1" og `MIN_PRICE_POINTS` i
   `scripts/monitor/checks.mjs`, `priceList` i `scripts/monitor/parse.mjs`, og ret antallet af
   kontroller i `scripts/site-monitor.test.mjs`.
8. Fjern `["vaerktoejer", "Værktøjer"]` fra `SECTIONS` i `scripts/lib/llms-txt.mjs` og den
   linje i `scripts/site-llms-txt.test.mjs`, der siger, at værktøjer er et kendt område.
9. Fjern forsidens sektion: `src/components/home/HomeTools.astro`, `src/lib/home-price.mjs`,
   `src/styles/home/tools.css`, `scripts/site-home-tools.test.mjs`,
   `scripts/site-home-price.test.mjs`, blokken `tools` i
   `src/lib/home-copy/` (typen og begge sprog) og de to linjer i `HomePortal.astro` og
   `HomeStyles.astro`.
10. Kør `npm run site:test` og `npm run build`.
