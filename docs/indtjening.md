# Indtjening: reklamelinks, klikmåling og annoncepladser

Sidst opdateret: 2026-11-14.
Kontrolleret ved: `npm run site:test`, `python scripts/content-audit.py`, `npm run build` og
`npm run seo:validate` kørt på grenen. Før og efter flytningen til registret blev alle
reklamelinks på de byggede sider sammenlignet (side, adresse og linktekst): 163 links på 21
sider, ingen forskel.
Klikmålingen og annoncepladsen: `npm run site:test` (falsk side, ingen netværk), og en bygget
side i headless Chrome med et ja i en efterlignet samtykkebesked: et tryk på et reklamelink
lagde `affiliate_click` med produkt og butik i `dataLayer`, og en annonceplads med et
prøvenummer blev vist og bedt fyldt. Uden nummer står der ingen annonceplads i den byggede side.
Ikke kontrolleret: at butikkernes adresser stadig virker. Butikkerne svarer automatiske
forespørgsler med 429, så ingen test henter dem. Se "Når noget ser forkert ud".
Heller ikke: at hændelsen kan ses i Google Analytics, og at en rigtig annonce fylder pladsen.
Begge dele kræver, at samtykkebeskeden er udgivet (`docs/redesign/TIL-EJEREN.md`, punkt 1).

## Hvor tingene ligger

| Sti | Indhold |
|---|---|
| `src/lib/affiliate.ts` | De godkendte butikker (Partner-Ads) og `buildAffiliateUrl`, der laver sporingslinket og stopper, hvis adressen ikke hører til butikkens eget domæne |
| `src/data/products/*.mjs` | Registret: ét produkt pr. linje med id, navn, butik og butikkens adresse. Én fil pr. gruppe (`shelly.mjs`, `zigbee.mjs`, `shops.mjs` ...) |
| `src/data/products/index.mjs` | Samler grupperne til ét register og stopper, hvis to produkter har samme id |
| `src/lib/affiliate-products.mjs` | `productLink(id)`: slår et id op og stopper bygget, hvis id'et ikke findes |
| `src/components/AffiliateLink.astro` | Knappen i en guide: `<AffiliateLink product="id" text="Køb" />` |
| `src/components/ProductCard.astro` | Produktkort med samme `product`-felt. Bruges ikke i nogen guide endnu |
| `src/lib/tools/starter-kit-items.mjs` | Startsæt-byggerens dele (`/vaerktoejer/startsaet/`). Hver del med købslink er et id fra registret; se `docs/vaerktoejer.md` |
| `scripts/site-affiliate.test.mjs` | Tester sporingslinket og butiksreglerne |
| `scripts/site-affiliate-products.test.mjs` | Tester registret og at guiderne kun bruger produkter derfra |
| `src/lib/affiliate-clicks.mjs` | Klikmålingen: et tryk på et reklamelink sendes til Google Analytics som `affiliate_click` |
| `src/data/ad-slots.mjs` | De faste annoncepladser og deres nummer fra AdSense. Tomt nummer = pladsen er slukket |
| `src/components/AdSlot.astro` | Annoncepladsen i siden. Står i `MarkdownContent.astro`, under teksten og over kommentarerne |
| `src/lib/ad-slots.mjs` | Viser pladserne og beder AdSense fylde dem, efter et ja til annoncer |
| `src/lib/article-page.mjs` | Reglen for, hvad der er en guide eller en nyhed (kommentarer og annonceplads vises kun dér) |
| `scripts/site-affiliate-clicks.test.mjs`, `scripts/site-ad-slots.test.mjs` | Testene for de to dele |

En guide nævner kun produktets id. Butikken og adressen står ét sted: i registret.

## Ændr noget

**Tilføj et produktlink**

1. Find produktets egen side hos en godkendt butik (Proshop, Specialkamera, RobotterOnline,
   WATTOO eller Batteribyen). Brug en produktside, ikke en søgning.
