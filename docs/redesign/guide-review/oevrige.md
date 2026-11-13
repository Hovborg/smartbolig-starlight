# Faktatjek: esp32, automationer, sikkerhed, juridisk, ai (uden ai/nyheder)

Kontrolleret 2026-11-13. Alle rettelser er lavet i både dansk og engelsk. Rettelser er kun lavet, hvor en primær kilde er åbnet; resten står under "Uafklaret".

## Mangler og forslag

Ejeren finder `automationer` (3 sider), `sikkerhed` (2) og `esp32` (8) for tynde. Mest værdi først:

1. Sikkerhed: Backup, gendannelse og test af gendannelse (i dag kun en tjekliste).
2. Sikkerhed: IoT-netværk og VLAN (indekset nævner segmentering, men har kun et ASCII-diagram).
3. ESP32: OTA, krypteringsnøgler og `secrets.yaml` i praksis (alle eksempler bruger pladsholdere).
4. ESP32: Strømmåling til energipanelet (CT-klemmer eller PZEM).
5. Automationer: Tilstedeværelse med mmWave, lys og ventilator i én testet opskrift.
6. Automationer: Notifikationer med handlingsknapper og kvittering.
7. Automationer: Blueprints, scripts og genbrug i stedet for kopiér-og-ret YAML.
8. Sikkerhed: Opdateringer og sårbarheder i smarte enheder (firmware, end-of-life).

## Status pr. side

Filer ligger under `src/content/docs/da/` (EN tilsvarende). Alle er tjekket 2026-11-13.

