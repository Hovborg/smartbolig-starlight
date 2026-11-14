# Assistenten: søgning i sidens egne guides og svar, mens de skrives

Sidst opdateret: 2026-11-14 (søg først; modellen får intet værktøj; hver besked søges alene,
en ren afslutning søges der ikke efter, og en senere besked får aldrig siderne fra et
tidligere spørgsmål).
Sidst kontrolleret: 2026-11-14.
Kontrolleret ved (reglen efter den fjerde og den femte uafhængige gennemgang): `npm run
site:test` (alle bestået, tallet står i pull requesten). Reglen er målt med 2.261 samtaler på
to beskeder (1.186 danske, 1.075 engelske), som den tredje og den fjerde gennemgang selv
skrev, mod det byggede indeks i `dist/_index/` med et lille skript uden byggeri og med en
efterlignet model (tallene står under "Målt med samtaler"). Den femte gennemgang kørte 520
samtaler i sine egne ord, også som strøm og med tre og fem beskeder, og fandt ingen besked,
der fik et tidligere spørgsmåls sider. 195 ændringer af koden er prøvet én ad gangen, og
testene fejler på dem alle.
Ikke kontrolleret før udgivelsen: et rigtigt svar gennem Workers AI på den levende side med
den nye regel, herunder hvordan modellen svarer på en opfølgning, når den ingen nye uddrag
får. Kommandoen står under "Kontrollér strømmen efter udgivelse".
Kontrolleret ved (søg først-ændringen): `npm run site:test` (482 tests, alle bestået), og
prøvelisterne for pointgrænsen kørt mod det byggede indeks med et lille skript uden byggeri.
Kontrolleret ved (strømmen og indekset): `npm run site:test` (indeksets og chattens tests; strømmen er prøvet med en
efterlignet model), `npm run build` (indekset bygges, og de faste prøvespørgsmål består),
ca. 40 spørgsmål mod det byggede indeks med `--ask` og en uafhængig gennemgang, hvis fund er
rettet (tomme uddrag, ental/flertal, faneblade, svage kilder). Widgeten er prøvet i headless
Chrome mod et efterlignet `/api/chat`: strøm, fejl før og efter første tekst, stop, omskrivning
og svar uden strøm, i lyst og mørkt tema ved 320, 375 og 1440 px.
Formen på Workers AI's strøm er læst for begge modeller 2026-11-14 gennem Cloudflares REST-API
(ét kort spørgsmål til hver) og lagt ind som test. En anden uafhængig gennemgang af strømmen
fandt to blokerende fejl og fire mindre; de er rettet (interne navne i dele, en strøm der bare
lukker, stop før modelkaldet, blanke tegn som vist tekst, fejl efter vist tekst).
En tredje gennemgang af rettelserne fandt ingen blokerende fejl og fire mindre; de er rettet
(tilbageholdt tekst ved tokengrænsen, afslutningsårsag ved siden af `response`, en ukendt form
der lukker uden `[DONE]`, store og små bogstaver ens i de to kontroller). Hver rettelse er
prøvet ved at tage den ud igen: 13 ændringer, og testene fejler på dem alle.
Ikke kontrolleret lokalt: et rigtigt svar gennem Workerens egen binding, hvor hurtigt strømmen
kommer, og om `env.AI.run` stopper modellen, når kaldet afbrydes. Det skal ses på den levende
side efter udgivelse; kommandoen står under "Kontrollér strømmen efter udgivelse".

## Kort

Når en læser spørger assistenten om noget, slår Workeren først op i et indeks over sidens
egne sider. Kun en ren afslutning ("Tak for det") søges der ikke efter. Er det bedste afsnit
om spørgsmålet (se "Hvornår et opslag bruges"), får modellen de bedste afsnit sammen med
spørgsmålet, og svaret får links til de sider, afsnittene kom fra. Ellers svarer modellen
uden sidens tekst og uden links. Modellen får aldrig et værktøj og vælger ikke selv, om der
skal søges.

Hver besked søges alene. En senere besked i samtalen får aldrig siderne fra et tidligere
spørgsmål: en opfølgning uden eget emne ("Kan du uddybe?") får ingen nye sider, og modellen
svarer da ud fra samtalen.

Læseren ser med det samme, hvad der sker ("Søger i guiderne …"), får kilderne, så snart
opslaget er færdigt, og læser svaret, mens modellen skriver det. Se "Svaret som strøm".

