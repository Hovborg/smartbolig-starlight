# SmartBolig.net Content Guide

Sådan tilføjes og rettes en guide. Den korte vej står i "Tjekliste for ny guide"; resten
forklarer hvert punkt.

## URL & File Structure (i18n)

### Vigtig regel: Brug DANSKE filnavne for ALLE sprog

Starlight's sidebar definerer URL-strukturen. Alle sprogversioner skal bruge **samme filsti** (danske navne).

### Eksempel: Ny guide om "Smart Doorbell"

**Dansk fil:**
```
src/content/docs/da/produkter/smart-doorbell.mdx
```

**Engelsk fil (SAMMEsti, dansk filnavn):**
```
src/content/docs/en/produkter/smart-doorbell.mdx
```

**IKKE dette (forkert):**
```
src/content/docs/en/products/smart-doorbell.mdx  ❌ FORKERT
```

### Fil-indhold

**Dansk (`da/produkter/smart-doorbell.mdx`):**
```yaml
---
title: Smart Doorbell
description: Guide til smarte dørklokker med video og Home Assistant integration.
sidebar:
  badge:
    text: Guide
    variant: note
---

Dansk indhold her...
```

`description` bliver sidens metabeskrivelse og skal være 80 til 165 tegn. `npm run seo:validate`
(efter `npm run build`) fejler på en kortere eller længere, så tæl, før du bygger.

Har en `title` eller `description` et kolon efter et ord ("Små værktøjer: elprisen lige nu") eller
et ` #`, så sæt hele værdien i anførselstegn. Ellers kan YAML ikke læse den, og hele bygget
stopper. `scripts/site-frontmatter.test.mjs` fanger det i `npm run site:test`.

**Engelsk (`en/produkter/smart-doorbell.mdx`):**
```yaml
---
title: Smart Doorbell
description: Guide to smart doorbells with video and Home Assistant integration.
sidebar:
  badge:
    text: Guide
    variant: note
---

English content here...
```

### Sidebar (`config/sidebar/`)

Sidemenuen har én fil pr. emne i `config/sidebar/` (fx `produkter.mjs`). Home Assistant har en
mappe med to filer: `setup-groups.mjs` (grupperne Installation, Integrationer og Protokoller)
og `operate-groups.mjs` (Automationer, Dashboard og brugerflade, System og Reference). Åbn filen, find den gruppe, hvor
de nærmeste guides står, og tilføj siden dér med **dansk sti** og **translation**:

```javascript
{
  label: "Smart Doorbell",
  translations: { en: "Smart Doorbell" },
  link: "/produkter/smart-doorbell/",
}
```

Har emnet en oversigtsside med en tabel eller kort over sine guides (fx
`home-assistant/index.mdx`), så tilføj guiden dér på begge sprog. Ingen test fanger, at den
mangler.

### Engelske adresser

Den engelske side har samme sti som den danske (`/en/produkter/smart-doorbell/`). Lav ikke en
ekstra "pæn" engelsk adresse med en `200`-regel i `public/_redirects`: så har samme indhold to
adresser. Gamle engelske adresser (`/en/products/…`) sendes videre med `301`; se `docs/seo.md`.

---

## Fakta og kilder

- Skriv kun det, der kan ses i en officiel kilde: producentens dokumentation eller datablad,
  dokumentationen for Home Assistant, ESPHome, Zigbee2MQTT og lignende. Fora og andres blogs
  er ikke kilder.
- Kan en oplysning ikke kontrolleres, så udelad den. Gæt ikke på priser, versionsnumre,
  bennumre, spændinger eller menupunkter.
- Slut guiden med afsnittet `## Officielle kilder` (engelsk: `## Official sources`) med links
  til de sider, guidens fakta kommer fra. Se `home-assistant/mobilnotifikationer.mdx`.
- Priser skrives ikke i guider; de forældes. Købslinks går gennem registret (nedenfor).
- Findes emnet allerede? Søg først: `grep -ril "companion" src/content/docs/da`. Link til den
  guide, der findes, i stedet for at skrive det samme to gange.
- Kode (YAML til Home Assistant og ESPHome) skal være afprøvet eller taget fra den officielle
  dokumentation og tilpasset. Skriv, hvilken version den gælder for, når det betyder noget.

---

## Titel og `seoTitle`

- `title` er sidens overskrift, sidste led i brødkrummen og navnet i strukturerede data.
  Menunavne er ikke `title`: de står som faste tekster i `config/sidebar/`, og de skal rettes
  dér, når en titel ændres. `title` står også i søgeresultater som `<title>`, så den skal sige,
  hvad siden handler om.
- Længde: sidenavnet " | SmartBolig.net" (17 tegn) lægges til efter titlen. Sigt på højst 45
  tegn, så hele `<title>` holder sig omkring 60. Op til 60 tegn er tilladt, men så er det
  sidenavnet, der bliver skåret af i søgeresultatet. Meningen går forud for længden.
