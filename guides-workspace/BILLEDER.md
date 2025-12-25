# 📸 Guide til Billeder

## Mappestruktur

```
/public/
└── images/
    └── guides/
        ├── temperatur-sensor/
        │   ├── hero.jpg
        │   ├── wiring.png
        │   └── dashboard.png
        ├── bevaegelsessensor/
        │   └── ...
        └── led-strip/
            └── ...
```

## Opret mapper

Kør i terminal:
```bash
cd /Users/hovborg/Documents/smartbolig-starlight
mkdir -p public/images/guides/temperatur-sensor
mkdir -p public/images/guides/bevaegelsessensor
mkdir -p public/images/guides/led-strip
mkdir -p public/images/guides/kom-godt-i-gang
mkdir -p public/images/guides/docker-installation
mkdir -p public/images/guides/raspberry-pi
mkdir -p public/images/guides/zigbee2mqtt
```

## Brug i MDX filer

```mdx
![Beskrivelse af billede](/images/guides/temperatur-sensor/hero.jpg)
```

**Bemærk:** Stien starter med `/` og inkluderer IKKE `/public/`

---

## Anbefalede billedtyper

| Type | Format | Brug til |
|------|--------|----------|
| Hero billede | JPG | Introduktion, færdigt projekt |
| Screenshots | PNG | UI, konfiguration, Home Assistant |
| Diagrammer | PNG/SVG | Wiring, flowcharts |
| Fotos | JPG | Hardware, fysisk setup |

## Optimering

### Komprimér billeder før upload

**Online værktøjer:**
- https://squoosh.app (gratis, god kvalitet)
- https://tinypng.com (PNG)
- https://tinyjpg.com (JPG)

**Anbefalede størrelser:**
- Hero: 1200x630px (social sharing)
- Screenshots: 800-1200px bredde
- Thumbnails: 400px bredde

### Maks filstørrelse
- JPG: < 200 KB
- PNG: < 500 KB

---

## Kilder til billeder

### Screenshots
Tag selv screenshots fra:
- Home Assistant UI
- ESPHome dashboard
- Terminal output

### Hardware fotos
- Tag egne billeder
- Brug god belysning
- Hvid/neutral baggrund

### Wiring diagrammer
Lav med:
- **Fritzing** (gratis) - https://fritzing.org
- **Wokwi** (online) - https://wokwi.com
- **draw.io** (online) - https://draw.io

### Stock fotos (undgå hvis muligt)
- Unsplash (gratis)
- Pexels (gratis)

---

## Eksempel: Temperatur sensor billeder

| Billede | Hvad skal det vise | Hvordan laver du det |
|---------|-------------------|---------------------|
| `hero.jpg` | DHT22 forbundet til ESP32 | Tag foto af dit eget setup |
| `wiring.png` | Pin-forbindelser | Lav i Fritzing eller Wokwi |
| `usb-flash.png` | ESPHome flash dialog | Screenshot |
| `discovered.png` | HA device discovery | Screenshot fra Home Assistant |
| `states.png` | Sensor entiteter | Screenshot fra Developer Tools |
| `dashboard.png` | Lovelace card | Screenshot fra dit dashboard |

---

## Tips

1. **Konsistens** - Brug samme stil på alle billeder i en guide
2. **Crop** - Fjern unødvendige dele af screenshots
3. **Annoteringer** - Tilføj pile/tekst med Preview eller Skitch
4. **Alt tekst** - Beskriv altid hvad billedet viser (SEO + tilgængelighed)
5. **Navngivning** - Brug beskrivende navne: `dashboard-temperature-card.png`