2. Skriv en linje i den fil i `src/data/products/`, hvor produktet hører hjemme:
   `"sonoff-zigbee-dongle-e": { name: "...", store: "proshop", url: "https://www.proshop.dk/..." },`
   Id'et er små bogstaver med bindestreg og bygget af produktets navn, ikke af butikkens nummer.
3. Skriv `<AffiliateLink product="sonoff-zigbee-dongle-e" text="Køb" />` i guiden.
4. Kør `npm run site:test`.

**Ret et forkert link**: ret `url` i registret. Alle guider, der bruger id'et, følger med.

**Tilføj en ny butik**: kun hvis Partner-Ads har godkendt aftalen. Tilføj den i
`affiliateMerchants` i `src/lib/affiliate.ts` med domæne og bannerkode fra Partner-Ads-kontoen,
og tilføj en række i testen i `scripts/site-affiliate.test.mjs`.

**Fjern et produkt**: fjern linket i guiden og linjen i registret. Testen fejler, hvis registret
har et produkt, ingen guide bruger. Bruger startsæt-byggeren produktet, så ret også delen i
`src/lib/tools/starter-kit-items.mjs`; ellers stopper testen og bygget.

## Klikmåling

Når læseren har sagt ja til statistik, sender et tryk på et reklamelink hændelsen
`affiliate_click` til Google Analytics med to felter: `product` (id'et fra registret) og
`store` (butikken). Venstre og midterste museknap tæller. Før et ja, eller efter et nej, sendes
intet: lytteren sættes først op af `src/lib/consent/boot.mjs`, når Analytics er hentet.

For at se produkt og butik i rapporterne skal ejeren oprette to tilpassede dimensioner i
Google Analytics én gang (`docs/redesign/TIL-EJEREN.md`). Uden dem tælles hændelsen stadig.

Partner-Ads tæller selv klik og salg. Klikmålingen her viser det, Partner-Ads ikke gør: hvilken
guide og hvilket produkt læseren trykkede på.

## Annoncepladser

Siden har én fast plads, `guideEnd`: under teksten i en guide eller en nyhed, over
kommentarerne. Den er slukket, indtil den får et nummer.

**Tænd pladsen**

1. Opret en annonceenhed i AdSense: Annoncer -> Efter annonceenhed -> Displayannonce, responsiv.
2. Kopiér tallet efter `data-ad-slot=` i den kode, AdSense viser.
3. Skriv tallet i `src/data/ad-slots.mjs`: `guideEnd: "1234567890",`.
4. Kør `npm run site:test` og `npm run build`, og udgiv.

Pladsen er skjult i siden og vises først, når læseren har sagt ja til annoncer. Har AdSense
ingen annonce til pladsen, eller kan AdSense-scriptet ikke hentes (en blokering), skjules den
igen. Der er sat 280 px af i højden, mens annoncen hentes. Selve pladsen kommer, når svaret er
læst, og flytter da kommentarerne og sidefoden ned én gang; den står derfor sidst i teksten.
Etiketten over annoncen er "Annoncer" ("Advertisements" på engelsk): Googles regler for
annonceplacering tillader kun den eller "Sponsorerede links". På print er pladsen væk.

**Ny plads et andet sted**: tilføj et navn i `AD_SLOTS`, og sæt `<AdSlot place="navn" />` dér,
hvor den skal stå. Hold den uden for forsiden og de juridiske sider.

Automatiske annoncer (dem AdSense selv placerer) styres i AdSense, ikke her.

## Startsæt-byggeren

Værktøjet `/vaerktoejer/startsaet/` giver læseren et startsæt ud fra fire svar. 11 af sættets
dele har et købslink til i alt 9 produkter fra registret; resten har ingen købsanbefaling endnu
eller skal ikke købes, og linker til en guide. Linkene er de samme `<AffiliateLink>` som i
guiderne, så sporing, mærket "Reklamelink" og klikmålingen følger med uden ekstra kode. Over
sættet står den samme oplysning om reklamelinks som i guiderne. Værktøjet viser ingen priser.

Registret mangler produkter til tre ting, sættet nævner: en computer til Home Assistant, en
aflæser til elmålerens HAN-port og ESP32-dele. Kommer de i registret, bliver hullet til et
købslink ved at rette én linje (`docs/vaerktoejer.md`, "Tilføj eller skift en del").

Startsættets engelske side er den første engelske side med købslinks; de engelske guider har
ingen. Butikkerne er danske.

## Ideer til mere indtjening (ikke bygget)

1. **Henvisning til elaftaler ved elprisværktøjet.** Kræver et godkendt program hos Partner-Ads
   eller et elselskab. Står på ejerens liste; intet er bygget.

## Hvad testene stopper

- Et id i en guide, der ikke findes i registret (bygget stopper også, med id'et i fejlen).
- Et produkt i registret, ingen guide bruger.
- To produkter med samme adresse eller samme id.
- En butik, der ikke er godkendt, eller en adresse uden for butikkens eget domæne eller uden https.
- `url=` eller `store=` direkte på et `<AffiliateLink>` i en guide.
- En annonceplads med `style=` eller et script i komponenten, eller et nummer, der ikke er tal.
- En anden fil end `boot.mjs`, der importerer klikmålingen eller annoncepladserne.
- Det samme id to gange i én gruppefil, og et mellemrum i en adresse.

## Når noget ser forkert ud

| Det ser du | Årsag og løsning |
|---|---|
| Bygget fejler med "Unknown affiliate product" | Id'et i guiden er stavet forkert, eller produktet mangler i `src/data/products/` |
| `site:test`: "unused register entries" | Et produkt er ikke brugt. Fjern linjen, eller brug den i en guide |
| `site:test`: "both use" en adresse | To id'er har samme adresse. Behold det ene og ret guiderne |
| Et link ender på en side, der ikke findes hos butikken | Butikken har flyttet siden. Find den nye adresse og ret `url` i registret. Intet tjekker det automatisk |

Butikkernes sider tjekkes ikke automatisk. Registret viser kun, at adressen er https og hører
til butikkens domæne, ikke at siden findes.

## Kendte grænser

- Fem produkter står med to id'er, fordi guiderne pegede på to forskellige butikssider for
  samme vare (`shelly-2pm-gen3`/`-2`, `shelly-plus-1pm`/`-2`, `conbee-iii`/`-2`,
  `aqara-presence-sensor-fp2`/`-2`, `sonoff-zbdongle-e`/`sonoff-zigbee-dongle-e`). Klikkene
  tælles derfor hver for sig. Saml dem, når de rigtige adresser er hentet i Partner-Ads.
- `ProductCard.astro` bruges ikke i nogen guide, så registertestene læser kun
  `<AffiliateLink>`. Bygget stopper stadig på et ukendt id i et kort.
- En side, browseren henter fra sin tilbage-cache, efter at læseren har trukket sit ja tilbage
  på en anden side, er ikke målt.

## Fjern det igen

Klikmålingen: slet `src/lib/affiliate-clicks.mjs` og testen, og fjern `watchAffiliateClicks` i
`src/lib/consent/boot.mjs`. Annoncepladsen: slet `src/components/AdSlot.astro`,
`src/data/ad-slots.mjs`, `src/lib/ad-slots.mjs` og testen, og fjern `<AdSlot />` i
`MarkdownContent.astro`, `showAdSlots` og `hideAdSlots` i `boot.mjs` og `.ad-slot` i
`src/styles/print.css`. Fjern de to tests om reklamelinks og annoncepladser sidst i harnessen i
`scripts/site-consent.test.mjs`. Ret privatlivs- og cookiepolitikken på begge sprog.

Registret:
Sæt `store` og `url` tilbage på hvert `<AffiliateLink>` i `src/content/docs/da/produkter/`,
slet `src/data/products/`, `src/lib/affiliate-products.mjs` og
`scripts/site-affiliate-products.test.mjs`, og gendan de to komponenter fra git. De gamle
adresser står i grenens historik.