- Skriv dansk på danske sider ("LED-strip med ESP32", ikke "LED Strip med ESP32"), og sæt ikke
  årstal i titler og overskrifter: de forældes. Versionsnumre og datoer, som siden handler om
  ("Nye automationer i Home Assistant 2026.7"), er undtagelsen.
- En oversigtsside har en kort overskrift ("Automationer"). Den siger for lidt i et
  søgeresultat, så siden får også `seoTitle` (10 til 60 tegn, samme længderegel), som bruges i
  `<title>` og på sociale kort. Brug kun `seoTitle`, når overskriften skal være kortere end
  søgetitlen:

```yaml
title: Automationer
seoTitle: "Automationer til Home Assistant: opskrifter"
```

- To sider må ikke have samme titel; `npm run seo:validate` fejler på dubletter.

---

## Mappestruktur

```
src/content/docs/
├── da/                          # Dansk (default locale)
│   ├── produkter/               # Produkter
│   │   ├── smart-doorbell.mdx   # Dansk indhold
│   │   └── ...
│   ├── home-assistant/          # Home Assistant guides
│   ├── esp32/                   # ESP32 guides
│   └── ...
│
└── en/                          # Engelsk
    ├── produkter/               # SAMME mappenavn som dansk!
    │   ├── smart-doorbell.mdx   # Engelsk indhold
    │   └── ...
    ├── home-assistant/          # SAMME mappenavn
    ├── esp32/                   # SAMME mappenavn
    └── ...
```

---

## Tjekliste for ny guide

- [ ] Søg efter emnet, så guiden ikke findes i forvejen (se "Fakta og kilder").
- [ ] Opret dansk fil: `da/[kategori]/[dansk-filnavn].mdx`
- [ ] Opret engelsk fil: `en/[kategori]/[dansk-filnavn].mdx` (samme sti!)
- [ ] `title` højst ca. 45 tegn og ikke brugt af en anden side; `description` 80 til 165 tegn.
- [ ] Tilføj til sidemenuen i emnets fil i `config/sidebar/` med `translations: { en: "..." }`,
      og til emnets oversigtsside, hvis den har en liste over guides.
- [ ] Ingen emoji først i overskrifter, korttitler (`<Card title>`, `<LinkCard title>`) og fanenavne
      (`<TabItem label>`). De fjernes alligevel ved bygningen, så skriv dem ikke.
- [ ] Billedet øverst kommer af sig selv. Det vælges ud fra sidens sti af reglerne i
      `src/lib/guide-art.mjs` (første regel, der rammer, vinder: en sti med `notifi` får fx
      automationsbilledet). Passer billedet ikke, så tilføj en regel; se `docs/designsystem.md`,
      "Giv en guide et andet billede". Har guiden sit eget billede, så sæt det i de første
      linjer; så bruges det i stedet.
- [ ] Billeder i teksten ligger i `src/assets/guides/` og skrives relativt til MDX-filen (se
      "Billeder i en guide" nedenfor), aldrig som `/images/...`.
- [ ] Afsnittet "Officielle kilder" sidst i guiden, på begge sprog.
- [ ] En linje i `CHANGELOG.md` under "Unreleased".
- [ ] Kør kontrollerne nedenfor.

### Kontroller for en ny eller ændret guide

```bash
npm run site:test                 # frontmatter, billedstier, produktlinks
python scripts/content-audit.py   # kodeblokke (YAML, JSON, bash, JavaScript), interne links, billedstier
npm run build                     # bygger siden; stopper på et ukendt produkt-id eller ødelagt MDX
npm run seo:validate              # efter build: beskrivelsens længde, ens titler, billeder
```

De fire er nok til en ændring, der kun rører guides. Hele listen før en udgivelse står i
`AGENTS.md`; den kører også i `deploy.yml` på hver pull request.

---

## Billeder i en guide

Billeder, som guiden viser i teksten, lægges i `src/assets/guides/` (samme undermapper som guiden,
fx `src/assets/guides/zigbee2mqtt/mesh.svg`) og skrives med en sti relativt til MDX-filen. Så
laver bygningen selv WebP-filer i flere bredder med `width` og `height`, og browseren henter den
mindste, der fylder tekstspalten; du skal ikke konvertere noget. De fleste
guidefiler ligger fire mapper under `src/`, så stien starter med `../../../../assets/`:

```md
![Zigbee mesh-netværk med koordinator, routere og sensorer](../../../../assets/guides/zigbee2mqtt/mesh.svg)
```

En guide i en undermappe (fx `ai/ai-cli/`) har én `../` mere. `python scripts/content-audit.py`
fejler, hvis stien ikke rammer en fil.

- Det første billede i teksten hentes med det samme og med høj prioritet, men kun hvis guiden åbner
  med det (ellers viser sidehovedet sit eget billede, og teksten holder sig til lazy loading).
