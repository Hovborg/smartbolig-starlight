# 🏠 smartbolig.net

Et dansk smart home tutorial website med fokus på Home Assistant og ESP32.

**Live site:** https://smartbolig.net

---

## 📖 Om projektet

smartbolig.net hjælper danske brugere med at komme i gang med smart home teknologi. Fokus er på:

- **Home Assistant** - Installation, konfiguration og automationer
- **ESP32/ESPHome** - DIY sensorer og enheder
- **Produktguides** - Anbefalinger til smart home udstyr
- **Lokalt fokus** - Løsninger der virker uden cloud-afhængighed

Sitet er tilgængeligt på både dansk og engelsk.

---

## 🛠️ Teknisk Stack

- **Framework:** [Astro Starlight](https://starlight.astro.build/)
- **Hosting:** [Cloudflare Pages](https://pages.cloudflare.com/)
- **Sprog:** Dansk (primær) + Engelsk
- **Styling:** Custom dark theme (IBRACORP-inspireret)

---

## 📁 Struktur

```
src/content/docs/
├── da/                 # Danske sider
│   ├── home-assistant/ # Home Assistant guides
│   ├── esp32/          # ESP32/ESPHome guides
│   ├── produkter/      # Produktanbefalinger
│   └── ...
└── en/                 # Engelske sider (samme struktur)
```

---

## 🚀 Deployment

Sitet deployes automatisk til Cloudflare Pages ved push til `main` branch.

```bash
git add .
git commit -m "Beskrivelse"
git push origin main
```

---

## 📊 Statistik

- 172 sider (dansk + engelsk)
- 22 produktkategorier
- 32 custom SVG diagrammer
- Pagefind søgning med 21.000+ ord indexeret

---

## 📄 Licens

Indholdet på smartbolig.net er ophavsretligt beskyttet.

---

*Bygget med ❤️ i Danmark*
