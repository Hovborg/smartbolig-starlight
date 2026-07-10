# Four-guide series design

Date: 2026-07-11  
Status: Approved direction; written-spec review pending

## Outcome

Publish four durable, practical guide tracks in both Danish and English:

1. Matter and Thread in Home Assistant 2026
2. Fully local Home Assistant Assist
3. ESPHome Bluetooth Proxy
4. Home Assistant Energy Dashboard

The Energy guide is international. It must not be framed as Denmark-only.
Country-specific tariffs or integrations may appear only as clearly optional
examples and must not be prerequisites for the main workflow.

## Editorial contract

Each guide must:

- solve one complete user journey rather than list features;
- use official Home Assistant, Open Home Foundation, ESPHome, and standards
  documentation as the primary technical sources;
- distinguish required steps, optional choices, and troubleshooting;
- state hardware, software, network, and account prerequisites before setup;
- include a verification checkpoint after every material setup phase;
- explain safe rollback or recovery where a change can disrupt an existing
  installation;
- avoid invented compatibility, performance, privacy, or security claims;
- keep commands and YAML directly pasteable and pass the content audit;
- link to related SmartBolig guides without duplicating them;
- ship in matching Danish and English files with equivalent structure and
  technical meaning;
- include concise descriptions, useful headings, canonical locale routes, and
  no date in the title unless the date is essential to distinguish a migration.

## Guide 1: Matter and Thread in Home Assistant

### Content action

Replace the existing Danish and English `thread-matter.mdx` guides with a
current guide. Preserve their canonical URLs.

### Required coverage

- Matter versus Thread, Wi-Fi, Bluetooth commissioning, and border routers
- supported Home Assistant installation types and prerequisites
- Matter Server app 9 and its matter.js architecture
- automatic migration from the previous Matter server, including backup and
  validation before and after the first start
- Matter 1.5.1 and Thread 1.4 as currently documented, without promising
  unsupported device classes
- adding a new device and sharing an existing Apple/Google/Amazon fabric
- multi-admin/fabric behavior and safe removal
- Matter bridges versus native Matter devices
- Thread/Wi-Fi network visualization and signal interpretation
- troubleshooting commissioning, IPv6/mDNS, credentials, border routers,
  certificates, stale fabrics, and unavailable devices
- a decision section explaining when Zigbee or Z-Wave remains the better fit

### Primary sources

- Home Assistant Matter integration documentation
- Home Assistant's 2026 matter.js/Matter Server announcement
- official Thread and Matter documentation linked by Home Assistant

## Guide 2: Fully local Home Assistant Assist

### New routes

- `/da/home-assistant/lokal-stemmestyring-assist/`
- `/en/home-assistant/local-voice-assist/`

### Required coverage

- what Assist is and what “fully local” does and does not mean
- local pipeline: wake word/input, Speech-to-Phrase or Whisper, intent
  handling, Piper, and playback
- supported installation prerequisites and realistic hardware expectations
- first test in the Companion app before adding dedicated hardware
- exposing only the necessary entities, naming, aliases, areas, and supported
  language behavior
- Home Assistant Voice hardware, ESPHome voice satellites, and the distinction
  between local processing and Home Assistant Cloud
- Danish setup details in the Danish guide while keeping the English guide
  language-neutral
- verification of listening, transcription, intent, action, and response as
  separate pipeline stages
- troubleshooting latency, incorrect entity selection, wake-word failures,
  microphone/audio problems, and resource limits
- privacy and network-boundary explanation without claiming every optional
  integration is local

### Primary sources

- Home Assistant Assist documentation
- Home Assistant fully local voice setup
- ESPHome voice assistant documentation

## Guide 3: ESPHome Bluetooth Proxy

### New routes

- `/da/esp32/bluetooth-proxy/`
- `/en/esp32/bluetooth-proxy/`

### Required coverage

- BLE proxy architecture and the difference between passive advertisements and
  active GATT connections
- when a proxy helps and when it cannot add support for an unknown BLE device
- ready-made WebSerial installation and manual ESPHome YAML paths
- Wi-Fi versus Ethernet/PoE hardware trade-offs
- ESP-IDF, API, OTA, BLE tracker, active proxy, service cache, and connection
  slot configuration using current official defaults
- safe migration/serial recovery considerations for older partition layouts
- placement, interference, RSSI, multiple proxies, and Home Assistant adapter
  selection
- resource conflicts with web server, voice/audio, and excessive active slots
- verification in ESPHome logs and Home Assistant Bluetooth diagnostics
- troubleshooting unavailable devices, connection exhaustion, Wi-Fi
  instability, memory resets, unsupported devices, and poor placement

### Primary sources

- ESPHome Bluetooth Proxy documentation
- ESPHome ready-made projects
- Home Assistant Bluetooth documentation where required

## Guide 4: Home Assistant Energy Dashboard

### New routes

- `/da/home-assistant/energy-dashboard/`
- `/en/home-assistant/energy-dashboard/`

### Scope rule

The main workflow must work conceptually in any country. It covers entities and
measurement semantics, not one national tariff provider. Optional examples may
show how a regional price integration supplies compatible entities, but the
guide must direct readers to the integration available in their region.

### Required coverage

- the difference between power, energy, cumulative totals, prices, and costs
- accepted units, device/state classes, statistics, and why long-term
  statistics matter
- grid import/export, solar production, battery charge/discharge, gas, water,
  individual devices, and EV charging as independent optional layers
- configuring the dashboard incrementally, beginning with grid consumption
- converting a compatible instantaneous power sensor to energy only where the
  official Riemann sum/integration method is appropriate
- utility meters and tariff periods without hard-coding a country
- naming multiple sources clearly
- validation against meter readings and handling resets, unavailable values,
  negative values, duplicate counting, wrong units, and missing statistics
- privacy/locality caveats for cloud-backed meters and inverter integrations
- practical automations only after the measurements are trustworthy

### Primary sources

- Home Assistant Energy documentation
- official Home Assistant integrations used only as examples
- current Home Assistant release notes for Energy Dashboard behavior

## Information architecture

- Add new guides to the existing Home Assistant and ESP32 sidebar groups in
  both locales through translated labels.
- Keep Matter/Thread at its existing canonical route.
- Link the four guides from relevant overview pages and from each other only
  where the next step is genuinely useful.
- Do not add another homepage section. At most, replace existing recommended
  guide cards where the new guide is a better entry point.
- Preserve all AI-news content, images, scripts, and append-only automation
  boundaries.

## Verification

Completion requires:

- matching Danish and English guide structures and routes;
- all internal links and referenced assets present;
- `npm run site:test`;
- `npm run ai-news:test`;
- `npm run ai-news:validate`;
- `python3 scripts/content-audit.py`;
- `npm audit --omit=dev --audit-level=high`;
- `npm run build`;
- `npm run seo:validate`;
- browser checks at desktop and mobile widths for all eight guide pages;
- search-index checks for Matter, local voice, Bluetooth proxy, and Energy;
- a protected-path diff proving no unintended AI-news content or image change;
- PR checks, merge to `main`, successful Cloudflare deployment, and live route
  verification.

## Non-goals

- product reviews, affiliate recommendations, or country-specific buying lists
- unsupported custom integrations presented as required
- exhaustive coverage of every Matter device class or energy provider
- rewriting unrelated product-category guides
- changing the daily AI-news generation or publishing pipeline
