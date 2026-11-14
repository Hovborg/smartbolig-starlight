# Assistenten: søgning i sidens egne guides og svar, mens de skrives

Sidst opdateret: 2026-11-14 (søg først; modellen får intet værktøj; et spørgsmål søges alene,
en opfølgning søges igen sammen med spørgsmålet før, et spørgsmål om "den" søges sammen med
spørgsmålet før først, og en tak søges der ikke efter).
Sidst kontrolleret: 2026-11-14.
Kontrolleret ved (opfølgningsreglen efter den anden uafhængige gennemgang): `npm run site:test`
(alle bestået, tallet står i pull requesten). Reglen er målt med 522 samtaler på to beskeder
mod det byggede indeks i `dist/_index/` med et lille skript uden byggeri og med en efterlignet
model (tallene står under "Målt med samtaler"). Indekset er bygget med de nye fyldord. 45
ændringer af koden er prøvet én ad gangen, og testene fejler på dem alle. Én (ordet "dem" taget
ud af listen) overlevede først, fordi testens eksempel også begyndte med "Hvad med"; eksemplet
er skiftet.
Ikke kontrolleret før udgivelsen: et rigtigt svar gennem Workers AI på den levende side med
den nye regel. Kommandoen står under "Kontrollér strømmen efter udgivelse".
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
egne sider, hver gang. Er det bedste afsnit om spørgsmålet (se "Hvornår et opslag bruges"),
får modellen de bedste afsnit sammen med spørgsmålet, og svaret får links til de sider,
afsnittene kom fra. Ellers svarer modellen uden sidens tekst og uden links. Modellen får
aldrig et værktøj og vælger ikke selv, om der skal søges.

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
| `functions/lib/site-search/search.js` | Søgningen i Workeren: læser kun de filer, spørgsmålet har brug for. Har også `USEFUL_SCORE`, pointgrænsen, og kan melde, hvor mange af spørgsmålets søgeord ingen side bruger (`report`). |
| `functions/lib/site-search/assets.js` | Henter indeksfilerne fra Workerens statiske filer (`env.ASSETS`). |
| `functions/lib/chat/search-need.js` | Ordene, der afgør opslaget: smart home-ord, ord der peger tilbage, ord der står for en ting, tak og farvel, og åbninger der spørger. Desuden søgeteksten for to beskeder sammen (seneste spørgsmål, så spørgsmålet før). |
| `functions/lib/chat/turn.js` | Kalder søgningen med en tidsgrænse og gemmer kun kilder fra et resultat, der bruges. Fejler søgningen, svarer assistenten uden guideuddrag. Et svagt opslag giver antallet af ukendte søgeord videre. |
| `functions/lib/chat/agent.js` | Søger først (højst to opslag, ingen efter en tak), vælger prompt efter resultatet og kører ét modeltrin. |
| `functions/lib/chat/sources.js` | Slipper kun `smartbolig.net`-adresser igennem som kilder og afkorter teksten. |
| `scripts/site-index.test.mjs` | Tests for indekset, søgeordene og søgningen. |
| `scripts/chat-search-need.test.mjs` | Tests for ordene i `search-need.js`. |
| `scripts/chat-search-first.test.mjs` | Tests for, hvad der søges efter i hvilken rækkefølge, og hvad modellen får. |

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

## Hvornår et opslag bruges

Reglen står i `lookUpSite` i `agent.js`. Ordene, den bruger, står i `search-need.js`. Der er
højst to opslag pr. besked, og statussen `searching` meldes én gang.

1. **En tak eller et farvel søges der ikke efter** (`isThanks`). Beskeden har et af ordene
   tak, takker, thanks, thank you, thx, farvel, bye, goodbye og intet spørgsmålstegn. "Tak for
   det" og "Perfekt, tak skal du have" får derfor ingen kilder. "Tak, men hvad koster den?"
   har et spørgsmålstegn og søges som et spørgsmål.
2. **Et spørgsmål om en ting, kun samtalen har nævnt, søges sammen med spørgsmålet før
   først** (`standsForAThing`): "Virker den med Home Assistant?", "Hvor køber jeg dem?",
   "Does it work with Hue?", "Which one is cheapest?". Når det bedste svar grænsen, bruges
   resultatet. Ellers søges spørgsmålet alene som i trin 3, og så stopper det.
3. **Alle andre spørgsmål søges alene først.** Har spørgsmålet et smart home-ord, bruges
   resultatet, uanset point (`always`). Ellers bruges det, når det bedste svar har mindst
   `USEFUL_SCORE` point (12, i `site-search/search.js`). Et svar uden et tal som point tæller
   som under grænsen.
