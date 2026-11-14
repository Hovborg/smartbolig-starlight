# Assistenten: søgning i sidens egne guides og svar, mens de skrives

Sidst kontrolleret: 2026-11-14.
Kontrolleret ved: `npm run site:test` (indeksets og chattens tests; strømmen er prøvet med en
efterlignet model), `npm run build` (indekset bygges, og de faste prøvespørgsmål består),
ca. 40 spørgsmål mod det byggede indeks med `--ask` og en uafhængig gennemgang, hvis fund er
rettet (tomme uddrag, ental/flertal, faneblade, svage kilder). Widgeten er prøvet i headless
Chrome mod et efterlignet `/api/chat`: strøm, fejl før og efter første tekst, stop, omskrivning
og svar uden strøm, i lyst og mørkt tema ved 320, 375 og 1440 px.
Ikke kontrolleret lokalt: et rigtigt svar fra modellen, og hvordan Workers AI's strøm ser ud,
og hvor hurtigt den kommer. Det kræver Cloudflares binding og skal ses på den levende side
efter udgivelse; kommandoen står under "Kontrollér strømmen efter udgivelse".

## Kort

Når en læser spørger assistenten om smart home, slår Workeren først op i et indeks over
sidens egne sider og giver de bedste afsnit til modellen sammen med spørgsmålet. Svaret får
links til de sider, afsnittene kom fra.

Læseren ser med det samme, hvad der sker ("Søger i guiderne …"), får kilderne, så snart
opslaget er færdigt, og læser svaret, mens modellen skriver det. Se "Svaret som strøm".

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
| `functions/lib/chat/turn.js` | Kalder søgningen med en tidsgrænse; fejler den, svarer assistenten uden guideuddrag. |
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

## Fra spørgsmål til svar

Et spørgsmål går gennem de samme trin, uanset om svaret hentes som JSON eller som strøm:

1. `handler.js` afviser forkerte kald (metode, fremmed oprindelse, indholdstype, manglende
   binding), spørger `CHAT_RATE_LIMITER` én gang og validerer samtalen.
2. `turn.js` vælger de officielle evidenspakker og gør opslaget i indekset klar (tidsgrænse
   5 sekunder).
3. `agent.js` vælger rute efter den seneste besked (se tabellen).
4. `model-runs.js` kører hvert modeltrin: Gemma først. Qwen overtager, hvis Gemma fejler,
   bliver afskåret eller ikke består kontrollen i `answer.js`.
5. `turn.js` samler svar, kilder, kildegrad og telemetri til den krop, læseren får.

| Den seneste besked | Opslag | Modelkald | Hvad strømmes |
|---|---|---|---|
| Indeholder et smart home-ord ("Hvilken Zigbee-koordinator skal jeg bruge til Zigbee2MQTT?") | 1 | 1, uden søgeværktøj | Svaret |
| Uden smart home-ord, og modellen beder om et opslag | 1 | 2: først med søgeværktøj, så uden | Kun det andet kald: svaret |
| Uden smart home-ord, og modellen svarer selv ("Hej") | 0 | 1, med søgeværktøj | Intet: svaret kommer i ét stykke |

Antallet af opslag og modelkald er det samme som før strømmen. Rækkefølgen holdes fast af
`scripts/chat-stream.test.mjs` med en efterlignet model. Et trin, der kan ende i et
værktøjskald, strømmes ikke: det, modellen skriver dér, er ikke altid et svar.

## Svaret som strøm

Et kald med `Accept: text/event-stream` får svaret som Server-Sent Events. Et kald uden får
JSON-svaret som hidtil. Et afvist kald (429, 400, 413, 403, 415, 503) får altid JSON med sin
statuskode, også når det bad om en strøm.

| Hændelse | Data | Betydning |
|---|---|---|
| `status` | `{"stage": …}` | Hvad der sker nu: `reading` (modellen læser spørgsmålet og afgør, om der skal søges), `searching`, `writing` eller `revising`. |
| `sources` | `{"sources": [{"title", "url"}]}` | Én gang, når opslaget er færdigt, og altid før første tekst. Listen er tom, når der ikke blev søgt, og ingen officiel kilde er valgt. |
| `delta` | `{"text": "…"}` | Et stykke af svaret. |
| `done` | Samme krop som JSON-svaret | Det kontrollerede svar. Kun `done` er et svar. |
| `error` | `{"code", "error": {"da", "en"}}` | Samme krop som et fejlet JSON-svar. |

