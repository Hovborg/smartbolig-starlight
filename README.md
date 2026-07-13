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
åbner en PR. Generatoren merger aldrig sin egen PR: en separat Claude/Codex-session
skal læse udkastet, kontrollere kilderne og vente på grønne checks før merge.

Pipelinen (v3):

- **Kilder:** OpenAI News, Google AI Blog og Anthropic News (HTML-listing — Anthropic
  har ingen RSS) plus release-feeds for Codex, Claude Code, Gemini CLI og OpenClaw.
- **Redaktionelt lag:** dedup på URL-, emne- og kildesæt-fingerprints mod de sidste
  14 dages udgaver, score-tærskel og krav om primær kilde.
- **Tekst:** `AI_NEWS_LLM=1` (standard i automatikken) beder headless Claude Code om
  unik per-historie-analyse (hvad/hvorfor/verificér/usikkerhed) ud fra kildeteksten;
  ved enhver fejl falder pipelinen tilbage til den deterministiske skabelon, så
  publiceringen aldrig blokerer. Frontmatter-feltet `news.copySource` viser hvilket
  lag der skrev teksten.
- **Billeder:** hero- og og:image-varianter genereres som JPEG (mozjpeg, ~100-300 KB);
  forsiden bruger 320×180 WebP-thumbs.
- **Arkivvedligehold:** `node scripts/ai-news-regenerate.mjs` kan genopbygge ældre
  udgaver med v3-rendereren ud fra hver artikels egen kildetabel (`--dry-run`,
  `--date`, `--no-llm`). Dage uden nye kilder renderes som ærlige
  gentagelses-udgaver med `signal: low`.

**Anbefalet setup (systemd user timer):**

```bash
bash scripts/install-systemd-ai-news-timer.sh
```

Det installerer:

| Unit | Funktion |
|------|----------|
| `smartbolig-ai-news.timer` | Kører dagligt kl. 07:20 (Persistent — indhenter missede kørsler) |
| `smartbolig-ai-news.service` | Kører pipeline-scriptet og åbner en PR til redaktionelt review |
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

Forsiden er en redaktionel "smart-home field guide" bygget af små komponenter
under `src/components/home/`, orkestreret af `HomePortal.astro` og styret af den
typede DA/EN copy-model i `src/lib/home-copy.ts`:

1. Kort hero med ét løfte, én primær CTA og et responsivt AVIF/WebP-billede
2. Kompakt målnavigator med begynderspor til `/start/` og fem indgange
3. Feltguide med sidens eneste nummerserie (etape 1–3)
4. Udvalgte guides som lead-artikel plus kompakt liste
5. Trust-sektion med efterprøvelige links (kilder, privatliv, affiliate, rettelser)
6. Kompakt AI-nyhedsmodul lavt på siden, valgt read-only fra content collection
7. Afsluttende CTA, der ikke gentager startruten

Al homepage-CSS er scoped til `.home-*` i `HomeStyles.astro`. Pagefind-søgning
dækker fortsat guides og nyheder.

Hero-masteren ligger under `src/assets/homepage/`. Generér de seks responsive
AVIF/WebP-filer efter en ændring af masteren med:

```bash
npm run images:home
```

Forsidens nyhedsliste bruger små WebP-thumbnails (`-thumb.webp`) ved siden af
AI-nyhedernes hero-PNG'er. De genereres automatisk som første trin i
`npm run build`; kør dem manuelt med:

```bash
npm run images:news-thumbs
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
