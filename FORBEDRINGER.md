# SmartBolig.net - Forbedringer og Fejl

> Genereret: 30. december 2025
> Analyseret af: Claude Code

---

## Oversigt

| Kategori | Kritisk | Medium | Lav | Status |
|----------|---------|--------|-----|--------|
| Broken Links | ~~29~~ | - | - | ✅ FIXET |
| Manglende Billeder | 87 | - | - | ⏳ TODO |
| Engelske Filnavne | 22 | - | - | ⏳ TODO |
| Config Issues | ~~2~~ | ~~1~~ | - | ✅ FIXET |
| SEO Issues | - | ~~1~~ | ~~2~~ +3 | ⚡ DELVIST |

---

## 1. ~~KRITISK: Broken Internal Links (29 stk)~~ ✅ FIXET

> **Status:** Alle 29 broken links er rettet (30. december 2025)

### Problem (løst)
Links i MDX-filer pegede til URLs der ikke eksisterede.

### Danske Broken Links (7 stk)

| Link brugt i filer | Problem | Løsning |
|--------------------|---------|---------|
| `/da/guides/esphome/` | Mappe eksisterer ikke | Ret til `/da/esp32/` |
| `/da/guides/hacs-elpris/` | Mappe eksisterer ikke | Ret til `/da/home-assistant/elpris-integration/` |
| `/da/guides/home-assistant/automationer/` | Mappe eksisterer ikke | Ret til `/da/automationer/` |
| `/da/home-assistant/automationer/` | Forkert sti | Ret til `/da/automationer/` |
| `/da/home-assistant/esphome/` | Forkert sti | Ret til `/da/esp32/` |
| `/da/produkter/smart-energi/` | Fil eksisterer ikke | Ret til `/da/produkter/energistyring/` |
| `/da/produkter/smart-klimastyring/` | Fil eksisterer ikke | Opret fil eller ret til `/da/produkter/smart-termostater/` |

### Engelske Broken Links (22 stk)

**Hovedproblem:** Engelske MDX-filer bruger engelske URL-stier, men filnavnene er på dansk.

| Link brugt | Faktisk filnavn | Løsning |
|------------|-----------------|---------|
| `/en/esp32/esphome-advanced/` | `esphome-avanceret.mdx` | Omdøb fil ELLER ret links |
| `/en/esp32/motion-sensor/` | `bevaegelsessensor.mdx` | Omdøb fil ELLER ret links |
| `/en/esp32/temperature-sensor/` | `temperatur-sensor.mdx` | Omdøb fil ELLER ret links |
| `/en/home-assistant/getting-started/` | `kom-godt-i-gang.mdx` | Omdøb fil ELLER ret links |
| `/en/home-assistant/first-automation/` | `foerste-automation.mdx` | Omdøb fil ELLER ret links |
| `/en/home-assistant/troubleshooting/` | `fejlfinding.mdx` | Omdøb fil ELLER ret links |
| `/en/home-assistant/backup-security/` | `backup-sikkerhed.mdx` | Omdøb fil ELLER ret links |
| `/en/home-assistant/washing-machine-notification/` | `vaskemaskine-notification.mdx` | Omdøb fil ELLER ret links |
| `/en/home-assistant/electricity-price-integration/` | `elpris-integration.mdx` | Omdøb fil ELLER ret links |
| `/en/products/energy-management/` | `energistyring.mdx` | Omdøb fil ELLER ret links |
| `/en/products/presence-sensors/` | `tilstedevaerelse.mdx` | Omdøb fil ELLER ret links |
| `/en/products/recommendations/` | `anbefalinger.mdx` | Omdøb fil ELLER ret links |
| `/en/products/smart-lighting/` | `smart-belysning.mdx` | Omdøb fil ELLER ret links |
| `/en/products/smart-security/` | `smart-sikkerhed.mdx` | Omdøb fil ELLER ret links |
| `/en/products/smart-thermostats/` | `smart-termostater.mdx` | Omdøb fil ELLER ret links |
| `/en/products/smart-water/` | `smart-vand.mdx` | Omdøb fil ELLER ret links |
| `/en/products/zigbee-coordinators/` | `zigbee-koordinatorer.mdx` | Omdøb fil ELLER ret links |
| `/en/products/zigbee-sensors/` | `zigbee-sensorer.mdx` | Omdøb fil ELLER ret links |
| `/en/guides/esphome/` | Mappe eksisterer ikke | Ret til `/en/esp32/` |
| `/en/guides/hacs-electricity-prices/` | Mappe eksisterer ikke | Ret links |
| `/en/guides/home-assistant/automations/` | Mappe eksisterer ikke | Ret til `/en/automations/` |
| `/en/home-assistant/automations/` | Forkert sti | Ret til `/en/automations/` |

