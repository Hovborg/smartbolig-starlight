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

### Sidebar (astro.config.mjs)

Tilføj til sidebar med **dansk sti** og **translation**:

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
- [ ] Tilføj til sidebar i `astro.config.mjs` med `translations: { en: "..." }`
- [ ] (Valgfrit) Tilføj URL rewrite i `public/_redirects` for pæn engelsk URL
- [ ] Test build: `npm run build`

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

*Sidst opdateret: Januar 2025*