- Kilden må gerne være op til 1600 px bred; kom ikke større filer ind. Fotolignende billeder gemmes
  som WebP eller JPEG, skærmbilleder og tegninger som PNG eller SVG.
- En tegning (SVG) fylder hele tekstspalten. Tegn den, så teksten kan læses ved 360 px bredde.
- Kun billeder med en fast offentlig adresse bliver i `public/images/`: `home/`, `guide/`
  (sidehovedets billeder), `produkter/`, nyhedsbillederne (`ai-news*`) og `og-image.png`.
  `npm run site:test` fejler, hvis en guide peger på andre `/images/...`-stier.
- Hvordan det virker, og hvad der gøres ved fejl, står i `docs/billeder.md`.

---

## Produktlinks (reklamelinks)

Et købslink i en guide nævner kun produktet. Butikken og butikkens adresse står ét sted: i registret
`src/data/products/` (én fil pr. gruppe, fx `shelly.mjs`, `zigbee.mjs`).

1. Læg produktet i registret, i den fil hvor det hører hjemme:
   `"sonoff-zigbee-dongle-e": { name: "Sonoff Zigbee 3.0 USB Dongle Plus-E", store: "proshop", url: "https://www.proshop.dk/..." },`
   Id'et er små bogstaver med bindestreg og bygget af produktets navn (ikke butikkens nummer).
   Url'en er produktets egen side hos butikken. En kategoriside hedder fx `proshop-shelly` og ligger i `shops.mjs`.
2. Skriv i guiden: `<AffiliateLink product="sonoff-zigbee-dongle-e" text="Køb" />`. `text`, `price` og `class` er valgfri.
   Der skal ikke stå `store` eller `url` i guiden.
3. Kør `npm run site:test`.

Et forkert link rettes ét sted: `url` i registret. Kun godkendte butikker kan bruges
(`affiliateMerchants` i `src/lib/affiliate.ts`); en anden butik eller en adresse uden for butikkens
domæne stopper testen og bygget. Et id, der ikke findes, stopper også bygget. Butikkernes sider
tjekkes ikke automatisk. Se `docs/indtjening.md`.

---

## Værktøjssider

Siderne under `vaerktoejer/` er bygget om et værktøj, ikke om en tekst. De følger de samme regler
for filnavne, titel og sidemenu som en guide, og derudover:

- Start med to sætninger, der siger, hvad værktøjet regner ud. Så kommer værktøjet
  (`<PowerPrice lang="da" />`), og først derefter forklaringen.
- Forklaringen har altid: hvordan tallet er regnet, hvad der ikke er med, hvor data kommer fra
  (med link og licens), og links til de guides, der bruger tallet.
- Skriv ingen satser for afgift og nettarif. De skifter. Nettarif og elselskabets tillæg afhænger
  af selskabet; elafgiften er ens for alle. Skriv ikke, at elafgiften afhænger af netselskabet.
- Tekster inde i værktøjet står ikke i MDX-filen, men i `src/lib/tools/*-copy.mjs` på begge sprog.
- Sæt `lastUpdated` i frontmatter, og tilføj værktøjet i `src/lib/tools/catalog.mjs`, så det får
  et kort på oversigten.
- Et ord, som en guide skal findes på i assistentens søgning, kan få bygningen til at stoppe,
  hvis værktøjssiden bruger det meget (`docs/assistent.md`). Ret da teksten på værktøjssiden.

Hvordan et nyt værktøj bygges, står i `docs/vaerktoejer.md`.

---

## Hvorfor denne struktur?

Starlight bruger sidebar-links som kanoniske URL'er for alle sprog. Hvis sidebar har:
```javascript
link: "/produkter/smart-doorbell/"
```

Så genereres:
- Dansk: `/da/produkter/smart-doorbell/`
- Engelsk: `/en/produkter/smart-doorbell/`

Filer SKAL ligge på disse stier for at blive fundet. `slug` feltet i frontmatter skaber duplikerede sider og skal IKKE bruges.

---

## Eksisterende kategorier

| Kategori | Sti (begge sprog) | Gammel engelsk adresse, sendes videre med 301 |
|----------|-----------|-----------------|
| Produkter | `/produkter/` | `/en/products/` |
| Home Assistant | `/home-assistant/` | (ingen) |
| ESP32 | `/esp32/` | (ingen) |
| Automationer | `/automationer/` | `/en/automations/` |
| Sikkerhed | `/sikkerhed/` | `/en/security/` |
| AI | `/ai/` | (ingen) |
| Værktøjer | `/vaerktoejer/` | (ingen) |
| Juridisk | `/juridisk/` | `/en/legal/` |
| Om os | `/om-os/` | `/en/about/` |
| Kontakt | `/kontakt/` | `/en/contact/` |

---

*Sidst opdateret: 2026-11-14. Kontrolleret ved: en læser uden kendskab til repoet tilføjede en
guide på begge sprog ud fra dette dokument; det, den snublede over, er rettet her.*
