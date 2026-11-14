# SmartBolig.net Content Guide

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

Sidemenuen har én fil pr. emne i `config/sidebar/` (fx `produkter.mjs`; Home Assistant har en
mappe). Tilføj siden i emnets fil med **dansk sti** og **translation**:

```javascript
{
  label: "Smart Doorbell",
  translations: { en: "Smart Doorbell" },
  link: "/produkter/smart-doorbell/",
}
```

### URL Rewrites (valgfrit)

Hvis du vil have en "pæn" engelsk URL, tilføj til `public/_redirects`:

```
/en/products/smart-doorbell /en/produkter/smart-doorbell 200
/en/products/smart-doorbell/ /en/produkter/smart-doorbell/ 200
```

Dette gør at `/en/products/smart-doorbell/` viser indhold fra `/en/produkter/smart-doorbell/`.

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

- [ ] Opret dansk fil: `da/[kategori]/[dansk-filnavn].mdx`
- [ ] Opret engelsk fil: `en/[kategori]/[dansk-filnavn].mdx` (samme sti!)
- [ ] Tilføj til sidemenuen i emnets fil i `config/sidebar/` med `translations: { en: "..." }`
- [ ] Ingen emoji først i overskrifter, korttitler (`<Card title>`, `<LinkCard title>`) og fanenavne
      (`<TabItem label>`). De fjernes alligevel ved bygningen, så skriv dem ikke.
- [ ] Billedet øverst kommer af sig selv ud fra stien (`src/lib/guide-art.mjs`). Har guiden sit
      eget billede, så sæt det i de første linjer; så bruges det i stedet.
- [ ] Billeder i teksten ligger i `src/assets/guides/` og skrives relativt til MDX-filen (se
      "Billeder i en guide" nedenfor), aldrig som `/images/...`.
- [ ] (Valgfrit) Tilføj URL rewrite i `public/_redirects` for pæn engelsk URL
- [ ] Test build: `npm run build`

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

En guide i en undermappe (fx `ai/ai-cli/`) har én `../` mere. `npm run content-audit` fejler, hvis
stien ikke rammer en fil.

- Det første billede i teksten hentes med det samme og med høj prioritet, men kun hvis guiden åbner
  med det (ellers viser sidehovedet sit eget billede, og teksten holder sig til lazy loading).
- Kilden må gerne være op til 1600 px bred; kom ikke større filer ind. Fotolignende billeder gemmes
  som WebP eller JPEG, skærmbilleder og tegninger som PNG eller SVG.
- En tegning (SVG) fylder hele tekstspalten. Tegn den, så teksten kan læses ved 360 px bredde.
- Kun billeder med en fast offentlig adresse bliver i `public/images/`: `home/`, `guide/`
  (sidehovedets billeder), `produkter/`, nyhedsbillederne (`ai-news*`), `og-image.png` og
  `logo-email.png`. `npm run site:test` fejler, hvis en guide peger på andre `/images/...`-stier.
- Hvordan det virker, og hvad der gøres ved fejl, står i `docs/billeder.md`.

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

| Kategori | Dansk sti | Engelsk rewrite |
|----------|-----------|-----------------|
| Produkter | `/produkter/` | `/products/` → `/produkter/` |
| Home Assistant | `/home-assistant/` | (ingen rewrite) |
| ESP32 | `/esp32/` | (ingen rewrite) |
| Juridisk | `/juridisk/` | `/legal/` → `/juridisk/` |
| Om os | `/om-os/` | `/about/` → `/om-os/` |
| Kontakt | `/kontakt/` | `/contact/` → `/kontakt/` |

---

*Sidst opdateret: 2026-11-14 (afsnittet om sidemenuen). Resten gennemgås i fase 7.*