4. **Fandt trin 3 intet brugbart, og er beskeden en opfølgning** (`isFollowUp`), **søges den
   igen sammen med spørgsmålet før.** Resultatet bruges kun, når det selv når grænsen.
5. Ellers bruges intet.

"Sammen med spørgsmålet før" (`joinedQuery`) er det seneste spørgsmål, et linjeskift og den
ene brugerbesked før det, afkortet til `MAX_SEARCH_QUERY_CHARS` (400). Det seneste kommer
først, fordi kun de første 10 ord i en søgning tæller (`MAX_QUERY_TERMS` i `tokens.js`). Ældre
beskeder kommer aldrig med. Er der ingen besked før, springes trin 2 og 4 over.

En besked er en opfølgning, når den ikke er en tak, og ét af to gælder:

- **Den peger tilbage** (`pointsBack`). Den har et af ordene den, det, de, dem, denne, dette,
  disse, dens, dets, deres, it, its, that, this, these, those, they, them, their, eller den
  begynder med "og ", "and ", "hvad med", "hvad så med" eller "what about".
- **Den spørger om noget med ord, siden kender** (`asks`, og opslaget i trin 3 fandt ingen
  ukendte søgeord): "Kan du uddybe?", "Hvorfor?", "Forklar nærmere", "Vis mig et eksempel".
  En besked spørger, når den har et spørgsmålstegn eller begynder med et spørgeord, et
  udsagnsord, der åbner et spørgsmål, eller en opfordring (hvad, hvordan, kan, er, forklar,
  vis, "jeg vil", what, how, can, explain, show, please, "I need"; hele listen er
  `ASKING_OPENINGS`). Et ukendt søgeord er et ord, ingen side på sproget bruger. "Hvad er
  hovedstaden i Frankrig?" har to ("hovedstaden" og "Frankrig"), så den er et emneskift og
  ikke en opfølgning.

Ord, der står for en ting (`standsForAThing`), er færre end ord, der peger tilbage:

- den, dem, dens, deres, them, their, its, "this one", "that one" og "which one". "det" og
  "de" er ikke med: "Er det muligt at styre varmen?" peger ikke på en ting.
- En besked, der begynder med does, doesn't, can, can't, will, won't, could, should, would
  eller did og derefter "it". "How does it work with solar panels?" og "Is it possible to
  …?" tæller ikke.

Foran et tillægsord er "den", "det" og "de" kendeord og peger ikke tilbage: "den bedste lås",
"det danske mesterskab", "de mest solgte". Reglen kender det på, at det næste ord ender på -e
eller er "mest" eller "mindst" (`NOT_THE_ARTICLE`).

Alle ord er hele ord, uanset store og små bogstaver. Ordgrænserne er unicode-sikre, så "pæden"
ikke tæller som "den".

Der er to rækkefølger, fordi hver af dem fejler på sin slags spørgsmål:

- Søges et nyt spørgsmål sammen med det gamle, tager det gamle emne over. "Hvilken
  robotstøvsuger er bedst?" og så "Hvad er MQTT?" gav kun sider om robotstøvsugere. Derfor
  søges et spørgsmål alene først.
- Søges "Virker den med Zigbee?" alene, finder det sider om Zigbee og ikke om den ting, "den"
  er. Derfor søges et spørgsmål om "den" sammen med spørgsmålet før først.

Resultatet får modellen i tre tilstande (`agent.js`):

- `supplied`: et opslag fandt afsnit, og de bruges. Modellen får dem, og siderne bliver kilder.
- `nothing`: opslagene fandt intet om spørgsmålet (under grænsen, eller et smart home-ord og
  et tomt resultat), eller beskeden var en tak. Ingen afsnit, ingen kilder (`sourceMode` er
  `general`), og systemprompten siger, at der ikke blev fundet en relevant side, at modellen
  skal svare ud fra bred viden og aldrig opfinde en SmartBolig-kilde.
- `unavailable`: indekset kan ikke læses, eller et opslag fejlede eller timede ud. Det gælder
  også med et smart home-ord, og det gælder begge opslag: fejler det første, køres det andet
  ikke. Ingen afsnit, og prompten siger, at søgningen ikke er tilgængelig.

### Målt med samtaler

Målt 2026-11-14 mod det byggede indeks, med en efterlignet model. Hver samtale er et
åbningsspørgsmål, som siden har en guide om (fem danske, fire engelske), et svar og én besked
mere. Tallet er, hvor mange samtaler der fik en side fra åbningsspørgsmålets emne som kilde.

