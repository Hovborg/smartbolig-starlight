# Indtjening: reklamelinks til butikker

Sidst opdateret: 2026-11-14.
Kontrolleret ved: `npm run site:test`, `python scripts/content-audit.py`, `npm run build` og
`npm run seo:validate` kørt på grenen. Før og efter flytningen til registret blev alle
reklamelinks på de byggede sider sammenlignet (side, adresse og linktekst): 163 links på 21
sider, ingen forskel.
Ikke kontrolleret: at butikkernes adresser stadig virker. Butikkerne svarer automatiske
forespørgsler med 429, så ingen test henter dem. Se "Når noget ser forkert ud".

## Hvor tingene ligger

| Sti | Indhold |
|---|---|
| `src/lib/affiliate.ts` | De godkendte butikker (Partner-Ads) og `buildAffiliateUrl`, der laver sporingslinket og stopper, hvis adressen ikke hører til butikkens eget domæne |
| `src/data/products/*.mjs` | Registret: ét produkt pr. linje med id, navn, butik og butikkens adresse. Én fil pr. gruppe (`shelly.mjs`, `zigbee.mjs`, `shops.mjs` ...) |
| `src/data/products/index.mjs` | Samler grupperne til ét register og stopper, hvis to produkter har samme id |
| `src/lib/affiliate-products.mjs` | `productLink(id)`: slår et id op og stopper bygget, hvis id'et ikke findes |
| `src/components/AffiliateLink.astro` | Knappen i en guide: `<AffiliateLink product="id" text="Køb" />` |
| `src/components/ProductCard.astro` | Produktkort med samme `product`-felt. Bruges ikke i nogen guide endnu |
| `scripts/site-affiliate.test.mjs` | Tester sporingslinket og butiksreglerne |
| `scripts/site-affiliate-products.test.mjs` | Tester registret og at guiderne kun bruger produkter derfra |

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
har et produkt, ingen guide bruger.

## Hvad testene stopper

- Et id i en guide, der ikke findes i registret (bygget stopper også, med id'et i fejlen).
- Et produkt i registret, ingen guide bruger.
- To produkter med samme adresse eller samme id.
- En butik, der ikke er godkendt, eller en adresse uden for butikkens eget domæne eller uden https.
- `url=` eller `store=` direkte på et `<AffiliateLink>` i en guide.

## Når noget ser forkert ud

| Det ser du | Årsag og løsning |
|---|---|
| Bygget fejler med "Unknown affiliate product" | Id'et i guiden er stavet forkert, eller produktet mangler i `src/data/products/` |
| `site:test`: "unused register entries" | Et produkt er ikke brugt. Fjern linjen, eller brug den i en guide |
| `site:test`: "both use" en adresse | To id'er har samme adresse. Behold det ene og ret guiderne |
| Et link ender på en side, der ikke findes hos butikken | Butikken har flyttet siden. Find den nye adresse og ret `url` i registret. Intet tjekker det automatisk |

Butikkernes sider tjekkes ikke automatisk. Registret viser kun, at adressen er https og hører
til butikkens domæne, ikke at siden findes.

## Fjern det igen

Sæt `store` og `url` tilbage på hvert `<AffiliateLink>` i `src/content/docs/da/produkter/`,
slet `src/data/products/`, `src/lib/affiliate-products.mjs` og
`scripts/site-affiliate-products.test.mjs`, og gendan de to komponenter fra git. De gamle
adresser står i grenens historik.
