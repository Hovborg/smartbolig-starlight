# Faktatjek af Home Assistant-guides, del B

Kontrolleret 2026-11-13 mod Home Assistant 2026.11. Dansk og engelsk udgave er rettet ens. Datofelt/fodnote er opdateret, hvor siden har en.

## Mangler og forslag

1. En guide til den indbyggede HACS under Settings → Marketplace (fra 2026.11).
2. En Zigbee2MQTT 2.0-migreringsguide (fjernede indstillinger, ændret `permit_join`-payload, ember/zstack-adapter).
3. En Z-Wave-migreringsguide (Z-Wave JS UI-appen udfases til fordel for Z-Wave JS-appen; adaptermigrering til 800-serien).
4. ZHA: Green Power (2026.11) og ZHA via ESPHome serial proxy.
5. En guide til navneændringer i 2026.11 og den planlagte udfasning af `friendly_name` i skabeloner.
6. Opdatering af installationsguiderne med Home Assistant Green/Yellow og Raspberry Pi 5.
7. En guide til Home Assistant Connect ZBT-2 som Zigbee-koordinator.
8. Lokal dansk stemme: sammenligning af Whisper-modeller, nu hvor Speech-to-Phrase ikke understøtter dansk.
9. Shelly Gen3/Gen4 og nyere Wall Display-modeller (X2, X1i, X2i, XL) har ingen egen guide.
10. Prisangivelser i flere guides bør enten kildebelægges eller erstattes af komponenterne til prissammenligning; se "Uafklaret".

## Status pr. side

Kontroldato for alle rækker: 2026-11-13. Kilder er de officielle sider, der blev åbnet under gennemgangen.