| Anden besked | Dansk før | Dansk nu | Engelsk før | Engelsk nu | Ønsket |
|---|---|---|---|---|---|
| 20 opfølgninger ("Hvad koster den?", "Kan du uddybe?", "Hvorfor?") | 35 af 100 | 83 af 100 | 29 af 80 | 73 af 80 | Alle |
| 16 takker og bekræftelser ("Tak for det", "Det lyder godt") | | 10 af 80 | | 12 af 64 | Ingen |
| 10 spørgsmål om andet ("Hvad er hovedstaden i Frankrig?") | | 15 af 50 | | 21 af 40 | Ingen |
| 5 nye smart home-emner ("Hvad er MQTT?") | | 5 af 25 | | 2 af 20 | Få |
| 7 nye emner med "den", "det", "these" i ("Hvad er den bedste smart lås?") | | 8 af 35 | | 3 af 28 | Få |

"Før" er reglen før denne ændring (kun ord, der peger tilbage, og altid alene først). De to
sidste rækker kan ikke blive nul: et nyt emne kan have en side tilfælles med det gamle (en
Zigbee-koordinator og Zigbee2MQTT).

De opfølgninger, der stadig falder forkert:

- "Hvor lang tid tager det?", "Kan du give mig en trin for trin-guide?", "How long does it
  take?": spørgsmålet når selv grænsen alene og får derfor sine egne sider.
- "Skal jeg bruge en hub?", "Do I need a hub?": smart home-ordet gør, at spørgsmålet bruges
  alene.
- "Er der andre muligheder?" (2 af 5), "How much does it cost?" (3 af 4): opslaget sammen med
  spørgsmålet før finder andre sider end åbningens.

De andre beskeder, der stadig falder forkert:

- Bekræftelser uden tak, der peger tilbage: "Det lyder godt", "Super, det prøver jeg", "That
  helps", "That sounds good", "Great, I will try that". De får det gamle emnes kilder.
- Spørgsmål om andet med "det", "dette", "it", "this" eller "og" først: "Hvad er det for et
  vejr i dag?", "Kan du oversætte dette til engelsk?", "Is it going to rain tomorrow?", "And
  what is the capital of France?".
- Engelske spørgsmål om andet, hvor siden bruger alle ordene: "Who won the 2022 World Cup?"
  har ingen ukendte søgeord og tæller derfor som en opfølgning.

Grænsen er målt 2026-11-14 mod det byggede indeks, for spørgsmål uden smart home-ord. "Efter"
er målt mod et indeks, der er bygget med de nye fyldord:

| Spørgsmål | Før | Efter |
|---|---|---|
| "Hvordan kommer jeg i gang?" | 13,33 | 13,33 |
| "Hvordan lader jeg elbilen billigt?" (afløser "Min pære blinker …", der nu har et smart home-ord) | | 18,66 |
| "Hvordan får jeg lyset til at tænde ved bevægelse?" | 31,61 | 31,66 |
| "Hvad koster det at holde en computer tændt hele året?" (afløser "… en router …", samme grund) | | 54,46 |
| "Hvem vandt VM i fodbold i 2022?" | 9,42 | 9,44 |
| "Hvordan bager jeg et rugbrød?" | 5,82 | 5,83 |
| "Skriv et digt om efteråret" | 5,42 | 5,29 |
| "tak for hjælpen" | 7,03 | 6,76 |
| "Fortæl en vittighed" | 6,27 | 6,27 |
| "ja tak" | 14,43 | 0 |
| "Hej" | 6,85 | 0 |
| "Hvad er hovedstaden i Frankrig?" | intet svar | intet svar |
| Engelsk: "Which plug can measure power?" | 28,6 | 28,49 |
| Engelsk: "What is the best way to get started?" | 17,89 | 17,86 |
| Engelsk: "My light keeps flickering, what do I do?" (afløser "My bulb …") | | 27,68 |
| Engelsk: "What is the capital of France?" | 4,47 | 4,46 |
| Engelsk: "How do I bake bread?" | 7,35 | 7,35 |
| Engelsk: "Tell me a joke" | 16,14 | 0 |
| Engelsk: "Thank you" | 6,84 | 0 |
| Engelsk: "Who won the 2022 World Cup?" | 13,23 | 9,41 |

Alle spørgsmål, der handler om siden, ligger på 13,33 eller derover, og alle, der ikke gør, på
9,44 eller derunder. Grænsen 12 ligger mellem dem. Alle 11 danske og 7 engelske faste
prøvespørgsmål (`PROBES`) står stadig blandt de tre bedste efter de nye fyldord.