| Fil | Status | Ændring | Kilde |
|---|---|---|---|
| esp32/kom-godt-i-gang | rettet | `ota` i listeform; `captive_portal` kræver `wifi: ap:`; Apps/Værktøjer-navne i HA; 5 GHz (ESP32-C5) | esphome.io/components/ota/esphome/, github.com/esphome/esphome (captive_portal), home-assistant.io/blog/2026/02/04/release-20262/, espressif.com ESP32-C5 |
| esp32/bevaegelsessensor | rettet | `ota`; automation med `triggers:`/`actions:` | esphome.io/components/ota/esphome/, home-assistant.io/docs/automation/trigger/ |
| esp32/temperatur-sensor | rettet | DHT22 pull-up ca. 4,7 kΩ (var 10 kΩ); `ota`; automationssyntaks | esphome.io/components/sensor/dht/, /one_wire/, /sensor/dallas_temp/ |
| esp32/led-strip | rettet | `rgb_order` afløst af `channel_colors`; fejlfinding; `ota` | esphome.io/components/light/esp32_rmt_led_strip/, esphome.io/blog/2026/08/19/esphome-2026-8/ |
| esp32/ld2410-mmwave | rettet | VCC 5 V (var 3,3 V); pin-pitch 1,27 mm; `ota`; automationssyntaks | wiki.dfrobot.com/SEN0557, esphome.io/components/sensor/ld2410/ |
| esp32/esphome-avanceret | rettet | Jinja-eksempel rettet til `${ }`; remote-package-eksempler pegede på ikke-eksisterende filer; ld2410/bluetooth_proxy er indbyggede, ikke external components; `rgb_order`/`ota` | esphome.io/components/substitutions/, /packages/, /external_components/ |
| esp32/bluetooth-proxy | ok | – | esphome.io/components/bluetooth_proxy/ |
| esp32/index | ok | Priser og butikker ikke kontrolleret | – |
| automationer/bevaegelseslys-med-overstyring | rettet | To døde ankre, `for:`-link, dato | home-assistant.io/docs/automation/troubleshooting/, /triggers/state/ |
| automationer/sensorovervaagning | ok | – | home-assistant.io/integrations/notify/, /docs/configuration/state_object |
| automationer/index | rettet | Scene: `color_temp` (mired) er fjernet fra HA, nu `color_temp_kelvin: 2500` | contributors.home-assistant.io/blog/2026/02/23/remove-deprecate-light-features |
| sikkerhed/fjernadgang | rettet | Port 80/8123 suppleret; dødt anker; dato | home-assistant.io/docs/configuration/remote/, tailscale.com/docs/features/access-control/acls |
| sikkerhed/index | rettet | "Ekstremt farligt" om port forwarding erstattet med HA's egen formulering og link til tjekliste | home-assistant.io/docs/configuration/securing/ |
| ai/index | ok | – | – |
| ai/ai-cli/index | rettet | Gemini-gratisadgang i datid; Codex-installation; dato | geminicli.com/docs, github.com/google-gemini/gemini-cli |
| ai/ai-cli/claude-code-kom-godt-i-gang | rettet | Kræver abonnement (gratisplan har ikke Claude Code); Homebrew; `/usage` (`/cost`, `/stats` aliasser); permissions: auto mode som start, Manual, `Shift+Tab` | code.claude.com/docs/en/quickstart, /permission-modes, /commands; claude.com/pricing |
| ai/ai-cli/codex-kom-godt-i-gang | rettet | Windows: PowerShell-installer og WSL2; modelanbefaling GPT-6-familien; GPT-5.5 udgået fra Codex med ChatGPT-login | learn.chatgpt.com/docs (cli, models), github.com/openai/codex releases |
| ai/ai-cli/gemini-cli-kom-godt-i-gang | rettet | Overgang til Antigravity i datid; login-tabel; `/memory add` fjernet (findes ikke) | geminicli.com/docs (commands, gemini-md, quota-and-pricing), github.com/google-gemini/gemini-cli |
| ai/ai-cli/antigravity-cli-kom-godt-i-gang | rettet | Overgang i datid; standardmodel-påstand fjernet; credits; `--mode` | antigravity.google/docs/cli/reference, /cli/credits, github.com/google-antigravity/antigravity-cli |
| ai/ai-cli/priser-og-planer | rettet | API-tabeller, abonnementer, credits og limits opdateret hos Anthropic, OpenAI og Google | platform.claude.com/docs/en/about-claude/pricing, claude.com/pricing, learn.chatgpt.com/docs/pricing, developers.openai.com/api/docs/pricing, aistudio.google.com/docs/pricing, gemini.google/us/subscriptions |
| ai/ai-cli/sammenligning | rettet | Modeller, Windows-vej, Claude-permissions, Gemini-status | som ovenfor |
| ai/ai-cli/sikkerhed-og-permissions | rettet | Claude-forbehold til Manual mode; afsnit om auto mode | code.claude.com/docs/en/permission-modes, /security |
| ai/ai-cli/agent-instruktioner | ok | Kun dato | – |
| ai/ai-cli/projektmapper-og-workflows | rettet | Claude læser `AGENTS.md` direkte uden `CLAUDE.md` (v2.1.277+); `/memory add` fjernet | code.claude.com/docs/en/memory |
| juridisk/affiliate-disclosure | ok | Stemmer med `AffiliateLink.astro` ("Reklamelink", `sponsored nofollow`) og partnerlisten i `src/lib/affiliate.ts` | kode |
| juridisk/brugsvilkaar | rettet | Linkmærkning "Affiliate" rettet til "Reklamelink" / "Ad link" (som komponenten viser) | `src/components/AffiliateLink.astro` |
| juridisk/cookiepolitik | rettet | Funktionel cookie `preferred-lang` (1 år) tilføjet i tabellen over nødvendige cookies | `src/components/Head.astro` |
| juridisk/privatlivspolitik | uafklaret | Se nedenfor | – |
| juridisk/index | uafklaret | Se nedenfor | – |

## Kræver ejerens stillingtagen (juridisk)

Fundet ved sammenligning med koden (`astro.config.mjs`, `Head.astro`, `public/_headers`). Intet af dette er ændret, og der er ikke draget juridiske konklusioner.

