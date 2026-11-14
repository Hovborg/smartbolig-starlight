# Assistentens søgning i sidens egne guides

Sidst kontrolleret: 2026-11-14.
Kontrolleret ved: `npm run site:test` (indeksets og chattens tests), `npm run build` (indekset
bygges, og de faste prøvespørgsmål består) og spørgsmål mod det byggede indeks med `--ask`.
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
| `scripts/lib/site-index/extract.mjs` | Én bygget side → titel, beskrivelse og tekst pr. afsnit (h2/h3). Menuer, knapper, scripts og skjulte dele springes over. |
| `scripts/lib/site-index/build.mjs` | Afsnit → stykker på højst 1.500 tegn, og for hvert ord hvilke stykker det vægter i (BM25). Deler filerne op. |
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
| `meta.json` | Version, antal sider, stykker og ordfiler. Læses én gang pr. Worker-instans. |
| `t/<nummer>.json` | Ordfiler: ord → liste af (stykke, vægt). Et ord ligger altid i samme fil (hash af ordet). |
| `c/<nummer>.json` | Stykkefiler: 8 stykker pr. fil med adresse (med anker), sidetitel, overskrift og tekst. |

Et spørgsmål læser højst 19 filer: `meta.json`, én ordfil pr. søgeord (højst 10) og højst 8
stykkefiler. Grænsen holder to søgninger i ét chatkald under Workerens loft for delkald.

Målt 2026-11-14 på 167 sider pr. sprog: ca. 2.950 stykker, 430 filer og 2,5 MB pr. sprog;
den største ordfil er ca. 22 KB.

## Sådan rangeres der

- Hvert stykke får point pr. søgeord, det indeholder (BM25). Ord i overskriften tæller
  dobbelt, ord i sidens titel halvanden gang.
- Et stykke, der dækker flere af spørgsmålets ord, går foran et, der gentager ét ord.
- Sammensatte ord deles ved bygning: "bevægelseslys" findes også på "bevægelse" og "lys".
- Højst to stykker fra samme side, fem stykker i alt.

Søgningen er ordbaseret. Den forstår ikke synonymer: "strøm" finder ikke "el", medmindre
siden bruger begge ord. Modellen får kun uddragene som baggrund og svarer også ud fra egen
viden og de kontrollerede officielle kilder.

## Fejlsøg en søgning

1. Byg siden: `npm run build`.
2. Spørg indekset: `node scripts/site-index.mjs --ask da "hvordan parrer jeg en zigbee-sensor"`.
   Hver linje viser point, adresse, sidetitel, overskrift og starten af teksten.
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
| Stykkernes størrelse, vægten af overskrift og titel | toppen af `scripts/lib/site-index/build.mjs` |
| Antal svar, antal pr. side, loft for filer | toppen af `functions/lib/site-search/search.js` |
| Dele af siden, der ikke skal med | `SKIPPED` og `isHidden` i `scripts/lib/site-index/extract.mjs`, eller `data-pagefind-ignore` på elementet |

Ændres filernes format, så hæv `INDEX_VERSION` i både `build.mjs` og `search.js`. En Worker
med gammel kode afviser da et nyt indeks i stedet for at læse det forkert.

## Fjern det igen

1. Fjern `&& node scripts/site-index.mjs` fra `build` i `package.json`.
2. Slet `scripts/site-index.mjs`, `scripts/site-index.test.mjs`, `scripts/lib/site-index/` og
   `functions/lib/site-search/`.
3. Fjern `siteSearch` og importen af `assets.js` i `functions/lib/chat/handler.js`, og
   `/_index/*` i `public/_headers`.

Assistenten svarer derefter kun ud fra modellens viden og de officielle kilder.
