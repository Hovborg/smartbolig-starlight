# 🏠 smartbolig.net

Et tosproget smart home-guideunivers med fokus på Home Assistant, ESPHome og
lokale automationer. Indholdet findes på dansk og engelsk og er skrevet til et
internationalt publikum, når emnet ikke er landespecifikt.

**Live site:** https://smartbolig.net

---

## 📖 Om projektet

smartbolig.net hjælper både danske og internationale læsere med at bygge et
overskueligt og driftssikkert smart home. Fokus er på:

- **Home Assistant** - Installation, konfiguration og automationer
- **ESP32/ESPHome** - DIY sensorer og enheder
- **Produktguides** - Anbefalinger til smart home udstyr
- **Lokal kontrol** - Løsninger der kan holde centrale funktioner i hjemmet
- **International anvendelighed** - Generelle guides kræver ikke danske tjenester

Sitet er tilgængeligt på både dansk og engelsk.

---

## 🛠️ Teknisk Stack

- **Framework:** [Astro Starlight](https://starlight.astro.build/)
- **Hosting:** [Cloudflare Pages](https://pages.cloudflare.com/)
- **Sprog:** Dansk (primær) + Engelsk
- **Styling:** Custom responsivt portaldesign med lys og mørk tilstand

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

Deployment-workflowet stopper før publicering, hvis en kvalitets-, nyheds-,
indholds-, sikkerheds-, build- eller SEO-kontrol fejler. Kør den samme centrale
kontrol lokalt før push:

```bash
npm ci
npm run site:test
npm run ai-news:test
npm run ai-news:validate
python3 scripts/content-audit.py
npm audit --omit=dev --audit-level=high
npm run build
npm run seo:validate
```

---

## 🤖 Daglig AI-news automation

AI-nyhedssektionen opdateres dagligt kl. 07:20 af `scripts/openclaw-ai-news-daily.sh`,
som henter officielle kilder, genererer artikler (da+en), bygger, validerer og
auto-merger en PR.

**Anbefalet setup (systemd user timer):**

```bash
bash scripts/install-systemd-ai-news-timer.sh
```

Det installerer:

| Unit | Funktion |
|------|----------|
| `smartbolig-ai-news.timer` | Kører dagligt kl. 07:20 (Persistent — indhenter missede kørsler) |
| `smartbolig-ai-news.service` | Kører hele pipeline-scriptet |
| `smartbolig-ai-news-failure.service` | Opretter et GitHub-issue hvis kørslen fejler |

Drift-kommandoer:

```bash
systemctl --user list-timers smartbolig-ai-news.timer   # næste kørsel
systemctl --user start smartbolig-ai-news.service       # kør manuelt nu
journalctl --user -u smartbolig-ai-news.service -e      # se logs
```

> **Legacy:** `scripts/install-openclaw-ai-news-cron.sh` (OpenClaw cron-job) er det
> tidligere setup. Det krævede at agent-harnesset eksponerede et exec-tool og gik i
> stykker ved harness-ændringer — brug systemd-timeren i stedet.

---

## 🧭 Portalstruktur

- Dansk og engelsk forside med en billedbåret smart-home hero og fem tydelige indgange
- Guidet startrute på `/da/start/` og `/en/start/`
- Tidlig editorial rail med de tre seneste AI-nyheder, valgt read-only fra content collection
- Pagefind-søgning på tværs af guides og nyheder

Hero-masteren ligger under `src/assets/homepage/`. Generér de seks responsive
AVIF/WebP-filer efter en ændring af masteren med:

```bash
npm run images:home
```

Aktuelle guideforløb omfatter blandt andet:

- Matter og Thread i Home Assistant 2026
- lokal Home Assistant Assist med Speech-to-Phrase/Whisper og Piper
- ESPHome Bluetooth Proxy på Wi-Fi, Ethernet eller PoE
- Home Assistant Energy Dashboard med international opsætning til elnet,
  solceller, batteri, gas, vand, apparater og elbil

---

## 📄 Licens

Indholdet på smartbolig.net er ophavsretligt beskyttet.

---

*Bygget med ❤️ i Danmark*
