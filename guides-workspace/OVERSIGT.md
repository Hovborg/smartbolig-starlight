# 📋 Guide Opdaterings Oversigt

## Status

| Guide | Nuværende | Mål | Status |
|-------|-----------|-----|--------|
| ESP32 - Kom godt i gang | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⏳ Todo |
| ESP32 - Temperatur sensor | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 📝 Eksempel klar |
| ESP32 - Bevægelsessensor | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⏳ Todo |
| ESP32 - LED strip | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⏳ Todo |
| HA - Kom godt i gang | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⏳ Todo |
| HA - Docker installation | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⏳ Todo |
| HA - Raspberry Pi | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⏳ Todo |
| HA - Zigbee2MQTT | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⏳ Todo |
| HA - Første automation | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⏳ Todo |
| Automationer index | ⭐ | ⭐⭐⭐⭐ | ⏳ Todo |
| Produkter index | ⭐ | ⭐⭐⭐⭐ | ⏳ Todo |
| Sikkerhed index | ⭐ | ⭐⭐⭐⭐ | ⏳ Todo |

**Stjerner:** ⭐ = Minimal | ⭐⭐⭐⭐⭐ = Komplet med billeder

---

## Prioriteret rækkefølge

### Fase 1: Kerneindhold (mest besøgt)
1. **HA - Kom godt i gang** - Alle starter her
2. **ESP32 - Kom godt i gang** - Populær indgang
3. **ESP32 - Temperatur sensor** - Mest populære projekt

### Fase 2: Installationsguides
4. **HA - Docker installation** - Avancerede brugere
5. **HA - Raspberry Pi** - Begyndere
6. **HA - Zigbee2MQTT** - Vigtig integration

### Fase 3: Projekter
7. **ESP32 - Bevægelsessensor** - Andet populære projekt
8. **ESP32 - LED strip** - Sjovt projekt
9. **HA - Første automation** - Næste skridt

### Fase 4: Index sider
10. **Automationer** - Samling af automationer
11. **Produkter** - Anbefalinger (affiliate!)
12. **Sikkerhed** - Best practices

---

## Checkliste per guide

### Struktur
- [ ] Badges (sværhed, tid, pris)
- [ ] Forudsætninger med links
- [ ] Komponenter tabel med affiliate links
- [ ] Trin-for-trin med Steps component
- [ ] Tabs for alternativer
- [ ] Fejlfinding sektion
- [ ] Næste skridt med Cards
- [ ] Relaterede guides

### Indhold
- [ ] Intro forklarer HVAD og HVORFOR
- [ ] Al kode er testet og virker
- [ ] Kode har title og highlighting
- [ ] Warnings/tips med Aside komponenter
- [ ] Links til relaterede guides

### Billeder
- [ ] Hero billede (færdigt projekt)
- [ ] Wiring diagram
- [ ] Screenshots af vigtige trin
- [ ] Dashboard/resultat billede
- [ ] Alle billeder komprimeret

### SEO
- [ ] Title er beskrivende
- [ ] Description < 160 tegn
- [ ] Alt tekst på alle billeder

---

## Workflow

### For hver guide:

1. **Åbn eksisterende fil**
   ```
   /src/content/docs/da/[kategori]/[guide].mdx
   ```

2. **Opret arbejdsfil i workspace**
   ```
   /guides-workspace/DRAFT_[guide-navn].md
   ```

3. **Forbedre indhold** efter skabelonen

4. **Tag/find billeder**

5. **Test lokalt**
   ```bash
   npm run dev
   ```

6. **Kopier til src** når færdig

7. **Deploy**
   ```bash
   npm run build && npx wrangler pages deploy dist
   ```

---

## Filer i workspace

```
/guides-workspace/
├── SKABELON.md           # ← Brug denne som udgangspunkt
├── BILLEDER.md           # ← Guide til billeder
├── OVERSIGT.md           # ← Denne fil
└── EKSEMPEL_temperatur-sensor.md  # ← Færdigt eksempel
```

---

## Quick Start

1. Læs `SKABELON.md`
2. Se `EKSEMPEL_temperatur-sensor.md` for inspiration
3. Vælg en guide fra prioritetslisten
4. Opret `DRAFT_[navn].md` og skriv
5. Test, deploy, gentag!