### Anbefaling
**Vælg én strategi:**
1. **Omdøb alle engelske filer** til engelske navne (bedre SEO, mere arbejde)
2. **Ret alle links** til at bruge danske filnavne (nemmere, men dårligere URLs)

---

## 2. KRITISK: Manglende Billeder (87 filer)

### Problem
~70% af alle MDX-filer har ingen billeder. Dette påvirker:
- SEO (Google foretrækker sider med billeder)
- Brugeroplevelse
- Engagement og tid på side

### Filer uden billeder

#### Home Assistant (mangler billeder)
- [ ] `dashboard-design.mdx` - Screenshots af dashboards
- [ ] `docker-installation.mdx` - Arkitektur-diagram
- [ ] `elpris-integration.mdx` - Screenshot af integration
- [ ] `fejlfinding.mdx` - Flowchart eller screenshots
- [ ] `glossar.mdx` - Ikoner/illustrationer
- [ ] `hacs.mdx` - Screenshots af HACS interface
- [ ] `performance.mdx` - Grafer/screenshots
- [ ] `thread-matter.mdx` - Protokol-diagram
- [ ] `wifi-enheder.mdx` - Produktbilleder
- [ ] `z-wave.mdx` - Netværksdiagram
- [ ] `zigbee2mqtt-avanceret.mdx` - Screenshots

#### ESP32 (mangler billeder)
- [ ] `esphome-avanceret.mdx` - Code screenshots
- [ ] `ld2410-mmwave.mdx` - Wiring diagram (delvist)

#### Produkter (næsten alle mangler)
- [ ] `smart-garage.mdx`
- [ ] `smart-gardiner.mdx`
- [ ] `smart-haven.mdx`
- [ ] `smart-kaeledyr.mdx`
- [ ] `smart-koekken.mdx`
- [ ] `smart-luftkvalitet.mdx`
- [ ] `smart-pool.mdx`
- [ ] `smart-rengoering.mdx`
- [ ] `smart-sikkerhed.mdx`
- [ ] `smart-stemmestyring.mdx`
- [ ] `smart-sundhed.mdx`
- [ ] `smart-termostater.mdx`
- [ ] `smart-vand.mdx`
- [ ] `tilstedevaerelse.mdx`
- [ ] `wifi-enheder.mdx`
- [ ] `zigbee-koordinatorer.mdx`
- [ ] `zigbee-sensorer.mdx`

### Anbefaling
1. Prioriter produktsider (konvertering)
2. Tilføj hero-billeder til alle guides
3. Brug SVG-diagrammer til tekniske guides
4. Overvej AI-genererede illustrationer

---

## 3. MEDIUM: Config Issues

### 3.1 ~~wrangler.jsonc - Manglende KV ID~~ ✅ FIXET

> **Status:** KV namespace oprettet og ID indsat (30. december 2025)

**Løsning anvendt:**
- Oprettet KV namespace "SESSION" via `wrangler kv namespace create`
- ID: `022c208b063540069ecdf4002f7d044e`

### 3.2 ~~404.astro Route Konflikt~~ ✅ FIXET

> **Status:** Løst ved at konvertere til Starlight component override (30. december 2025)

