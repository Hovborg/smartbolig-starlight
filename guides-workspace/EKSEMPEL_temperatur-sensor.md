# 🌡️ FORBEDRET: Temperatur sensor med ESP32

**Fil:** `src/content/docs/da/esp32/temperatur-sensor.mdx`

**Status:** Klar til review

---

## Den forbedrede guide:

```mdx
---
title: "Temperatur sensor med ESP32"
description: "Byg en præcis temperatur og fugtighed sensor med ESP32 og DHT22. Komplet guide med billeder."
sidebar:
  badge:
    text: Populær
    variant: tip
---

import { Steps, Aside, Card, CardGrid, Tabs, TabItem, Badge } from '@astrojs/starlight/components';

<Badge text="Let" variant="success" /> <Badge text="30 min" variant="note" /> <Badge text="70 kr" variant="caution" />

En temperatur/fugtighed sensor er det **perfekte første projekt**. Billigt, nemt og utrolig nyttigt til at overvåge dit hjem.

![DHT22 sensor forbundet til ESP32](/images/guides/temperatur-sensor/hero.jpg)

## 📋 Forudsætninger

Før du starter, skal du have:

- ✅ [Home Assistant kørende](/da/home-assistant/kom-godt-i-gang/)
- ✅ [ESPHome add-on installeret](/da/esp32/kom-godt-i-gang/)
- ✅ Grundlæggende kendskab til YAML

<Aside type="note">
Aldrig brugt ESPHome før? Start med vores [ESP32 begynderguide](/da/esp32/kom-godt-i-gang/) først.
</Aside>

## 🛒 Komponenter

| Del | Beskrivelse | Link | Pris ca. |
|-----|-------------|------|----------|
| ESP32 DevKit | WiFi microcontroller | [Amazon.de](https://amazon.de) | 45 kr |
| DHT22 sensor | Temperatur + fugtighed | [Amazon.de](https://amazon.de) | 25 kr |
| Jumper wires | Han-hun, 3 stk | [Amazon.de](https://amazon.de) | 10 kr |
| USB kabel | Micro-USB til strøm | Ofte inkluderet | 0 kr |
| **Total** | | | **~70 kr** |

<Aside type="tip" title="Alternativ: DHT11">
DHT11 er billigere (~10 kr) men mindre præcis. DHT22 anbefales til seriøs brug.
</Aside>

## 🔌 Tilslutning

### Pin-diagram

```
DHT22 Sensor          ESP32 DevKit
┌─────────────┐      ┌─────────────┐
│  ┌─────┐    │      │             │
│  │ DHT │    │      │    3.3V  ●──┼── Rød (VCC)
│  │ 22  │    │      │             │
│  └──┬──┘    │      │    GND   ●──┼── Sort (GND)
│     │       │      │             │
│  [1][2][3]  │      │    GPIO4 ●──┼── Gul (DATA)
└─────────────┘      └─────────────┘
     │  │  │
    VCC │ GND
       DATA
```

### Tilslut ledningerne

![Wiring diagram](/images/guides/temperatur-sensor/wiring.png)

<Steps>
1. **Rød ledning (VCC)** → ESP32 **3.3V** pin
2. **Sort ledning (GND)** → ESP32 **GND** pin  
3. **Gul ledning (DATA)** → ESP32 **GPIO4** pin
</Steps>

<Aside type="caution" title="Vigtigt: Brug 3.3V!">
DHT22 kører på 3.3V. Brug **IKKE** 5V - det kan ødelægge sensoren permanent!
</Aside>

## ⚙️ ESPHome Konfiguration

### Opret ny enhed

<Steps>
1. Åbn **Home Assistant** → **Settings** → **Add-ons** → **ESPHome**

2. Klik **+ NEW DEVICE**

3. Giv den et navn, f.eks. `stue-sensor`

4. Vælg **ESP32** som board type

5. Erstat konfigurationen med denne:
</Steps>

### Komplet konfiguration

```yaml title="stue-sensor.yaml" {12-20}
esphome:
  name: stue-sensor
  friendly_name: Stue Sensor

esp32:
  board: esp32dev

# WiFi - erstat med dine oplysninger
wifi:
  ssid: "DIT_WIFI_NAVN"
  password: "DIN_WIFI_KODE"

# DHT22 sensor konfiguration
sensor:
  - platform: dht
    pin: GPIO4
    model: DHT22
    temperature:
      name: "Stue Temperatur"
      filters:
        - offset: 0.0  # Kalibrering hvis nødvendigt
    humidity:
      name: "Stue Fugtighed"
    update_interval: 60s

# Tilføj en status LED (valgfrit)
status_led:
  pin: GPIO2

# Web server til debugging (valgfrit)
web_server:
  port: 80

# Logger
logger:
  level: INFO

# Home Assistant API
api:
  encryption:
    key: !secret api_key

# OTA updates
ota:
  platform: esphome