| Fil | Status | Rettet / bemærkning | Kilde |
|---|---|---|---|
| z-wave | rettet | ZWA-2-pris $69 / €59. Long Range-afsnit og FAQ omskrevet (RF-regionen "Europe (Long Range)" findes). Add-ons → Apps. Z-Wave JS UI udfases. WebSocket-URL til Z-Wave JS UI-appen. Tilføjelsesvej Settings → Connectivity → Z-Wave. SmartStart inden for 10 min. Migrering: firmware 7.23.2+, SDK 6.61+. | https://www.home-assistant.io/integrations/zwave_js/ ; https://www.home-assistant.io/connect/zwa-2/ |
| zigbee2mqtt | rettet | Apps-ordlyd; stabil vs. Edge; onboarding og 502-note; `adapter: zstack`-fallback; image `ghcr.io/koenkk/zigbee2mqtt`; by-id-enhed; kanalråd (11/15/20/25); 2800+ → 5.800+ enheder. | https://www.zigbee2mqtt.io/guide/installation/ ; https://www.zigbee2mqtt.io/supported-devices/ ; https://github.com/zigbee2mqtt/hassio-zigbee2mqtt |
| zigbee2mqtt-avanceret | rettet | Fjernet `permit_join` og `legacy_availability_payload` (fjernet i 2.0). MQTT-payload `{"time": 60, "device": ...}`. Z-Stack-firmware hentes via releases (placeholder for dato). Forkert WiFi↔Zigbee-kanalmapping fjernet. Note om transmit_power. | https://www.zigbee2mqtt.io/guide/usage/mqtt_topics_and_messages.html ; https://www.zigbee2mqtt.io/guide/configuration/ |
| performance | rettet | `mariadb_server_args`; `sql:`-sensor med dokumentationens forespørgsel; system monitor via UI; `action: recorder.purge` og Settings → Tools → Actions; Apps-ordlyd. | https://www.home-assistant.io/integrations/sql/ ; https://www.home-assistant.io/integrations/systemmonitor/ ; https://www.home-assistant.io/integrations/recorder/ |
| node-red | rettet | App forudkonfigureret; node "action" i stedet for "call service"; flows.json-placering; Apps-ordlyd. | https://github.com/hassio-addons/addon-node-red ; https://zachowj.github.io/node-red-contrib-home-assistant-websocket/ |
| wifi-enheder | rettet | ESPHome-eksempel: `esp8266:` med board og `ota: - platform: esphome`. Shelly Gen3/Gen4 og Gen1 firmware ≥1.9. | https://esphome.io/components/esp8266.html ; https://esphome.io/components/ota/esphome.html ; https://www.home-assistant.io/integrations/shelly/ |
| kom-godt-i-gang | rettet | "2.000 integrationer" → "tusindvis af mærker". Nabu Casa €7,50/md eller €75/år ekskl. moms (EN: $6.50 var forkert). Add-on → app. | https://www.nabucasa.com/ ; https://www.home-assistant.io/integrations/ |
| proxmox-installation | rettet | Scriptet er community-drevet, ikke officielt. Standarder og prompts rettet (q35, OVMF, 2 kerner, 4096 MB, 32G; avanceret: version, cache, CPU kvm64). | https://community-scripts.github.io/ProxmoxVE/ ; https://www.home-assistant.io/installation/linux/ |
| raspberry-pi-installation | rettet | Opstarts- og første-start-tider efter HA-dokumentationen (minutter; flash igen efter 5 min uden adgang). A2-kort. Apps-ordlyd. | https://www.home-assistant.io/installation/raspberrypi/ |
| local-voice-assist | rettet | Advarsel: Speech-to-Phrase understøtter ikke dansk (`da` mangler på listen); Whisper til dansk. Latenstal rettet. | https://github.com/OHF-Voice/speech-to-phrase ; https://www.home-assistant.io/voice_control/ |
| thread-matter | rettet | Tilføj/del: Settings → Connectivity → Matter → Add device ("No. It's new." / "Yes. It's already in use."). | https://www.home-assistant.io/integrations/matter/ |
| mcp-server | rettet | Indstillingerne Read-only, Expose all AI tools og Require an administrator account; endpoints `/api/mcp` og `/api/mcp/assist`; opsætningssti. | https://www.home-assistant.io/integrations/mcp_server/ |
| mobilnotifikationer | rettet | Settings → Tools → Actions (var Developer Tools). | https://www.home-assistant.io/docs/tools/dev-tools/ |
| robotstoevsuger-efter-omraade | rettet | Indholdet ok; kun stien Settings → Tools → Actions rettet. | https://www.home-assistant.io/integrations/vacuum/ |
| vaskemaskine-notification | rettet | Settings → Tools → States. Automation-YAML moderniseret (`triggers`/`conditions`/`actions`). `color_temp` → `color_temp_kelvin`. | https://www.home-assistant.io/docs/automation/yaml/ ; https://www.home-assistant.io/integrations/light/ |
| infraroed-proxy | rettet | Settings → Connectivity → Infrared. Broadlink giver en `remote`-entitet, ikke en infrarød entitet. LG/Samsung Infrared og SMLIGHT SLZB. | https://www.home-assistant.io/integrations/infrared/ ; https://www.home-assistant.io/integrations/broadlink/ |
| radiofrekvens-proxy | rettet | Settings → Connectivity → Radio frequency. | https://www.home-assistant.io/integrations/radio_frequency/ |
| zha-enhedshaandtering | rettet | Settings → Connectivity → Zigbee; knappen Add device; oversigtskortet er ikke en fane. | https://www.home-assistant.io/integrations/zha/ |
| sikre-opdateringer-2026 | rettet | Kortet med oversprungne opdateringer vises kun med "Show skipped updates". | https://www.home-assistant.io/integrations/update/ |
| shelly-wall-display | rettet | Strøm 230 V AC 50/60 Hz. Model SAWD1 og nyere modeller. HACS under Settings → Marketplace fra 2026.11. YAML moderniseret. | https://www.shelly.com/ ; https://www.home-assistant.io/blog/2026/11/04/release-202611/ |
| overview-dashboard-2026 | ok | Ingen ændring; kontrolleret mod 2026.2-udgivelsen og dashboard-dokumentationen. | https://www.home-assistant.io/blog/2026/02/04/release-20262/ ; https://www.home-assistant.io/dashboards/ |

## Uafklaret

Ikke rettet, fordi påstanden ikke kunne belægges i en åbnet kilde.