**Løsning anvendt:**
- Slettet `src/pages/404.astro`
- Oprettet `src/components/NotFound.astro` med samme design
- Tilføjet til `astro.config.mjs` components

### 3.3 Node.js Deprecation Warning
```
[DEP0190] DeprecationWarning: Passing args to a child process with shell option true...
```
**Løsning:** Opdater dependencies eller ignorer (kommer fra Pagefind)

---

## 4. MEDIUM: SEO Forbedringer

### 4.1 ~~Kort indhold på index-sider~~ ✅ FIXET

> **Status:** `/en/products/index.mdx` udvidet fra ~13 linjer til 134 linjer (31. december 2025)

### 4.2 Manglende Schema.org på produktsider
Produktsider bør have `Product` schema med:
- Navn
- Beskrivelse
- Pris
- Tilgængelighed

### 4.3 Manglende `lastmod` på sider
Starlight understøtter ikke `lastmod` direkte, men overvej:
- Git-baseret lastmod via custom component
- Manuel dato i frontmatter

---

## 5. LAV: Forbedringsforslag

### 5.1 Engelske filnavne
Alle engelske filer bruger danske filnavne. For bedre SEO:
- `/en/esp32/bevaegelsessensor.mdx` → `motion-sensor.mdx`
- `/en/home-assistant/fejlfinding.mdx` → `troubleshooting.mdx`
- osv.

### 5.2 Manglende guides
Overvej at tilføje:
- [ ] Home Assistant Cloud (Nabu Casa) guide
- [ ] Tailscale VPN setup
- [ ] ESPHome Bluetooth Proxy
- [ ] Home Assistant Companion App
- [ ] Backup til cloud (Google Drive, etc.)

### 5.3 ~~Produktsider mangler affiliate links~~ ✅ DELVIST FIXET

> **Status:** Proshop affiliate links tilføjet til 3 produktsider (31. december 2025)

**Opdaterede sider:**
- ✅ `zigbee-sensorer.mdx` - Sonoff SNZB sensorer
- ✅ `zigbee-koordinatorer.mdx` - ZBDongle-E, Conbee III
- ✅ `shelly.mdx` - Shelly Plus/Gen3 produkter

**Oprettet:**
- `src/components/AffiliateLink.astro` - Affiliate link component
- `src/components/ProductCard.astro` - Produkt kort component

**Opdateret:**
- `affiliate-disclosure.mdx` - Proshop tilføjet som aktiv partner

**Mangler stadig:**
- Amazon affiliate links (ansøgning nødvendig)
- Flere produktsider med Proshop links

### 5.4 ~~RSS Feed dato~~ ✅ FIXET

> **Status:** Opdateret til at bruge frontmatter dato eller build dato (31. december 2025)

```js
// src/pages/rss.xml.js linje 34
pubDate: doc.data.date ? new Date(doc.data.date) : new Date(),
```

---

## 6. Prioriteret Handlingsplan

### Fase 1: Kritiske fejl (1-2 dage)
1. [ ] Fix alle 29 broken links
2. [ ] Løs 404.astro route konflikt
3. [ ] Opdater wrangler.jsonc

### Fase 2: SEO & Indhold (1 uge)
1. [ ] Tilføj billeder til top 10 mest besøgte sider
2. [ ] Udvid `/en/products/index.mdx`
3. [ ] Tilføj Product schema til produktsider

### Fase 3: Forbedringer (løbende)
1. [ ] Omdøb engelske filer til engelske navne
2. [ ] Tilføj affiliate links
3. [ ] Tilføj nye guides baseret på brugerforespørgsler

---

## Kommandoer til at finde issues

```bash
# Find broken links
grep -rhoE '\]\(/[^)]+\)' src/content/docs/ --include="*.mdx" | sort -u

# Find filer uden billeder
for f in src/content/docs/**/*.mdx; do
  if ! grep -q '!\[' "$f"; then echo "$f"; fi
done

# Byg og se warnings
npm run build 2>&1 | grep -i "warn\|error"
```

---

*Denne fil bør opdateres efterhånden som issues løses.*