Hverdagsspørgsmål er målt med en liste på 20 danske og 24 engelske ("Tell me a joke", "ja
tak", "Good morning", "What can you help me with?" og lignende), alle uden smart home-ord:

| Sprog | Før | Efter fyldordene |
|---|---|---|
| Dansk | 4 af 20 på 12 point eller mere | 2 af 20 |
| Engelsk | 10 af 24 på 12 point eller mere | 6 af 24 |

De, der stadig når grænsen, har et ord, siden skriver om, eller et tal: "Hvilken film skal jeg se
i aften?" (24,77, "film"), "Hvad er 17 gange 23?" (16,56), "What movie should I watch tonight?"
(23,54), "What is 17 times 23?" (16,59), "Good morning" (15,30, "morning" findes i
morgenrutiner), "Write a cover letter for a carpenter job" (15,71), "Write a Python function
that sorts a list" (15,60) og "Who is the president of the United States?" (13,18). De kan kun
rettes med flere sider eller en anden grænse, ikke med fyldord.
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

- De beskeder, der stadig falder forkert i målingen, står under "Målt med samtaler".
- En opfølgning, der når grænsen alene, får sine egne sider og ikke det gamle emnes ("Hvor lang
  tid tager det?"). Det samme gælder en opfølgning med et smart home-ord ("Skal jeg bruge en
  hub?").
- En opfølgning til en besked, der ligger to brugerbeskeder tilbage, søges kun sammen med
  beskeden lige før. Hellere intet end et gammelt emne, der tager over.
- "den" foran et udsagnsord, der ender på -e, læses som kendeord: "Kan den styre varmen?"
  tæller ikke som et ord for en ting. Beskeden spørger stadig, så trin 4 fanger den, når
  opslaget alene er svagt.
- Smart home-ord med en hverdagsbetydning tvinger stadig opslaget: "hue" (også en hue på
  hovedet), "pære" (også frugten), "IKEA", "Alexa", "hub", "bulbs", "gateway", "matter" og
  "thread" uden for de fire undtagelser, og "ha" uden apostrof ("Ha en god dag"). Et sådant
  spørgsmål får altid et resultat, hvor svagt det end er.
- En bekræftelse uden tak ("Det lyder godt") er ikke en tak. Peger den tilbage, får den det
  gamle emnes kilder.
- Et spørgsmål, der kun har fyldord, har ingen søgeord og får intet svar fra indekset.
- Valgt fra: at sammenføje de to beskeder hver gang. Det gav kun sider om det gamle emne ved
  emneskift ("Hvad er MQTT?" efter robotstøvsugere).

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
3. `agent.js` søger (højst to opslag, status `searching` én gang, også efter en tak), afgør af resultatet hvilken
   prompt modellen får (se tabellen) og skriver svaret (status `writing`).
4. `model-runs.js` kører modeltrinnet: Gemma først. Qwen overtager, hvis Gemma fejler,
   bliver afskåret eller ikke består kontrollen i `answer.js`.
5. `turn.js` samler svar, kilder, kildegrad og telemetri til den krop, læseren får.

| Opslaget | Tilstand | Afsnit til modellen | Kilder | Prompt |
|---|---|---|---|---|
| Resultat med afsnit, og smart home-ord eller bedste point mindst 12 (spørgsmålet alene, eller sammen med spørgsmålet før) | `supplied` | Ja | Ja | Referencedata er givet |
| Smart home-ord og et tomt resultat | `nothing` | Nej | Kun officielle | Der blev ikke fundet en relevant side |
| Intet smart home-ord, og bedste point under 12 eller intet svar (i begge opslag, når der er to) | `nothing` | Nej | Kun officielle | Der blev ikke fundet en relevant side |
| En tak eller et farvel uden spørgsmålstegn (intet opslag) | `nothing` | Nej | Kun officielle | Der blev ikke fundet en relevant side |
| Et opslag fejlede eller timede ud, med eller uden smart home-ord | `unavailable` | Nej | Kun officielle | Søgningen er ikke tilgængelig |
| Intet indeks (`searchSmartbolig` mangler) | `unavailable` | Nej | Kun officielle | Søgningen er ikke tilgængelig |

Der er ét eller to opslag (ingen efter en tak og ingen uden indeks) og ét modelkald, der strømmes, når kaldet bad om
en strøm. Rækkefølgen holdes fast af `scripts/chat-search-first.test.mjs` og
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
     blev ikke brugt. Se "Hvornår et opslag bruges" og spørg indekset med `--ask`.
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
| Ordene, der tvinger opslaget, og hvad der søges efter | `functions/lib/chat/search-need.js` |
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