- **Produktpriser (kr/$)** i z-wave (undtagen ZWA-2), zigbee2mqtt, zigbee2mqtt-avanceret, wifi-enheder, vaskemaskine-notification, shelly-wall-display, kom-godt-i-gang og raspberry-pi-installation (inkl. Raspberry Pi-hardware).
- **Z-Wave:** Zooz ZST39 "Long Range kun US"; at Z-Wave JS UI-appen ligger i `hassio-addons`-repositoriet; menunavnene "Rebuild Routes" og "Network → Map".
- **Zigbee2MQTT:** parringsinstruktioner for IKEA/Aqara/Sonoff/Hue; ZBDongle-E-firmwarefilnavn og at ezsp→ember ikke kræver ny parring; om `legacy_api` og `homeassistant_legacy_entity_attributes` stadig findes i 2.x.
- **performance:** listeformatet for `mariadb_server_args`; udelukkelse af `updater`-domænet i recorder.
- **wifi-enheder:** status for Tasmotizer og `esptool.py`; at Shelly Gen1 kun kan bruge enten cloud eller MQTT.
- **node-red:** om community-repositoriet skal tilføjes manuelt, og om omdøbningen "call service" → "action" er dokumenteret.
- **raspberry-pi-installation:** strømforsyningens wattal til Pi 5.
- **vaskemaskine-notification:** advarslen om 16 A / 3680 W modsiger de 2500 W / 2300 W-stikkontakter, der er markeret ✅; stikkenes mærkedata er ikke kontrolleret.
- **shelly-wall-display:** entitetslisten (climate/switch), firmware ≥2.3.0 og HA-dashboardtilstand.
- **sikre-opdateringer-2026:** stien Settings → System → Repairs.
- **proxmox-installation:** note om EFI "pre-enrolled keys".
- **Generelt:** danske UI-navne på de nye Connectivity-/Tools-stier er ikke kontrolleret (engelske navne er brugt), og stien Settings → System → Hardware i Z-Wave-/Z2M-guiderne er ikke genbekræftet.


## Rettelser efter uafhængig gennemgang 2026-11-14

Anvendt (DA og EN, medmindre andet er angivet):

1. raspberry-pi-installation: 20 minutter eller mere ved "Preparing Home Assistant"; 5-minutters-rådet gælder kun, hvis siden slet ikke dukker op; ny sætning om ikke at flashe igen. EN har ingen tilsvarende opsummeringslinje som DA's HowTo-trin, så kun DA's trin er justeret.
2. z-wave: asterisker fjernet i FAQ-svaret om Migrate adapter.
3. mcp-server: tippet om /api/mcp/assist erstattet (individuelle adresser ignorerer indstillingerne og er aldrig read-only).
4. shelly-wall-display: Kiosk Mode via Settings → Marketplace (DA: Indstillinger → Marketplace). Det gamle trin 4 ("Søg efter Kiosk Mode og installer") var nu dobbelt og er fjernet, så de tre nye trin erstatter de gamle trin 1-4; resten er omnummereret.
5. z-wave: Long Range kræver en adapter, der understøtter det (f.eks. ZWA-2).
6. zigbee2mqtt-avanceret: homeassistant_legacy_entity_attributes og legacy_api slettet, samt den nu tomme kommentar "# Home Assistant".
7. node-red: color_temp 350 → color_temp_kelvin 2850.
8. wifi-enheder: OTA-eksemplet uden password-linje. Ingen sætning forklarede adgangskoden, så der er ikke tilføjet en ny sætning om API-krypteringsnøglen.
9. vaskemaskine-notification: Shelly Plug S → 2300W (10 A) med ⚠️; Frient Smart Plug Mini → 2300W (10 A) med ⚠️ (kun i DA, EN-siden har ikke rækken); Zigbee-modellen omdøbt NOUS A1T → NOUS A1Z i både tabel og eksempellisten. Tabellen stod med 2500W/✅ for Shelly Plug S, ikke med den ordlyd, punktet beskrev; det er rettet efter punktets hensigt.
10. Danske menustier: Indstillinger → … i infraroed-proxy, radiofrekvens-proxy, mobilnotifikationer, robotstoevsuger-efter-omraade, thread-matter, zha-enhedshaandtering; performance: Værktøjer → Tools; local-voice-assist: Speech-to-Phrases liste; z-wave: "efter, at den er tændt".
11. proxmox-installation: ingen disk cache i standardtilstand; writethrough kun forvalgt i avanceret tilstand.
12. kom-godt-i-gang: Home Assistant Link-sætning føjet til FAQ-svaret om prisen på Nabu Casa.

Sprunget over: ingen.
