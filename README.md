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

- Dansk og engelsk forside med fem tydelige indgange
- Guidet startrute på `/da/start/` og `/en/start/`
- Automatisk visning af de tre seneste AI-nyheder på forsiden
- Pagefind-søgning på tværs af guides og nyheder

---

## 📄 Licens

Indholdet på smartbolig.net er ophavsretligt beskyttet.

---

*Bygget med ❤️ i Danmark*