```

<Aside type="tip" title="Kalibrering">
Hvis temperaturene ser forkerte ud, juster `offset` værdien. F.eks. `offset: -1.5` trækker 1.5°C fra.
</Aside>

## 📤 Flash til ESP32

<Tabs>
  <TabItem label="Første gang (USB)">
    <Steps>
    1. Tilslut ESP32 til computeren med USB
    2. Klik **INSTALL** i ESPHome
    3. Vælg **Plug into this computer**
    4. Vælg den korrekte COM port
    5. Vent på at upload er færdig (~2 min)
    </Steps>
    
    ![USB flash process](/images/guides/temperatur-sensor/usb-flash.png)
  </TabItem>
  <TabItem label="Opdateringer (WiFi)">
    <Steps>
    1. Klik **INSTALL** i ESPHome
    2. Vælg **Wirelessly**
    3. Vent på at upload er færdig (~1 min)
    </Steps>
    
    <Aside type="note">
    WiFi upload virker kun efter første USB installation.
    </Aside>
  </TabItem>
</Tabs>

## ✅ Verificer i Home Assistant

<Steps>
1. Gå til **Settings** → **Devices & Services**

2. ESPHome integration bør automatisk finde din nye enhed
   
   ![Device discovered](/images/guides/temperatur-sensor/discovered.png)

3. Klik **CONFIGURE** og tilføj enheden

4. Gå til **Developer Tools** → **States**

5. Søg efter `sensor.stue_temperatur`
   
   ![Sensor states](/images/guides/temperatur-sensor/states.png)
</Steps>

<Aside type="tip" title="Kan du ikke finde enheden?">
- Tjek at ESP32 er på samme netværk som Home Assistant
- Genstart Home Assistant
- Tjek ESPHome logs for fejl
</Aside>

## 📊 Opret et Dashboard

Tilføj sensoren til dit Lovelace dashboard:

```yaml title="dashboard card"
type: sensor
entity: sensor.stue_temperatur
name: Stue
icon: mdi:thermometer
graph: line
hours_to_show: 24
detail: 2
```

![Dashboard card](/images/guides/temperatur-sensor/dashboard.png)

## 🔧 Fejlfinding

<Aside type="tip" title="Sensor viser 'Unknown' eller 'Unavailable'">
**Mulige årsager:**
- Forkert GPIO pin - dobbelttjek wiring
- Løse forbindelser - tryk ledninger godt i
- Forkert model - prøv `model: DHT11` i stedet

**Løsning:**
1. Tjek ESPHome logs for fejlbeskeder
2. Verificer at 3.3V bruges (IKKE 5V)
3. Prøv en anden GPIO pin (f.eks. GPIO5)
</Aside>

<Aside type="tip" title="Temperatur virker forkert">
**Mulige årsager:**
- DHT22 har ±0.5°C tolerance
- Sensor placeret nær varmekilde
- Selv-opvarmning fra ESP32

**Løsning:**
1. Brug `offset` filter til kalibrering
2. Flyt sensor væk fra ESP32 boardet
3. Sammenlign med et kendt termometer
</Aside>

<Aside type="tip" title="WiFi forbindelse ustabil">
**Mulige årsager:**
- For langt fra router
- Interferens fra andre enheder

**Løsning:**
```yaml
wifi:
  ssid: "DIT_WIFI"
  password: "DIN_KODE"
  power_save_mode: none  # Deaktiver strømsparing
  fast_connect: true     # Hurtigere reconnect
```
</Aside>

## 🎯 Tips til præcise målinger

| Tip | Forklaring |
|-----|------------|
| **Placering** | Undgå direkte sollys, varmekilder og træk |
| **Højde** | Placer i ~1.5m højde for bedste resultat |
| **Opdatering** | 60s er fint - hurtigere slider sensor og batteri |
| **Kalibrering** | Sammenlign med godt termometer og juster offset |

## 🚀 Næste skridt

<CardGrid>
  <Card title="🚶 Bevægelsessensor" icon="rocket">
    Tilføj en PIR sensor til at detektere bevægelse og tænd lys automatisk.
    
    [Byg bevægelsessensor →](/da/esp32/bevaegelsessensor/)
  </Card>
  <Card title="💡 LED Strip" icon="setting">
    Styr adresserbare RGB LEDs baseret på temperatur eller tid.
    
    [Byg LED strip →](/da/esp32/led-strip/)
  </Card>
</CardGrid>

---

## 📚 Relaterede guides

- [ESP32 Kom godt i gang](/da/esp32/kom-godt-i-gang/) - Grundlæggende setup
- [Home Assistant Dashboard](/da/home-assistant/dashboards/) - Flotte visualiseringer  
- [Automationer](/da/automationer/) - Automatiser baseret på temperatur

---

<Aside type="note" title="Hjælp os med at forbedre">
Fandt du en fejl eller har du forslag? [Rediger denne side på GitHub](https://github.com/Hovborg/smartbolig-starlight/edit/main/src/content/docs/da/esp32/temperatur-sensor.mdx)
</Aside>
```

---

## 📸 Billeder der mangler

For at guiden er komplet, skal disse billeder tilføjes:

| Billede | Placering | Beskrivelse |
|---------|-----------|-------------|
| `hero.jpg` | `/public/images/guides/temperatur-sensor/` | DHT22 + ESP32 samlet |
| `wiring.png` | `/public/images/guides/temperatur-sensor/` | Wiring diagram |
| `usb-flash.png` | `/public/images/guides/temperatur-sensor/` | Screenshot af ESPHome USB flash |
| `discovered.png` | `/public/images/guides/temperatur-sensor/` | Screenshot af device discovery |
| `states.png` | `/public/images/guides/temperatur-sensor/` | Screenshot af sensor states |
| `dashboard.png` | `/public/images/guides/temperatur-sensor/` | Screenshot af dashboard card |

---

## ✅ Checkliste

- [ ] Frontmatter er korrekt
- [ ] Alle links virker
- [ ] Kode er testet og virker
- [ ] Billeder er tilføjet
- [ ] Fejlfinding sektion er komplet
- [ ] Relaterede guides linker korrekt
