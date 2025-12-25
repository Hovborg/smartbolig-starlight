# 📝 Guide Skabelon

Brug denne skabelon til at skrive nye eller forbedre eksisterende guides.

---

## Frontmatter (SKAL være øverst)

```yaml
---
title: "Titel på guiden"
description: "Kort beskrivelse til SEO (max 160 tegn)"
sidebar:
  badge:
    text: Ny
    variant: tip
---
```

### Badge varianter:
- `tip` (grøn) - Ny guide
- `caution` (gul) - Opdateret
- `danger` (rød) - Avanceret
- `note` (blå) - Beta

---

## Standard struktur

```mdx
import { Steps, Aside, Card, CardGrid, Tabs, TabItem, Badge } from '@astrojs/starlight/components';

# Overskrift vises IKKE (title bruges)

<Badge text="Let" variant="success" /> <Badge text="30 min" variant="note" />

Kort intro - hvad bygger vi og hvorfor er det fedt?

![Hero billede](/images/guides/projekt-navn/hero.jpg)

## 📋 Forudsætninger

Før du starter, skal du have:
- Home Assistant kørende
- ESPHome add-on installeret
- Grundlæggende kendskab til YAML

## 🛒 Komponenter

| Del | Link | Pris ca. |
|-----|------|----------|
| ESP32 DevKit | [Amazon.de](link) | 45 kr |
| DHT22 sensor | [Amazon.de](link) | 25 kr |
| **Total** | | **70 kr** |

## 🔌 Tilslutning

![Wiring diagram](/images/guides/projekt-navn/wiring.png)

<Aside type="caution">
Vigtig advarsel her!
</Aside>

## ⚙️ Konfiguration

<Tabs>
  <TabItem label="ESPHome">
    ```yaml title="config.yaml"
    # Kode her
    ```
  </TabItem>
  <TabItem label="Home Assistant">
    ```yaml title="configuration.yaml"
    # Kode her
    ```
  </TabItem>
</Tabs>

## 📝 Trin-for-trin

<Steps>
1. **Første trin**
   
   Forklaring med billede:
   ![Step 1](/images/guides/projekt-navn/step1.png)

2. **Andet trin**
   
   Mere forklaring...

3. **Tredje trin**
   
   Osv...
</Steps>

## ✅ Test det virker

Sådan verificerer du at alt fungerer:

1. Gå til Home Assistant → Developer Tools → States
2. Søg efter din sensor
3. Du bør se værdier som dette:

![Test result](/images/guides/projekt-navn/test.png)

## 🔧 Fejlfinding

<Aside type="tip" title="Sensor viser ikke data?">
- Tjek at ledninger sidder rigtigt
- Verificer at GPIO pin matcher konfigurationen
- Prøv at genstarte ESP32
</Aside>

<Aside type="tip" title="Forkerte værdier?">
- DHT22 kan være upræcis ±2°C
- Undgå placering nær varmekilder
- Kalibrér i Home Assistant om nødvendigt
</Aside>

## 🚀 Næste skridt

<CardGrid>
  <Card title="Næste guide" icon="rocket">
    Kort beskrivelse
    [Gå til guide →](/da/...)
  </Card>
  <Card title="Relateret guide" icon="setting">
    Kort beskrivelse
    [Gå til guide →](/da/...)
  </Card>
</CardGrid>

---

💡 **Fandt du en fejl?** [Rediger denne side på GitHub](link)
```

---

## Komponenter du kan bruge

### Aside (info-bokse)
```mdx
<Aside type="note">Standard info</Aside>
<Aside type="tip">Godt tip</Aside>
<Aside type="caution">Pas på!</Aside>
<Aside type="danger">Fare!</Aside>
```

### Tabs
```mdx
<Tabs>
  <TabItem label="Tab 1">Indhold 1</TabItem>
  <TabItem label="Tab 2">Indhold 2</TabItem>
</Tabs>
```

### Steps
```mdx
<Steps>
1. Første trin
2. Andet trin
3. Tredje trin
</Steps>
```

### Cards
```mdx
<CardGrid>
  <Card title="Titel" icon="rocket">
    Indhold
  </Card>
</CardGrid>
```

### Badge
```mdx
<Badge text="Let" variant="success" />
<Badge text="30 min" variant="note" />
<Badge text="Avanceret" variant="danger" />
```

---

## Billeder

Placer billeder i: `/public/images/guides/[guide-navn]/`

```mdx
![Alt tekst](/images/guides/guide-navn/billede.png)
```

Se `BILLEDER.md` for mere info.