1. **Samtykkebanner.** Cookiepolitikken beskriver et banner med "Acceptere alle / Kun nødvendige / Tilpas", et cookie-ikon nederst til venstre og en cookie `CookieConsent`. Koden indlæser kun Google Consent Mode v2 (alt `denied` som standard) og AdSense, og kommentaren siger, at Googles certificerede CMP (Privacy & messaging) viser bannerteksten. Bannerets knapper og cookienavne kan ikke ses i koden. Kontrollér i AdSense-dashboardet, hvad besøgende faktisk ser, og hvilke cookienavne CMP'en sætter.
2. **Ezoic.** Cookiepolitik og privatlivspolitik nævner Ezoic som annoncepartner og `ez_*`-cookies. Intet Ezoic-script indlæses i koden; kun CSP'en tillader `cdn.ezoic.net`. Er Ezoic ikke aktivt (fx via Cloudflare-integration), bør det fjernes fra begge sider.
3. **Cloudflare Web Analytics.** CSP'en tillader `static.cloudflareinsights.com`, men politikkerne omtaler det ikke. Kontrollér, om det er slået til i Cloudflare.
4. **Nyhedsbrev.** Privatlivspolitikken (afsnit 2.1) nævner e-mail ved nyhedsbrevstilmelding. Der er ingen tilmeldingsformular i koden. Fjern punktet, hvis der ikke er et nyhedsbrev.
5. **Opbevaring i Google Analytics.** "Op til 14 måneder" er en indstilling i GA4-kontoen og kan ikke ses i koden.
6. **Databehandleraftaler og overførselsgrundlag (afsnit 5).** Påstanden om databehandleraftaler og DPF/SCC pr. leverandør er ikke kontrolleret.
7. **Brugsvilkår.** Ordlyden "DMCA takedown", "AI-træning forbudt" og sanktionslisten (cease and desist, erstatning) er juridiske valg. DMCA er amerikansk ret; overvej en dansk/EU-formulering. Robots.txt matcher ellers beskrivelsen (træningscrawlere blokeret, søgecrawlere tilladt; kun delvist læst).
8. **Datoer.** Brugsvilkår er sidst opdateret december 2025 og har "© 2025"; overvej ny dato og nyt årstal.
9. **Udbyderoplysninger.** Dataansvarlig er angivet som "SmartBolig.net, Danmark" uden juridisk navn, adresse eller CVR. Kontrollér mod gældende krav til udbyderoplysninger og GDPR art. 13.

## Uafklaret (tekst uændret)

**AI-guides**
- Antigravity: `agy update`, `agy install`, `agy changelog`, `agy plugin list`, "version 1.0.3", eksemplet `"model": "Gemini 3.5 Flash (High)"` i `settings.json`, `.md`-regelfiler/`rules.json` og "lukket binær" er ikke bekræftet i referencen (siden /docs/cli/rules gav 404).
- Gemini CLI: `/memory reload` (gemini-md-siden) mod `refresh` (commands-referencen); quota-siden nævner stadig AI Pro/Ultra, hvilket modsiger Googles blogindlæg; daglige kvoter 1.000/1.500/2.000 er ikke genbekræftet.
- Codex: Pro-limits pr. tier ikke fundet (gamle 5x/20x-rækker er fjernet); commands-siden kun delvist læst. `developers.openai.com/codex/...` videresender til `learn.chatgpt.com`.
- Claude: indholdet af Cowork/Projects på Pro og "Open source CLI: Nej" er ikke genbekræftet. Kronebeløb er omregnet med ca. 6,40 kr./USD, som siden allerede brugte.

**ESP32, automationer og sikkerhed**
- Nabu Casa-supportartikler gav 403; påstande om aktivering og `trusted_networks` er ikke kontrolleret.
- `select.led_strip_effect` i led-strip-guiden: ESPHome-lys eksponerer formentlig effekten på lys-entiteten, men det er ikke fundet i en kilde.
- LD2410 uden B/C og Bluetooth: kilderne er uenige. DHT-datablade (3,3-5,5 V, DHT11 20-80 % RH, 2 sekunders aflæsning) ikke belagt.
- GPIO-valg (GPIO2, 5, 16, 17) uden forbehold om strapping-/flashpins; WS2812B 3,3 V-data mod 5 V-forsyning (niveauskifter) er ikke omtalt.
- `ota: password` frarådes af ESPHome til nye enheder (anbefaler `encryption`); guiderne bruger det stadig.
- Billedet `ld2410-mmwave/overview.svg` viser 3,3 V, mens `wiring.svg` viser 5 V (billeder må ikke ændres her; ret SVG'en separat).
- EN-versionen af LD2410-guiden er kortere end DA (mangler ESP32-diagram, tuning via HA og gate-forklaring).
- "$3/md" for 1Password kunne ikke verificeres; sikkerhedsindekset anbefaler Bitwarden (redaktionelt valg). Dansk UI-navn "Kontakt" for hjælpertypen Toggle er ikke kontrolleret.
