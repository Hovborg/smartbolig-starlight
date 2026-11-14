# Assistentens søgning i sidens egne guides

Sidst kontrolleret: 2026-11-14.
Kontrolleret ved: `npm run site:test` (indeksets og chattens tests), `npm run build` (indekset
bygges, og de faste prøvespørgsmål består), ca. 40 spørgsmål mod det byggede indeks med
`--ask` og en uafhængig gennemgang, hvis fund er rettet (tomme uddrag, ental/flertal,
faneblade, svage kilder).
Ikke kontrolleret lokalt: et rigtigt svar fra modellen. Det kræver Cloudflares binding og ses
på den levende side efter udgivelse.

## Kort

Når en læser spørger assistenten om smart home, slår Workeren først op i et indeks over
sidens egne sider og giver de bedste afsnit til modellen sammen med spørgsmålet. Svaret får
links til de sider, afsnittene kom fra.

Indekset er sidens egen tekst som små JSON-filer. Det bygges sammen med siden og ligger som
statiske filer under `/_index/`. Der bruges ingen betalt søgetjeneste og ingen database.

## Hvor tingene ligger

| Fil | Ansvar |
|---|---|
| `scripts/site-index.mjs` | Læser de byggede sider i `dist/`, skriver `dist/_index/<sprog>/`, stiller prøvespørgsmålene. Sidste trin i `npm run build`. |
| `scripts/lib/site-index/extract.mjs` | Én bygget side → titel, beskrivelse og tekst pr. afsnit (h2/h3). Menuer, knapper, scripts og skjulte dele springes over. Et afsnit uden tekst eller med næsten kun links giver intet. |
| `scripts/lib/site-index/chunks.mjs` | Afsnit → stykker på højst 1.500 tegn. Tekst, der står ordret på tre sider eller flere, udelades. |
| `scripts/lib/site-index/compounds.mjs` | Deler sammensatte ord i de to kendte ord, de består af. |
| `scripts/lib/site-index/build.mjs` | For hvert ord: hvilke stykker det vægter i (BM25). Deler filerne op. |
| `scripts/lib/site-index/probes.mjs` | De faste prøvespørgsmål: siden i `page` skal være blandt de tre bedste svar. |
| `functions/lib/site-search/tokens.js` | Tekst → søgeord (små bogstaver, uden fyldord, bøjningsendelser skåret af). Bruges både ved bygning og ved søgning. |
| `functions/lib/site-search/search.js` | Søgningen i Workeren: læser kun de filer, spørgsmålet har brug for. |
| `functions/lib/site-search/assets.js` | Henter indeksfilerne fra Workerens statiske filer (`env.ASSETS`). |
| `functions/lib/chat/handler.js` | Kalder søgningen med en tidsgrænse; fejler den, svarer assistenten uden guideuddrag. |
| `functions/lib/chat/sources.js` | Slipper kun `smartbolig.net`-adresser igennem som kilder og afkorter teksten. |
| `scripts/site-index.test.mjs` | Tests for alt ovenfor. |

## Filerne i indekset

`dist/_index/<sprog>/` (dansk og engelsk hver for sig):

| Fil | Indhold |
|---|---|
| `meta.json` | Version, antal sider, stykker og ordfiler, og `subjects`: ordene i sidernes titler. Læses én gang pr. Worker-instans. |
| `t/<nummer>.json` | Ordfiler: ord → liste af (stykke, vægt). Et ord ligger altid i samme fil (hash af ordet). |
| `c/<nummer>.json` | Stykkefiler: 8 stykker pr. fil med adresse (med anker), sidetitel, overskrift og tekst. |

Et spørgsmål læser højst 19 filer: `meta.json`, én ordfil pr. søgeord (højst 10) og højst 8
stykkefiler. Grænsen holder to søgninger i ét chatkald under Workerens loft for delkald.

Målt 2026-11-14 på 167 sider pr. sprog: ca. 2.300 stykker, 420 filer og 2,6 MB pr. sprog;
den største ordfil er ca. 18 KB. Et spørgsmål med ti meget almindelige ord læser ca. 160 KB
og bruger ca. 1,7 ms CPU (målt i Node på udviklingsmaskinen).

Et ord gemmes højst i sine 600 bedste stykker (`MAX_ENTRIES_PER_TERM`). Det rammer i dag fire
danske og tre engelske ord, bl.a. "assistant" og "home".

## Sådan rangeres der

- Hvert stykke får point pr. søgeord, det indeholder (BM25). Ord i overskriften tæller
  dobbelt, ord i sidens titel halvanden gang. Et h3-afsnit har sit h2 med i overskriften
  ("Opsætning › Docker").
- Et kort stykke får ingen fordel af at være kort.
- Et stykke, der dækker flere af spørgsmålets ord, går foran et, der gentager ét ord.
- Nævner spørgsmålet noget, siden har en side om (et ord fra en sidetitel), skal hvert svar
  indeholde et sådant ord. "Hvad koster en Shelly?" besvares derfor ud fra tekst om Shelly,
  ikke ud fra en hvilken som helst side med ordet "koster".