Opslaget er lokalt (nogle få små JSON-filer, millisekunder, ingen pris), så det kan gøres
ved hvert spørgsmål. Før 2026-11-14 afgjorde modellen selv, om der skulle søges, når
spørgsmålet ikke havde et smart home-ord. Målt på den levende side med "Hvordan får jeg lyset
til at tænde ved bevægelse?" gav det 33 sekunder med "Læser dit spørgsmål …", hele svaret på
én gang og ingen kildelinks, selv om siden har flere guides om netop det.

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
| `scripts/lib/site-index/probes.mjs` | De faste prøvespørgsmål: siden i `page` skal være blandt de tre bedste svar. Desuden to lister uden smart home-ord (`OFF_TOPIC`, `ON_TOPIC`), der holder pointgrænsen. |
| `functions/lib/site-search/tokens.js` | Tekst → søgeord (små bogstaver, uden fyldord, bøjningsendelser skåret af). Bruges både ved bygning og ved søgning. |
| `functions/lib/site-search/search.js` | Søgningen i Workeren: læser kun de filer, spørgsmålet har brug for. Har også `USEFUL_SCORE`, pointgrænsen. |
| `functions/lib/site-search/assets.js` | Henter indeksfilerne fra Workerens statiske filer (`env.ASSETS`). |
| `functions/lib/chat/search-need.js` | Ordene, der afgør opslaget: smart home-ord og afslutningsord (tak, farvel, hilsen, "fint"). Desuden, om læseren har spurgt om noget før den seneste besked. |
| `functions/lib/chat/turn.js` | Kalder søgningen med en tidsgrænse og gemmer kun kilder fra et resultat, der bruges. Fejler søgningen, svarer assistenten uden guideuddrag. |
| `functions/lib/chat/agent.js` | Søger først (ét opslag med den seneste besked alene, intet efter en ren afslutning), vælger prompt efter resultatet og kører ét modeltrin. |
| `functions/lib/chat/sources.js` | Slipper kun `smartbolig.net`-adresser igennem som kilder og afkorter teksten. |
| `scripts/site-index.test.mjs` | Tests for indekset, søgeordene og søgningen. |
| `scripts/chat-search-need.test.mjs` | Tests for ordene i `search-need.js`. Ordlisterne for afslutninger står i testen ord for ord. |
| `scripts/chat-search-first.test.mjs` | Tests for, hvad der søges efter, og hvad modellen får. Holder også, at en senere besked aldrig får et tidligere spørgsmåls sider. |

## Filerne i indekset

`dist/_index/<sprog>/` (dansk og engelsk hver for sig):

| Fil | Indhold |
|---|---|
| `meta.json` | Version, antal sider, stykker og ordfiler, og `subjects`: ordene i sidernes titler. Læses én gang pr. Worker-instans. |
| `t/<nummer>.json` | Ordfiler: ord → liste af (stykke, vægt). Et ord ligger altid i samme fil (hash af ordet). |
| `c/<nummer>.json` | Stykkefiler: 8 stykker pr. fil med adresse (med anker), sidetitel, overskrift og tekst. |

Et spørgsmål læser højst 19 filer: `meta.json`, én ordfil pr. søgeord (højst 10) og højst 8
stykkefiler. Et chatkald gør højst ét opslag, så det ligger under Workerens loft for delkald.

Målt 2026-11-14 på 173 sider pr. sprog (bygningens sidste linjer): dansk 2.400 stykker, 429
filer og 2,7 MB; engelsk 2.355 stykker, 424 filer og 2,4 MB. Den største ordfil er ca. 18 KB.
Et spørgsmål med ti meget almindelige ord læste ca. 160 KB og brugte ca. 1,7 ms CPU, da det
blev målt på 167 sider (i Node på udviklingsmaskinen).

Et ord gemmes højst i sine 600 bedste stykker (`MAX_ENTRIES_PER_TERM`). Det rammer i dag fem
danske og tre engelske ord, bl.a. "assistant", "home" og "smart".

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

## Hvornår et opslag bruges

Reglen står i `lookUpSite` i `agent.js`. Ordene, den bruger, står i `search-need.js`. Der er
højst ét opslag pr. besked, og statussen `searching` meldes én gang.

1. **En ren afslutning søges der ikke efter** (`isClosing`). Det er en besked uden
   spørgsmålstegn, der kun består af afslutningsord og fyld omkring dem: tak, farvel, en
   hilsen eller et kort "fint". "Tak for det", "Ok super", "Det lyder godt", "Godt at vide",
   "Thanks, that was a big help" og "Hej" får derfor ingen kilder. Ét andet ord gør beskeden
   til noget, der søges efter: "Tak, det virkede ikke" og "Vis mig hvordan jeg sætter
   Zigbee2MQTT op, tak" er ikke afslutninger. "Ja" og "nej" er det heller ikke; de svarer på
   noget, assistenten spurgte om. "HA" med store bogstaver er Home Assistant og gør også
   beskeden til noget, der søges efter ("Hej, jeg skal have hjælp med HA", "Er HA godt"),
   undtagen når hele beskeden står med store bogstaver ("TAK HA DET GODT", "OK HA"); med
   små bogstaver er "ha" udsagnsordet i en hilsen ("Ha en god dag"). En afslutning går forud
   for et smart home-ord: "Ha en god dag" søges der ikke efter, selv om "ha" også er et
   smart home-ord.
2. **Alle andre beskeder søges alene.** Har beskeden et smart home-ord, bruges resultatet,
   uanset point (`always`). Ellers bruges det, når det bedste svar har mindst `USEFUL_SCORE`
   point (12, i `site-search/search.js`). Et svar uden et tal som point tæller som under
   grænsen.
3. Ellers bruges intet.

Søgeteksten er altid den seneste brugerbesked og kun den, afkortet til
`MAX_SEARCH_QUERY_CHARS` (400). En besked søges aldrig sammen med en tidligere besked, og
siderne fra et tidligere spørgsmål gives aldrig til en senere besked. Grunden står under
"Hvorfor en besked søges alene".

