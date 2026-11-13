# Faktatjek af Home Assistant-guides, del A

Kontrolleret 2026-11-13 mod Home Assistant 2026.11. Omfang: 17 sider på dansk og engelsk under `home-assistant/`. Dansk og engelsk er holdt faktuelt ens. Kun kilder, der faktisk er åbnet, er brugt til rettelser. Fodnoten "Sidst opdateret" er sat til november 2026 på de sider, hvor indholdet er ændret (siderne har ingen `lastUpdated`-nøgle i frontmatter).

## Mangler og forslag

1. Oprindelig guide til Marketplace i 2026.11 (migrering, tilføjelse af egne repositories, afinstallation, "Delete and uninstall"), når Home Assistants egen dokumentation er stabil. `hacs.mdx` dækker nu begge veje, men er blevet lang.
2. Opdatér automationseksempler fra `platform:`/`service:` til `triggers:`/`trigger:` og `actions:`/`action:`, som Home Assistants dokumentation bruger (elpris, elbil, fugtighed, Better Thermostat, første automation). Den gamle syntaks virker stadig.
3. Guide til den nye "Settings → Tools" (States, Actions, Template, Statistics, YAML og nye Action history i 2026.11).
4. Guide til Home Assistant 2026.11-ændringer, der kan ramme læsere: entitetsnavne på dashboards (enhedsnavn plus entitetsnavn), `friendly_name` på vej ud i templates, ny frontend-browserkrav (Chrome 67, Safari 15.4, Firefox 98), lokal disk som backuplagring.
5. Guide til Home Assistant Link (Nabu Casa omdøber Cloud den 2. december) med pris, 5 GB-backup og fjernadgang.
6. Docker-guiden mangler `stop_grace_period` og opdatering uden Compose; den engelske version mangler den boks om apps, som den danske har.
7. Elbilguiden bør have et afsnit pr. mærke med verificeret integration (Tesla Fleet, Teslemetry, Tessie, Volvo, Renault) i stedet for en samlet tabel.
8. Priskolonnerne i `fugtighed-alarm-affugter.mdx` (ca. 100-200 kr m.fl.) er ikke verificeret og bør fjernes eller erstattes med partnerlinks, jf. READMEs regel om ubekræftede priser.
9. Guide til backup af Home Assistant Container (hvad den indbyggede backup dækker, og hvad den ikke dækker).
10. Dashboardguiden (`dashboard-design.mdx`) bør skrives om til Sections og de nye automatiske sektioner i 2026.11, og Mushroom-eksemplerne bør kontrolleres mod den aktuelle udgave.

## Sider