- Et svar med under en fjerdedel af det bedste svars point udelades. Der kan derfor komme
  færre end fem svar.
- Ental, flertal og bestemt form er samme ord: "pris", "priser" og "prisen"; "device" og
  "devices".
- Sammensatte ord deles ved bygning: "bevægelseslys" findes også på "bevægelse" og "lys",
  "elpris" på "el" og "pris". Et kort forled (2-3 bogstaver) deles kun, når det står på
  listen i `compounds.mjs`; ellers blev "seneste" til "se" + "nest".
- Højst to stykker fra samme side, fem stykker i alt (`MAX_SEARCH_RESULTS` i
  `functions/lib/chat/limits.js`).

Det kan søgningen ikke:

- Synonymer: "strøm" finder ikke "el", medmindre siden bruger begge ord.
- Dele et sammensat ord i spørgsmålet: "dørsensor" finder sider, der skriver "dørsensor";
  "sensor til dør" finder også dem, der skriver ordene hver for sig.
- Vægte nyt over gammelt: et spørgsmål om nyheder kan få en ældre udgave først. Datoen står
  i titlen, som modellen får med.

Modellen får kun uddragene som baggrund og svarer også ud fra egen viden og de
kontrollerede officielle kilder.

## Fejlsøg en søgning

1. Byg siden: `npm run build`.
2. Spørg indekset: `node scripts/site-index.mjs --ask da "hvordan parrer jeg en zigbee-sensor"`.
   Hver linje viser point, adresse, sidetitel, overskrift og starten af teksten. Det første
   svar skal være et afsnit om parring.
3. Mangler den rigtige side i svaret, så se, hvilke ord spørgsmålet bliver til:
   `node -e "import('./functions/lib/site-search/tokens.js').then(m => console.log(m.queryTerms('dit spørgsmål', 'da')))"`.
   Står ordene ikke på siden (i den form), kan den ikke findes. Ret sidens tekst eller
   overskrift, ikke søgningen.
4. Skal spørgsmålet altid virke, så tilføj det i `scripts/lib/site-index/probes.mjs`.
   Bygget fejler derefter, hvis siden falder ud af de tre bedste.

Bygget stopper med `search probe(s) failed`, når et prøvespørgsmål ikke længere finder sin
side. Meddelelsen nævner spørgsmålet, den ventede side og hvad der blev fundet i stedet.
Er siden flyttet eller slettet, så ret `probes.mjs`. Ellers er teksten eller rangeringen ændret.

På den levende side: svarer assistenten uden links til guides, så se Workerens log efter
`SmartBolig site search unavailable` (`npx wrangler tail`). Den skrives, når en indeksfil
mangler, eller søgningen tog over 5 sekunder.

## Ændr noget

| Ønske | Sted |
|---|---|
| Flere eller færre fyldord, andre endelser | `functions/lib/site-search/tokens.js` |
| Stykkernes størrelse | toppen af `scripts/lib/site-index/chunks.mjs` |
| Vægten af overskrift og titel, ordfilernes størrelse | toppen af `scripts/lib/site-index/build.mjs` |
| Korte forled, der må deles ("el", "dør") | `shortHeads` i `scripts/lib/site-index/compounds.mjs` |
| Antal pr. side, loft for filer, grænsen for svage svar | toppen af `functions/lib/site-search/search.js` |
| Antal svar til modellen | `MAX_SEARCH_RESULTS` i `functions/lib/chat/limits.js` |
| Dele af siden, der ikke skal med | `SKIPPED` og `isHidden` i `scripts/lib/site-index/extract.mjs`, eller `data-pagefind-ignore` på elementet |

Ændres filernes format, så hæv `INDEX_VERSION` i `functions/lib/site-search/search.js`
(byggeren læser tallet derfra). En Worker med gammel kode afviser da et nyt indeks i stedet
for at læse det forkert.

Indeksfilerne får `X-Robots-Tag: noindex` (`public/_headers`). De er med vilje ikke spærret
i `robots.txt`: en spærret fil kan søgemaskinen ikke hente, og så ser den ikke `noindex`.

## Fjern det igen

1. Fjern `&& node scripts/site-index.mjs` fra `build` i `package.json`.
2. Slet `scripts/site-index.mjs`, `scripts/site-index.test.mjs`, `scripts/lib/site-index/` og
   `functions/lib/site-search/`.
3. Fjern `siteSearch` og importen af `assets.js` i `functions/lib/chat/handler.js`, og
   `/_index/*` i `public/_headers`.
4. Ret testene: i `scripts/chat-api.test.mjs` importen af `build.mjs` og de tests, der bruger
   `siteSearch` eller `buildIndex`; i `scripts/chat-widget.test.mjs` de linjer, der kræver
   privatlivspolitikkens ordlyd om sidens eget indeks. Ret også den ordlyd i
   privatlivspolitikken (begge sprog). `npm run site:test` skal være grøn bagefter.

Assistenten svarer derefter kun ud fra modellens viden og de officielle kilder.