Afslutningsordene (`CLOSING_WORDS`) er tak, takker, farvel, hej, hejsa, goddag, godmorgen,
godaften, godnat, ok, okay, super, fint, godt, god, perfekt, fedt, dejligt, fantastisk,
forstået og mening; på engelsk thanks, thank, thx, cheers, bye, goodbye, alright, fine, great,
perfect, nice, cool, awesome, understood, sense, good, goodnight, helps, got, hi, hello og hey.
Mindst ét af dem skal stå i beskeden. Fyldet omkring dem (`PADDING_WORDS`) er ord som for,
det, den, du, din, skal, have, hjælpen, svar, var, er, lyder, giver, nu, og, jeg, vil, prøve,
you, your, so, much, the, help, that, it, was, is, sounds, makes, and og try; hele listen står
i filen. Ordene er hele ord, uanset store og små bogstaver, og begge slags apostrof læses ens
("That's" og "That’s"), og et bogstav skrevet som grundbogstav og tegn ("a" og en ring) læses
som bogstavet. `scripts/chat-search-need.test.mjs` har begge lister ord for ord og
sammenligner dem med listerne i koden: et ord, der tages ud eller sættes ind, får testen til
at fejle.

Modellen får altid hele samtalen (højst 10 beskeder), også sit eget tidligere svar. En
opfølgning uden eget emne ("Kan du uddybe?", "Hvorfor?", "Det virkede ikke") finder ingen
sider alene. Den får derfor ingen nye uddrag og ingen kildelinks, og svaret bygger på
samtalen og modellens egen viden. Uddragene fra det tidligere opslag er ikke med: modellen
ser sit tidligere svar, ikke siderne, det blev skrevet ud fra. Var det tidligere svar et
spørgsmål tilbage ("ZHA eller Zigbee2MQTT?"), og svarer læseren "Det ved jeg ikke", har
modellen derfor ingen af sidens tekst at svare ud fra. Kilderne under det tidligere svar står
der stadig.

Resultatet får modellen i fire tilstande (`agent.js`, teksterne i `SEARCH_INSTRUCTIONS` i
`prompt.js`):

- `supplied`: opslaget fandt afsnit, og de bruges. Modellen får dem, og siderne bliver kilder.
- `nothing`: den første besked i samtalen, og opslaget fandt intet om den (under grænsen,
  eller et smart home-ord og et tomt resultat), eller den var en ren afslutning. Ingen afsnit,
  ingen kilder (`sourceMode` er `general`), og systemprompten siger, at der ikke blev fundet
  en relevant side, at modellen skal svare ud fra bred viden og aldrig opfinde en
  SmartBolig-kilde.
- `continued`: en senere besked i samtalen uden sider, af de samme grunde. Ingen afsnit, ingen
  kilder. Prompten siger, at der ikke er givet en side til den seneste besked. Fortsætter den
  samtalen (en opfølgning, et svar på noget, assistenten spurgte om, en fejlmelding, en tak),
  skal modellen svare i samtalens sammenhæng, lægge bred viden til, hvor samtalen ikke har
  svaret, og ikke fremstille noget nyt som kommende fra SmartBolig. Spørger den om noget nyt,
  skal modellen svare ud fra bred viden og sige, at svaret er almen viden. Den må aldrig
  opfinde en SmartBolig-kilde.
- `unavailable`: indekset kan ikke læses, eller opslaget fejlede eller timede ud. Det gælder
  også med et smart home-ord. Ingen afsnit, og prompten siger, at søgningen ikke er
  tilgængelig.

### Hvorfor en besked søges alene

Tre tidligere udgaver søgte en opfølgning sammen med beskeden før den, for at "Kan du
uddybe?" kunne få det gamle emnes sider. Hver af dem gav forkerte kilder et andet sted, og
fire uafhængige gennemgange fandt dem:

- **De to beskeder søgt som én, hver gang:** det gamle emne tog over ved et emneskift.
  "Hvilken robotstøvsuger er bedst?" og så "Hvad er MQTT?" gav kun sider om robotstøvsugere.
- **Regler om bestemte ord** (ord, der peger tilbage; "den" søgt sammen med det gamle emne
  først; kendeord foran et tillægsord; et takkeord et sted i beskeden): hver regel tog rigtige
  spørgsmål med sig. "Vis mig hvordan jeg sætter Zigbee2MQTT op, tak" blev ikke søgt.
- **Søgt sammen med beskeden før, når beskeden intet fandt alene og kun havde ord, siden
  kender:** et nyt emne lige under grænsen ("Hvordan styrer jeg min garageport?", 11,81 point)
  fik det tidligere spørgsmåls sider i 55 af 240 samtaler. Afslutninger og spørgsmål om
  assistenten ("Tak for din hjælp", "Hvem er du?", "👍") fik det tidligere emnes kilder.

Efter den fjerde gennemgang er det målt på dens egne beskeder, om indekset kan skelne en
opfølgning fra et nyt emne og en afslutning. Det kan det ikke: hverken bedste point, antallet
af søgeord eller hvor sjældne ordene er på siden skiller de tre slags ad. "Kan du uddybe?" og
"Hvem er du?" ser ens ud for indekset.

Derfor er reglen nu den, hvis eneste fejl er den mildeste: en besked, der intet finder alene,
får ingen kilder. En manglende kilde koster læseren mindre end et link til en side om noget
andet. Prisen står under "Målt med samtaler".