| Fil | Status | Ændret | Kilde | Dato |
|---|---|---|---|---|
| ai-task | rettet | Sti til foretrukken AI Task rettet til Indstillinger → System → AI. Handlingen kaldes fra Indstillinger → Tools → Actions. | https://www.home-assistant.io/integrations/anthropic/ , https://www.home-assistant.io/docs/tools/dev-tools/ | 2026-11-13 |
| aktivitet-og-spor | uafklaret | Intet ændret. Bekræftet: Activity-omdøbning, grupperet tidslinje, farvede punkter, avatar/ikon, `stored_traces` = 5, id kræves til YAML-spor. Ikke fundet i kilden: "fane med relateret aktivitet i sporet". | https://www.home-assistant.io/blog/2026/07/01/release-20267/ , https://www.home-assistant.io/docs/automation/yaml/ | 2026-11-13 |
| automationer-2026-7 | ok | Bekræftet: formålsbestemte triggere er standard, eksisterende automationer virker, "Automations & scenes", Kør handlinger springer trigger og betingelser over. | https://www.home-assistant.io/blog/2026/07/01/release-20267/ , https://www.home-assistant.io/docs/automation/basics/ | 2026-11-13 |
| backup-sikkerhed | rettet | Kryptering er standard og kan slås fra pr. lokation (ikke Cloud). Emergency kit. Planlægning (Custom days), retention (antal eller dage). Google Drive kræver egne OAuth-legitimationsoplysninger. OneDrive: kun personlige konti. Cloud: €7,50 pr. måned, €75 pr. år, én backup på højst 5 GB, omdøbes til Home Assistant Link 2. december. Netværkslager: Add storage. Gendannelse: Select what to restore, ca. 45 min. 2FA-sti rettet til Brugerprofil → Sikkerhed → Authenticator app. FAQ om backupindhold rettet. | https://www.home-assistant.io/common-tasks/general/backups/ , https://www.home-assistant.io/integrations/google_drive/ , https://www.home-assistant.io/integrations/onedrive/ , https://www.nabucasa.com/pricing/ , https://www.home-assistant.io/docs/authentication/multi-factor-auth/ | 2026-11-13 |
| better-thermostat | rettet | Marketplace/HACS. Advarsel om at opdatere Better Thermostat før Home Assistant 2026.11. Navne på Calibration Type og Calibration Mode. | https://github.com/KartoffelToby/better_thermostat/releases , https://better-thermostat.org/configuration | 2026-11-13 |
| dashboard-design | rettet | `grid` er ikke en visningstype. Oprettelse af dashboard (Add dashboard → New dashboard from scratch). Marketplace/HACS. | https://www.home-assistant.io/dashboards/views/ , https://www.home-assistant.io/dashboards/dashboards/ | 2026-11-13 |
| dashboard-kortvaelger | rettet | Kun Marketplace i stedet for HACS. Bekræftet: By entity, By card, Unassigned, Layout, Visibility. | https://www.home-assistant.io/blog/2026/06/03/release-20266/ , https://www.home-assistant.io/dashboards/cards/ | 2026-11-13 |
| docker-installation | rettet | Docker Engine 23.0.0 eller nyere, Docker Desktop understøttes ikke. Apps i stedet for add-ons. Indbygget backup findes også på Container (kun indstillinger og valgfri historik). | https://www.home-assistant.io/installation/linux/ , https://www.home-assistant.io/common-tasks/general/backups/ | 2026-11-13 |
| elbil-opvarmning | rettet | Tesla Fleet er indbygget (2024.8), Renault er indbygget (2021.8). BMW-alert (blokeret fra 29. september 2025). Sædevarme-entiteter hedder `..._front_left/_front_right`. | https://www.home-assistant.io/integrations/tesla_fleet/ , https://www.home-assistant.io/integrations/renault/ , https://alerts.home-assistant.io/alerts/bmw_connected_drive/ | 2026-11-13 |
| elpris-integration | rettet | Marketplace/HACS. Carnot-prognose kræver gratis konto og API-nøgle. Integrationen opretter én sensor (prognose ligger i attributten `forecast`). Netselskab er ikke nødvendigvis elleverandør. | https://github.com/MTrab/energidataservice (README) | 2026-11-13 |
| energy-dashboard | rettet | Tools-stier (States, Statistics). Ny 2026.11-funktion: afledt energisensor fra effektsensor. Bekræftet: Indstillinger → Dashboards → Energy og navngivning af kilder (2026.6). | https://www.home-assistant.io/docs/energy/ , https://www.home-assistant.io/blog/2026/11/04/release-202611/ | 2026-11-13 |
| fejlfinding | rettet | Apps, Tools (YAML, States, Actions), safe mode starter uden custom integrations, custom kort og temaer. Nulstilling af password rettet (`auth reset --interactive` / `hass --script auth`). Ubekræftet `ha auth totp remove` fjernet (kommandoen står ikke i dokumentationen). Marketplace i stedet for HACS. | https://www.home-assistant.io/docs/locked_out/ , https://www.home-assistant.io/docs/tools/dev-tools/ , https://www.home-assistant.io/common-tasks/os/ | 2026-11-13 |
| foerste-automation | rettet | Tools-stier. Henvisning til de nye formålsbestemte triggere i 2026.7. | https://www.home-assistant.io/blog/2026/07/01/release-20267/ | 2026-11-13 |
| fugtighed-alarm-affugter | rettet | Local Tuya kræver Local Key (anbefalet via Tuya IoT Platform) og er ikke-officiel. Tools-sti. Marketplace/HACS. | https://github.com/rospogrigio/localtuya , https://github.com/xZetsubou/hass-localtuya | 2026-11-13 |
| glossar | rettet | App (tidligere add-on, 2026.2), action (tidligere service), Marketplace efter HACS, RSSI-retning (højere er bedre). | https://www.home-assistant.io/blog/2026/02/04/release-20262/ , https://www.home-assistant.io/addons/ | 2026-11-13 |
| hacs | rettet | Omskrevet: HACS er blevet Marketplace i 2026.11 (Indstillinger → Marketplace, automatisk migrering, Add from link, GitHub kun til egne repositories, opdateringer under Indstillinger → Opdateringer). Ældre HACS-installation bevaret som "før 2026.11". Tabellerne er ens på dansk og engelsk. Påstand om antal GitHub-stjerner fjernet. Nordpool: indbygget integration siden 2024.12, uden moms og afgifter. | https://www.home-assistant.io/blog/2026/11/04/release-202611/ , https://www.home-assistant.io/integrations/marketplace/ , https://www.home-assistant.io/integrations/nordpool/ | 2026-11-13 |
| index | rettet | 1600+ integrationer, lokal styring først (ikke "ingen cloud"), Marketplace i stedet for HACS, Apps i stedet for Add-ons. | https://www.home-assistant.io/ | 2026-11-13 |