Strømmen slutter med linjen `data: [DONE]`. Svarhovederne er
`Content-Type: text/event-stream; charset=utf-8`, `Cache-Control: no-store`,
`X-Content-Type-Options: nosniff` og `X-Request-Id`.

Regler for tekst, læseren allerede har set:

- En anden model skriver aldrig videre på den. Fejler Gemma, før der er vist tekst, overtager
  Qwen som hidtil. Fejler en model, efter at der er vist tekst, slutter strømmen med `error`.
- Et færdigt udkast, der ikke består en kontrol (afskåret, forkert YAML-form, interne navne,
  for langt), trækkes tilbage med `status` `revising`, og Qwen skriver et nyt. Består det
  heller ikke, slutter strømmen med `error`. Kontrollerne er de samme som for JSON-svaret.
- Et udkast, der nævner interne værktøjs- eller mærkenavne, stoppes med det samme. Det
  stykke, der gør navnet færdigt, sendes ikke.
- Trykker læseren Stop, eller lukker læseren siden, afbrydes modelkaldet. Der startes ingen
  reservemodel, og intet logges som fejl.

Workers AI's strøm læses i `functions/lib/chat/model-stream.js`. Cloudflare dokumenterer, at
strømmen er `text/event-stream`, men ikke formen på hvert stykke for de to modeller. Derfor
læses begge kendte former: `choices[0].delta.content` og `response`. Modellens skjulte
ræsonnering sendes aldrig videre. Svarer en model uden strøm, selv om den blev bedt om en,
kontrolleres svaret og sendes som ét stykke.

### Widgeten

| Fil | Ansvar |
|---|---|
| `src/scripts/assistant/request.ts` | Spørger med `fetch` og læser strømmen; henter JSON-svaret, når strømmen ikke kan bruges. |
| `src/lib/assistant-stream.mjs` | Bytes → hændelser, og hvilken del af et halvt skrevet svar der kan vises. Ingen DOM, så Node tester den. |
| `functions/lib/chat/sse-decoder.js` | Læser Server-Sent Events. Bruges både af Workeren (modellens strøm) og af browseren. |
| `src/scripts/assistant/draft-view.ts` | Svaret, mens det er på vej: statuslinje, kilder og tekst. |
| `src/scripts/assistant/follow-scroll.ts` | Holder skrivestedet i syne, så længe læseren bliver der. |
| `src/scripts/assistant/composer.ts` | Stop-knappen, der står på Send-knappens plads, mens et svar er på vej. |

- Teksten går gennem samme sikre visning som et færdigt svar (tekstnoder, ingen HTML fra
  modellen) og tegnes højst én gang pr. billede på skærmen.
- Visningen følger skrivestedet og ruller kun nedad. Ruller læseren op for at læse, bliver
  visningen stående, også når svaret er færdigt.
- Skærmlæsere får besked, når status skifter, og får det færdige svar. Udkastet læses ikke op
  ord for ord (`aria-live="off"`, mens det skrives).
- Med reduceret bevægelse vises teksten en hel linje ad gangen.
- Stop afbryder kaldet. Udkastet fjernes, og læseren kan prøve igen. Fokus flytter til Stop,
  når spørgsmålet sendes fra feltet eller med »Prøv igen«, og tilbage til feltet, når svaret
  er færdigt eller stoppet. Fejler svaret, mens fokus står på Stop, flytter fokus til
  »Prøv igen« (`error-view.ts`).
- Widgeten henter JSON-svaret i stedet, når browseren ikke kan læse en strømmet krop, når
  serveren svarer med JSON, og når strømmen fejler, før der er vist tekst. I det sidste
  tilfælde spørges der én gang til; det tæller som et nyt kald i hastighedsgrænsen og giver
  et nyt modelkald.
- Kun et færdigt svar gemmes i `sessionStorage`.

### Slå strømmen fra

Sæt `STREAMING_ENABLED` til `false` i `functions/lib/chat/limits.js`, og udgiv. Alle kald får
da JSON-svaret, og widgeten viser det i ét stykke uden flere ændringer.