Mulige næste skridt, ikke bygget: lade modellen skrive søgeteksten til en opfølgning (ét
modelkald mere pr. opfølgning, og det koster neuroner), eller give modellen det tidligere
spørgsmåls uddrag mærket som tidligere. Se B62 i `docs/redesign/BESLUTNINGER.md`.

### Målt med samtaler

Målt 2026-11-14 mod det byggede indeks (173 sider pr. sprog), med en efterlignet model. Hver
samtale er et åbningsspørgsmål, som siden har en guide om, et svar og én besked mere: 2.261
samtaler (1.186 danske, 1.075 engelske). Beskederne er skrevet af den tredje og den fjerde
uafhængige gennemgang, ikke af den, der skrev reglen.

**I alle 2.261 samtaler viser den senere besked præcis de kilder, den viser som første
besked, og den søges højst én gang.** Ingen besked får en side gennem spørgsmålet før. Det
samme gælder 30 samtaler med tre beskeder i træk.

Tabellen viser, hvad den senere besked får. "Egne sider" er de sider, beskeden finder alene.

| Senere besked | Samtaler (da / en) | Ingen kilder (da / en) | Egne sider (da / en) |
|---|---|---|---|
| Nyt emne: med smart home-ord, uden, med "den", "det", "it" i, flere sætninger (3. gennemgang) | 168 / 130 | 0 / 0 | 168 / 130 |
| Nyt smart home-emne uden smart home-ord (4. gennemgang, 24 spørgsmål pr. sprog) | 120 / 120 | 45 / 25 | 75 / 95 |
| Tak og bekræftelser ("Tak for det", "Godt at vide") (3.) | 108 / 90 | 108 / 85 | 0 / 5 |
| Afslutninger i gennemgangens egne ord ("Tak for din hjælp", "👍") (4.) | 120 / 120 | 120 / 120 | 0 / 0 |
| Spørgsmål om assistenten og småsnak ("Hvem er du?") (4.) | 50 / 50 | 50 / 50 | 0 / 0 |
| Spørgsmål om andet ("Hvad er hovedstaden i Australien?") (3.) | 96 / 80 | 84 / 60 | 12 / 20 |
| Opfølgninger (3.: med og uden "den" og "det", bare fortsættelser, flere sætninger) | 324 / 285 | 186 / 185 | 138 / 100 |
| Opfølgninger (4.: almindelige, med stavefejl eller slang, fejlmeldinger i datid) | 200 / 200 | 170 / 155 | 30 / 45 |

Det, der falder anderledes, end en læser ville ønske:

- **En opfølgning uden eget emne får ingen sider.** Det er prisen for reglen: 356 af 524
  danske og 340 af 485 engelske opfølgningssamtaler får ingen nye uddrag og ingen kildelinks.
  Svaret bygger på samtalen. Den forrige udgave gav åbningens sider til en opfølgning uden
  "den" eller "det" i 57 af 84 danske og 66 af 80 engelske samtaler og til en bar fortsættelse
  i 54 af 60 og 47 af 50; det er valgt fra, fordi samme regel gav forkerte kilder til nye
  emner og afslutninger.
- **En opfølgning, der selv når grænsen, får sine egne sider** (168 danske og 145 engelske
  samtaler). De handler om beskedens ord, ikke nødvendigvis om åbningens emne: "Hvad koster
  det cirka?" (18,83 point), "Hvor lang tid tager det?", "Virker den uden internet?", "Skriv
  koden", "Roughly what does it cost?", "What if it doesn't work?".
- **En opfølgning med et smart home-ord bruger sit eget resultat:** "Kan den bruge Zigbee?",
  "Does it need a hub?".
- **Et nyt smart home-emne uden smart home-ord og under grænsen får ingen kilder:** 9 af den
  fjerde gennemgangs 24 danske spørgsmål og 5 af de 24 engelske, fx "Hvordan styrer jeg min
  garageport?" (11,81 point). Modellen svarer ud fra bred viden.
- **Nogle spørgsmål om andet når selv grænsen** og får egne, irrelevante sider: "Kan du
  anbefale en god bog?", "Er det sundt at drikke kaffe?", "Can you recommend a good book?",
  "What will the weather be like tomorrow?", "Who won the Tour de France last year?", "Is it
  healthy to drink coffee?".
- **"I'll try that" når selv grænsen** og får egne sider (5 af de 90 engelske
  taksamtaler). Beskeden har intet afslutningsord og søges derfor.
- **En besked på det andet sprog søges i sidens sprog:** "Can you explain more?" på den
  danske side finder nyhedssider (14,88 point).