## Uafklaret

- Energi Data Service: `today_mean` beskrives i README som objekt, men guiden bruger værdien som tal, mens `today_min`/`today_max` bruges som objekter. Kan ikke afgøres uden at køre integrationen. README nævner 24 punkter pr. dag, guiden 96 efter Nord Pools 15-minutters opløsning.
- Better Thermostat: indstillingerne `off_temperature`, `window_off_delay`, `window_off_delay_after`, `tolerance` og forudindstillede temperaturer (herunder rækken "None") er ikke bekræftet mod den aktuelle udgave. Dokumentationen nævner kun "Window delay" og "outdoor temperature threshold". Påstanden om 15-25 % besparelse er uden kilde.
- Marketplace: ikke bekræftet, at alle de nævnte community-projekter (Energi Data Service, Mushroom, ApexCharts m.fl.) findes i Marketplace-kataloget, og hvordan ressourcestier (`/hacsfiles/...`) og loggernavnet `custom_components.hacs` ser ud efter migreringen.
- Elbil: Volkswagen We Connect ID, Polestar, Mercedes ME og Hyundai/Kia er ikke bekræftet som integrationer (kun forumkilder). Præsettene `dog`/`camp` og entiteterne `sensor.bil_charging` er ikke bekræftet mod Tesla Fleet-dokumentationen. Rækkeviddetal ("+10-20 %") er uden kilde.
- Fejlfinding: `trusted_networks` med `allow_bypass_login` til at komme ind igen er ikke bekræftet i dokumentationen og er en sikkerhedsrisiko.
- Danske menunavne (fx "Automationer og scener" mod "Automatiseringer og scener", "Tools", "Apps", "Add storage") er ikke bekræftet mod den danske brugerflade. Siderne bruger forskellige stavemåder.
- Aktivitet og spor: "fane med relateret aktivitet i sporet" er ikke fundet i udgivelsesnoterne.
- fugtighed-alarm-affugter: priserne i kroner er ubekræftede.
- index: "verdens mest populære open source smart home platform" er ikke verificeret.
- Brugerprofil → Theme (dashboard-design) kan ændre sig efter at temaer er flyttet til brugerprofilen i 2026.2; den præcise sti er ikke bekræftet.
- Nabu Casas omdøbning til Home Assistant Link den 2. december: årstallet står ikke på siden; antaget 2026.