## Kontrollér strømmen efter udgivelse

Et kald mod den levende side bruger Workers AI-kvoten og tæller med i grænsen på 12 kald pr.
minut. Brug det til kontrol, ikke i tests.

```bash
curl -N -sS -X POST https://smartbolig.net/api/chat \
  -H "content-type: application/json" \
  -H "accept: text/event-stream" \
  --data '{"locale":"da","messages":[{"role":"user","content":"Hvilken Zigbee-koordinator skal jeg bruge til Zigbee2MQTT?"}]}'
```

Det skal ses:

1. `event: status` med `searching` kommer straks.
2. `event: sources` med links til smartbolig.net, derefter `status` med `writing`.
3. Mange `event: delta` efter hinanden, mens svaret skrives. Kommer hele teksten i ét `delta`
   lige før `done`, sender modellen ikke en strøm, eller dens stykker har en anden form end
   de to, `model-stream.js` læser.
4. `event: done` med `answer`, `sources` og `diagnostics`, og til sidst `data: [DONE]`.

Tid pr. linje (Git Bash eller Linux):

```bash
curl -N -sS -X POST https://smartbolig.net/api/chat \
  -H "content-type: application/json" \
  -H "accept: text/event-stream" \
  --data '{"locale":"da","messages":[{"role":"user","content":"Hvilken Zigbee-koordinator skal jeg bruge til Zigbee2MQTT?"}]}' \
  | while IFS= read -r line; do printf '%s %s\n' "$(date +%s.%N | cut -c1-14)" "$line"; done
```

Tiden fra første linje til første `delta` er ventetiden på første ord.

## Fejlsøg et langsomt eller fejlet svar

1. Find kaldets nummer: `X-Request-Id` i svarhovedet, `requestId` i `done` eller sporet i
   telemetrilinjen under svaret i widgeten.
2. Se Workerens log med `npx wrangler tail`, og søg på nummeret:

   | Loglinje | Betydning |
   |---|---|
   | `SmartBolig chat model fallback` med `event: fallback_started` | Qwen overtog. `reason` siger hvorfor: `primary_error` (`error` er fejlens navn, fx `TimeoutError` efter 55 sekunder), `truncated_primary_response`, `invalid_primary_response` eller `empty_primary_response`. |
   | `SmartBolig chat model fallback` med `event: fallback_failed` | Qwen kunne heller ikke: `truncated_fallback_response`, `invalid_fallback_response`, `empty_fallback_response` eller `fallback_error`. |
   | `SmartBolig chat generation failed` | Læseren fik en fejl (JSON 502 eller `error` i strømmen). `error` er årsagens navn. |
   | `SmartBolig site search unavailable` | Opslaget fejlede eller tog over 5 sekunder; svaret blev skrevet uden guideuddrag. |
   | `SmartBolig chat rate limiter unavailable` | Hastighedsgrænsen svarede ikke; læseren fik 503. |

3. Læs strømmen med kommandoen ovenfor:
   - Lang pause efter `status` med `writing` og før første `delta`: modellen er længe om at
     begynde. `diagnostics.durationMs` i `done` er hele kaldets tid målt i Workeren.
   - `status` med `revising`: første udkast blev kasseret; loglinjen `fallback_started` siger
     hvorfor.
   - `status` med `reading` først: beskeden havde intet smart home-ord, så modellen afgør
     selv, om der skal søges. Søger den, koster det et modelkald mere.
   - `error`: se loglinjerne for kaldets nummer.
4. Sammenlign med JSON-svaret: samme kommando uden `accept`-linjen. Er JSON-svaret lige så
   længe undervejs, ligger tiden i modellen og ikke i strømmen.
5. I browseren: udviklerværktøjer → Netværk → kaldet `chat`. Svartypen er
   `text/event-stream`, når strømmen bruges. To kald lige efter hinanden betyder, at strømmen
   fejlede før første tekst, og at widgeten hentede JSON-svaret.

## Ændr noget

| Ønske | Sted |
|---|---|
| Slå strømmen fra | `STREAMING_ENABLED` i `functions/lib/chat/limits.js` |
| Teksterne i statuslinjen ("Søger i guiderne …") | `stages` i `src/lib/assistant-copy.ts`, dansk og engelsk |
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