En første besked med et takkeord i ("Vis mig hvordan jeg sætter Zigbee2MQTT op, tak", "Help me
choose a robot vacuum, thanks") får sine sider i alle 14 prøvede tilfælde.

**En tak i ord, ingen liste har set, viser en kilde i ca. hver niende samtale.** Fyldordene
er udvidet ud fra de to rækker med tak og afslutninger i tabellen, så de to rækker siger ikke,
hvordan en ny tak falder. Den femte gennemgang skrev derfor 50 danske og 50 engelske
takkebeskeder, som ingen tidligere liste havde, og sendte dem efter et spørgsmål om
Zigbee-sensorer:

| Sprog | Afslutning (søges ikke) | Søgt, ingen kilder | Viser kilder |
|---|---|---|---|
| Dansk | 16 af 50 | 29 | 5 |
| Engelsk | 16 af 50 | 28 | 6 |

De 11 får beskedens egne sider, ikke det tidligere spørgsmåls: "Tak, jeg vender tilbage"
(23,92 point), "Tak, det løste problemet" (17,42), "Tak for en god forklaring" (17,15),
"Thanks, I'll read the guide" (13,55), "Thanks, you've been a great help" (14,90). Siderne
handler om beskedens ord og er irrelevante for læseren. Det er målt, om et ord fra en
sidetitel i beskeden kan skille en tak fra en anmodning med en tak i: det kan det ikke ("Mange
tak, kan du også vise hvordan jeg opdager en vandlækage" har intet titelord, "Thanks, I'll
read the guide" har to). Flere fyldord retter de 11, men ikke den næste liste.

Grænsen er målt 2026-11-14 for spørgsmål uden smart home-ord. "Før" er målt før de nye
fyldord (167 sider), "Nu" mod indekset med 173 sider:

| Spørgsmål | Før | Nu |
|---|---|---|
| "Hvordan kommer jeg i gang?" | 13,33 | 14,35 |
| "Hvordan lader jeg elbilen billigt?" (afløser "Min pære blinker …", der nu har et smart home-ord) | | 18,64 |
| "Hvordan får jeg lyset til at tænde ved bevægelse?" | 31,61 | 31,53 |
| "Hvad koster det at holde en computer tændt hele året?" (afløser "… en router …", samme grund) | | 54,24 |
| "Hvem vandt VM i fodbold i 2022?" | 9,42 | 9,44 |
| "Hvordan bager jeg et rugbrød?" | 5,82 | 5,76 |
| "Skriv et digt om efteråret" | 5,42 | 5,28 |
| "tak for hjælpen" | 7,03 | søges ikke (afslutning) |
| "Fortæl en vittighed" | 6,27 | 6,28 |
| "ja tak" | 14,43 | ingen søgeord |
| "Hej" | 6,85 | søges ikke (afslutning) |
| "Hvad er hovedstaden i Frankrig?" | intet svar | intet svar |
| Engelsk: "Which plug can measure power?" | 28,6 | 28,40 |
| Engelsk: "What is the best way to get started?" | 17,89 | 17,84 |
| Engelsk: "My light keeps flickering, what do I do?" (afløser "My bulb …") | | 27,63 |
| Engelsk: "What is the capital of France?" | 4,47 | 4,46 |
| Engelsk: "How do I bake bread?" | 7,35 | 7,36 |
| Engelsk: "Tell me a joke" | 16,14 | intet svar |
| Engelsk: "Thank you" | 6,84 | søges ikke (afslutning) |
| Engelsk: "Who won the 2022 World Cup?" | 13,23 | 9,42 |

I tabellen ligger spørgsmålene om siden på 14,35 eller derover og de andre på 9,44 eller
derunder, og grænsen 12 ligger mellem dem. Det gælder tabellens rækker, ikke alle spørgsmål:
et spørgsmål om et smart home-emne kan også ligge under grænsen ("Hvordan styrer jeg min
garageport?", 11,81), og et spørgsmål om andet over den; se "Målt med samtaler". Alle 11
danske og 7 engelske faste prøvespørgsmål (`PROBES`) står stadig blandt de tre bedste.

Hverdagsspørgsmål er målt med en liste på 20 danske og 24 engelske ("Tell me a joke", "ja
tak", "Good morning", "What can you help me with?" og lignende), alle uden smart home-ord:

| Sprog | Før | Efter fyldordene |
|---|---|---|
| Dansk | 4 af 20 på 12 point eller mere | 2 af 20 |
| Engelsk | 10 af 24 på 12 point eller mere | 6 af 24 |

De, der stadig når grænsen (målt igen på 173 sider), har et ord, siden skriver om, eller et
tal: "Hvilken film skal jeg se i aften?" (24,82, "film"), "Hvad er 17 gange 23?" (16,58), "What
movie should I watch tonight?" (23,57), "What is 17 times 23?" (16,61), "Write a cover letter
for a carpenter job" (15,73), "Write a Python function that sorts a list" (15,62) og "Who is
the president of the United States?" (13,17). "Good morning" når også grænsen i indekset
(15,31, "morning" findes i morgenrutiner), men assistenten søger ikke efter en hilsen. De
andre kan kun rettes med flere sider eller en anden grænse, ikke med fyldord.
Giver de en kilde, når nogen spørger, er det sådan, grænsen virker, ikke en fejl i koden.

Fyldordene er tilføjet i `tokens.js`: dansk bl.a. ja, nej, tak, hej, ok, okay, super, venligst,
gerne, lidt, altså, hvornår, hvilket; engelsk bl.a. me, tell, who, please, thanks, thank, hello,
hi, hey, ok, okay, yes, would, could, did, am, our, he, she, his, him, them, these, those, its,
very, too, just. Ord, der står i sidernes titler, er ikke fyldord: "no", "about", "us", "her"
(og "here", der bliver til "her") og "may". "have" er heller ikke fyldord (det er også havens
ord). Er et spørgsmål nu kun fyldord ("ja tak"), har det ingen søgeord og giver intet svar.

Et fyldord koster noget, når det også er et navn eller et emne. "ok" er fyldord, så "Ok Nabu"
(Home Assistants vækkeord) står som smart home-ord i stedet. "who", "me", "ja" og "yes" kan
ikke længere findes som søgeord; ingen side har dem som emne i dag. `scripts/site-index.test.mjs`
holder listen: hvert af de nye fyldord skal give nul søgeord.

Bygget vogter grænsen: `scripts/lib/site-index/probes.mjs` har `OFF_TOPIC` (bedste point bør
være under grænsen) og `ON_TOPIC` (mindst grænsen), pr. sprog, og `scripts/site-index.mjs`
stiller dem efter siderne. Et spørgsmål, der falder forkert, giver en advarsel på kørslen i
GitHub Actions med en linje som `da: "Hej" scores 13.2, which should be below 12.` Bygget
stopper ikke: point flytter sig lidt, hver gang der kommer en ny side (nyhederne kommer af sig
selv hver dag), og et spørgsmål på den forkerte side af grænsen giver kun et svar med eller
uden en kilde. Siden skal ikke stå stille af den grund. Ved en advarsel: mål igen med `--ask`,
og flyt så grænsen eller ret listen. Spørgsmålene i listerne må ikke have et smart home-ord;
det tjekker `scripts/site-index.test.mjs`, som også prøver selve grænsen mod et fast indeks.
Et spørgsmål i `OFF_TOPIC` må gerne bestå af fyldord alene.

Smart home-ordene (`SMART_HOME_WORDS` i `search-need.js`) er hele ord. Siden 2026-11-14 hører
også hub, gateway, pære, bulb, termostat, thermostat, router, homekit, alexa, google home, hue,
aqara, sonoff, tuya, ikea, zha, zigbee2mqtt, wled, vpn, raspberry pi, robotstøvsuger,
stikkontakt, smart plug og røgalarm til (med flertal og bestemt form), fordi et enkeltordsspørgsmål
som "Hvad er en hub?" kun fik 6,45 point. "hubris" og "pæretærte" tæller ikke. Efter den anden
gennemgang er også Ok Nabu, Nabu Casa og wake word med, og flere former: "hubberne",
"gatewayen", "routerne", "sensorerne", "kameraer", "cameras", "automationer", "elpriserne",
"solceller", "smart-plug", "raspberry-pi" og "google-home".

Fire ord har en hverdagsbetydning, som ordlyden afslører, og tæller da ikke: "ha'" (udsagnsordet,
med apostrof), "not matter", "doesn't matter" og "no matter", "this thread" og "social
security".

Kendte grænser:

- De beskeder, der falder anderledes end ønsket i målingen, står under "Målt med samtaler".
- En opfølgning uden eget emne får ingen sider og ingen kildelinks. Modellen har samtalen at
  bygge på, ikke nye uddrag.
- En opfølgning, der når grænsen alene, får sine egne sider og ikke det gamle emnes ("Hvor lang
  tid tager det?"). Det samme gælder en opfølgning med et smart home-ord ("Skal jeg bruge en
  hub?").
- Smart home-ord med en hverdagsbetydning tvinger stadig opslaget: "hue" (også en hue på
  hovedet), "pære" (også frugten), "IKEA", "Alexa", "hub", "bulbs", "gateway", "matter" og
  "thread" uden for de fire undtagelser, og "ha" uden apostrof ("Hvad skal jeg ha med?"). Et
  sådant spørgsmål bruger sit resultat, hvor svagt det end er; er resultatet tomt, bruges
  intet.
- En bekræftelse uden et afslutningsord ("Det vil jeg prøve", "I'll try that") er ikke en
  afslutning og søges alene.
- En tak i andre ord end listernes søges alene og kan vise en irrelevant kilde (11 af 100 i
  den femte gennemgangs liste).
- Et afslutningsord i en besked, der ellers kun har fyld, gør den til en afslutning, også når
  den var ment som et svar eller et spørgsmål uden spørgsmålstegn: "Det er fint" og "Giver
  det mening at prøve ha" (med små bogstaver) søges der ikke efter.
- En tak, der nævner HA med store bogstaver ("Tak, HA virker nu"), søges og får fem kilder:
  to om Home Assistant og tre produktsider. Et grin med store bogstaver ("HA HA, tak") søges
  også og får kilder.
- En besked, der står helt med store bogstaver, læses som med små: "HEJ, HJÆLP MED HA" er en
  afslutning og søges der ikke efter.
- Et spørgsmål, der kun har fyldord ("ja tak", "Hvorfor?"), har ingen søgeord og finder intet.
- Valgt fra: at søge en besked sammen med en tidligere besked. Se "Hvorfor en besked søges
  alene".

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
Et spørgsmål i `OFF_TOPIC` eller `ON_TOPIC` med point på den forkerte side af `USEFUL_SCORE`
stopper ikke bygget; det giver kun den advarsel, der står ovenfor.

Svarer assistenten uden links, selv om der er en guide om emnet, så spørg indekset med
`--ask` og se de bedste point. Er de under 12, bruges resultatet ikke (medmindre spørgsmålet
har et smart home-ord): ret sidens tekst, så den bruger spørgerens ord.

På den levende side: svarer assistenten uden links til guides, så se Workerens log efter
`SmartBolig site search unavailable` (`npx wrangler tail`). Den skrives, når en indeksfil
mangler, eller søgningen tog over 5 sekunder.

## Fra spørgsmål til svar

Et spørgsmål går gennem de samme trin, uanset om svaret hentes som JSON eller som strøm:

1. `handler.js` afviser forkerte kald (metode, fremmed oprindelse, indholdstype, manglende
   binding), spørger `CHAT_RATE_LIMITER` én gang og validerer samtalen.
2. `turn.js` vælger de officielle evidenspakker og gør opslaget i indekset klar (tidsgrænse
   5 sekunder).
3. `agent.js` søger (højst ét opslag med den seneste besked alene, status `searching` én gang,
   også efter en tak), afgør af resultatet hvilken prompt modellen får (se tabellen) og
   skriver svaret (status `writing`).
4. `model-runs.js` kører modeltrinnet: Gemma først. Qwen overtager, hvis Gemma fejler,
   bliver afskåret eller ikke består kontrollen i `answer.js`.
5. `turn.js` samler svar, kilder, kildegrad og telemetri til den krop, læseren får.

| Opslaget | Tilstand | Afsnit til modellen | Kilder | Prompt |
|---|---|---|---|---|
| Resultat med afsnit, og smart home-ord eller bedste point mindst 12 | `supplied` | Ja | Ja | Referencedata er givet |
| Første besked: smart home-ord og et tomt resultat, eller intet smart home-ord og bedste point under 12 eller intet svar | `nothing` | Nej | Kun officielle | Der blev ikke fundet en relevant side |
| Første besked: en tak eller et farvel uden spørgsmålstegn (intet opslag) | `nothing` | Nej | Kun officielle | Der blev ikke fundet en relevant side |
| Senere besked uden sider: de samme tre tilfælde | `continued` | Nej | Kun officielle | Ingen side til den seneste besked: svar ud fra samtalen, eller ud fra bred viden ved et nyt emne |
| Et opslag fejlede eller timede ud, med eller uden smart home-ord | `unavailable` | Nej | Kun officielle | Søgningen er ikke tilgængelig |
| Intet indeks (`searchSmartbolig` mangler) | `unavailable` | Nej | Kun officielle | Søgningen er ikke tilgængelig |

Der er højst ét opslag (intet efter en tak og intet uden indeks) og ét modelkald, der strømmes,
når kaldet bad om en strøm. Rækkefølgen holdes fast af `scripts/chat-search-first.test.mjs` og
`scripts/chat-stream.test.mjs` med en efterlignet model. Modellen får aldrig `tools`. En
model kan stadig finde på at skrive værktøjets navn; filteret i `answer.js` afviser det.

## Svaret som strøm

Et kald med `Accept: text/event-stream` får svaret som Server-Sent Events. Et kald uden får
JSON-svaret som hidtil. Et afvist kald (429, 400, 413, 403, 415, 503) får altid JSON med sin
statuskode, også når det bad om en strøm.

| Hændelse | Data | Betydning |
|---|---|---|
| `status` | `{"stage": …}` | Hvad der sker nu: `searching`, `writing` eller `revising`. (Før den første hændelse når frem, viser widgeten "Arbejder på dit svar …"; `reading` findes ikke mere, hverken på serveren eller i widgeten.) |
| `sources` | `{"sources": [{"title", "url"}]}` | Én gang, når opslaget er færdigt, og altid før første tekst. Listen er tom, når opslaget ikke blev brugt, og ingen officiel kilde er valgt. |
| `delta` | `{"text": "…"}` | Et stykke af svaret. |
| `done` | Samme krop som JSON-svaret | Det kontrollerede svar. Kun `done` er et svar. |
| `error` | `{"code", "error": {"da", "en"}}` | Samme krop som et fejlet JSON-svar. |

Strømmen slutter med linjen `data: [DONE]`. Svarhovederne er
`Content-Type: text/event-stream; charset=utf-8`, `Cache-Control: no-store`,
`X-Content-Type-Options: nosniff` og `X-Request-Id`.

Regler for tekst, læseren allerede har set:

- En anden model skriver aldrig videre på den. Fejler Gemma, før der er vist tekst, overtager
  Qwen som hidtil. Fejler Gemma, efter at der er vist tekst (fejl, tidsfrist på 55 sekunder,
  en fejl sendt inde i strømmen), trækkes udkastet tilbage med `status` `revising`, og Qwen
  skriver et nyt. Fejler Qwen, slutter strømmen med `error`. Der er ét modeltrin pr. svar
  (Gemma, og Qwen hvis Gemma fejler), som uden strøm.
- Et færdigt udkast, der ikke består en kontrol (afskåret, forkert YAML-form, interne navne,
  for langt), trækkes tilbage på samme måde. Består Qwens udkast heller ikke, slutter strømmen
  med `error`. Kontrollerne er de samme som for JSON-svaret.
- En strøm, der bare lukker, er et halvt svar. Modellen skal have sagt, at den er færdig (en
  `finish_reason` eller `[DONE]`); ellers behandles udkastet som afskåret.
- Blanke tegn før første ord tæller ikke som vist tekst og sendes ikke.
- Et udkast, der nævner interne værktøjs- eller mærkenavne, stoppes med det samme. Navnet
  vises heller ikke i dele: slutningen af teksten holdes tilbage, så længe den kan være
  begyndelsen på et sådant navn (højst 26 tegn), til næste stykke afgør det
  (`heldBackLength` i `answer.js`). Slutter udkastet, fordi tokengrænsen er nået, vises det
  tilbageholdte heller ikke; udkastet trækkes alligevel tilbage. Teksten før navnet er
  allerede vist og kan ikke kaldes tilbage; den fjernes fra skærmen, når udkastet trækkes
  tilbage.
- Trykker læseren Stop, eller lukker læseren siden, afbrydes modelkaldet, og der startes
  ingen reservemodel, og intet logges som fejl. Sker det, før modellen er kaldt (under
  opslaget), kaldes modellen slet ikke. Ét forbehold: Cloudflare dokumenterer ikke, om
  `env.AI.run` stopper en model, der ikke strømmer, når kaldet afbrydes.

Workers AI's strøm læses i `functions/lib/chat/model-stream.js`. Cloudflare dokumenterer, at
strømmen er `text/event-stream`, men ikke formen på hvert stykke. Begge modellers strøm er
derfor læst 2026-11-14 gennem Cloudflares REST-API med et kort spørgsmål: svaret står i
`choices[0].delta.content`, ræsonneringen i `delta.reasoning_content` (Qwen også i
`delta.reasoning`), et stykke med `finish_reason` afslutter svaret, og strømmen slutter med
`[DONE]`. Qwen gentager hvert stykke i `response` og begynder svaret med en blank linje.
`scripts/chat-stream-models.test.mjs` har begge former som test. Den ældre form, hvor teksten
kun står i `response`, læses også. Modellens ræsonnering sendes aldrig videre. Svarer en
model uden strøm, selv om den blev bedt om en, kontrolleres svaret og sendes som ét stykke.

Ændrer Cloudflare formen, så læseren ikke kender nogen af stykkerne, giver strømmen ingen
tekst. Det logges som `unknown_primary_stream` eller `unknown_fallback_stream` (ikke som et
tomt eller afskåret svar), også når strømmen lukker uden `[DONE]`, og widgeten henter så
JSON-svaret; se fejlfindingen nedenfor. Et stykke tæller som kendt, når det har svartekst, en
`finish_reason` (i `choices[0]` eller ved siden af `response`), ræsonnering, en rolle, eller
er den tomme hale med forbrug.

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

Forsidens knap »Spørg AI« ved siden af søgefeltet åbner assistenten med markøren i feltet.
Den sender hændelsen `smartbolig-ai:open` på `document` (`src/lib/home-house.mjs`), som
`src/scripts/assistant/panel.ts` lytter på. Fokus går tilbage til knappen, når assistenten lukkes.

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
   lige før `done`, sender modellen ikke en strøm. Har dens stykker en anden form end de to,
   `model-stream.js` læser, kommer der ingen `delta` fra den model: reservemodellen skriver,
   eller strømmen slutter med `error`, og loggen siger `unknown_primary_stream` eller
   `unknown_fallback_stream`.
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
   | `SmartBolig chat model fallback` med `event: fallback_started` | Qwen overtog. `reason` siger hvorfor: `primary_error` (`error` er fejlens navn, fx `TimeoutError` efter 55 sekunder), `truncated_primary_response`, `invalid_primary_response`, `empty_primary_response` eller `unknown_primary_stream` (strømmen havde stykker, men i en form `model-stream.js` ikke kender: læs strømmen igen, og ret `readChunk`). |
   | `SmartBolig chat model fallback` med `event: fallback_failed` | Qwen kunne heller ikke: `truncated_fallback_response`, `invalid_fallback_response`, `empty_fallback_response`, `unknown_fallback_stream` eller `fallback_error`. |
   | `SmartBolig chat generation failed` | Læseren fik en fejl (JSON 502 eller `error` i strømmen). `error` er årsagens navn. |
   | `SmartBolig site search unavailable` | Opslaget fejlede eller tog over 5 sekunder; svaret blev skrevet uden guideuddrag. |
   | `SmartBolig chat rate limiter unavailable` | Hastighedsgrænsen svarede ikke; læseren fik 503. |

3. Læs strømmen med kommandoen ovenfor:
   - Lang pause efter `status` med `writing` og før første `delta`: modellen er længe om at
     begynde. `diagnostics.durationMs` i `done` er hele kaldets tid målt i Workeren.
   - `status` med `revising`: første udkast blev kasseret; loglinjen `fallback_started` siger
     hvorfor.
   - Ingen `sources`, selv om siden har en guide om emnet: opslaget var under 12 point og
     blev ikke brugt, eller beskeden var en opfølgning uden eget emne (den søges alene). Se
     "Hvornår et opslag bruges" og spørg indekset med `--ask`.
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
| Pointgrænsen for, om et opslag bruges (`USEFUL_SCORE`), og dens prøvelister | `search.js` og `OFF_TOPIC`/`ON_TOPIC` i `scripts/lib/site-index/probes.mjs`; mål igen med `--ask` |
| Ordene, der tvinger opslaget, og ordene i en ren afslutning | `functions/lib/chat/search-need.js` (ret også listerne i `scripts/chat-search-need.test.mjs`) |
| Teksten, modellen får om opslaget | `SEARCH_INSTRUCTIONS` i `functions/lib/chat/prompt.js` |
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
