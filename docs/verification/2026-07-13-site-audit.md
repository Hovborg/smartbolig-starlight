# Fuldt site-audit og fejlrettelser — 13. juli 2026

Komplet audit af alle 282 indholdsfiler (141 DA + 141 EN) plus scripts,
komponenter og headers. 12 parallelle audit-agenter afdækkede 500 fund
(33 high, 194 medium, 273 low); alle high-fund er adresseret i denne
commit-serie sammen med de vigtigste medium-fund. Det fulde fund-datasæt
er arkiveret i sessionens scratchpad (audit-findings.json).

## Rettet

### Faktuelle og tekniske fejl (begge sprog)
- IKEA TRETAKT og Sonoff S31 Lite ZB anbefalet som strømmålende stik —
  ingen af dem har måling; erstattet med IKEA INSPELNING.
- Tasmota `SetOption19 1` deaktiverer den officielle integration, guiden
  installerede bagefter; rettet til `SetOption19 0`.
- performance-guidens "deaktiver features"-YAML aktiverede i stedet
  integrationerne (og `discovery` findes ikke længere); sektion omskrevet.
- Opdigtet Zigbee2MQTT-option `network_key_distribute` fjernet.
- Vaskemaskine-automationens "simple version" kunne aldrig affyre
  (trigger <5W samtidig med condition >10W); bruger nu triggerens
  krydsnings-semantik.
- HA Voice PE har intet E-ink display (LED-ring/drejeknap), Aqara FP2
  har multi-person tracking (op til 5), PoolSense er ikke eneste
  native-integrerede poolmonitor (Ondilo ICO), forkerte HA-menustier
  (Hjælpere, 2FA), ugyldig `brightness_pct` i scenes.yaml.

### AI-sporbarhed
- Korrumperet Firefox-URL med bogstavelige "LLM"-fragmenter i
  cookiepolitikken (dødt link) erstattet med verificeret URL.
- Lækket personlig assistent-kontekst i better-thermostat ("Baseret på
  din Home Assistant har du allerede...") omskrevet til generisk eksempel.
- Byte-identiske nyhedsdage (05-17/05-18 = 05-16; 06-07 = 06-06) mærket
  ærligt som gentagelses-udgaver i stedet for "dagens stærkeste signaler".
- Maskinoversættelses-artefakter: "Foretruk"→"Foretræk", splittede
  kompositums (Ferietilstand, gæstenetværk, temperaturgrænser m.fl.),
  "Alle tre" på en fire-værktøjs-side, dubleret H1 på om-os/kontakt,
  "CVR: Afventer registrering"-pladsholder og filler-afslutninger fjernet.

### DA/EN-paritet (EN-siderne var ældre, strukturelt andre dokumenter)
Genopbygget som spejl af DA: home-assistant/kom-godt-i-gang (inkl.
arkitekturdiagram via arkitektur-en.svg), proxmox-installation,
better-thermostat, elpris-integration (nu EDS-baseret som DA),
esp32/index, esp32/temperatur-sensor, juridisk/cookiepolitik og
juridisk/privatlivspolitik (inkl. GDPR-krævede afsnit: opbevaring,
børns privatliv, ændringer, klageret til Datatilsynet).

### Bugs og performance
- Fire SVG-diagrammer med uescapede XML-tegn (`&`, `<`) renderede som
  brudte billeder på kom-godt-i-gang og vaskemaskine-notification;
  repareret og alle 77 SVG'er validerer nu. Korrupt 6-byte og-image.svg
  slettet (sitet bruger og-image.png).
- Forsidens nyhedsliste hentede 1,5 MB hero-PNG'er til 160×90-thumbs;
  nyt idempotent `scripts/ai-news-thumbs.mjs` genererer 5-16 KB
  WebP-thumbs som første build-trin (~99 % mindre billeddata).

## Verifikation
- `npm run build`: 283 sider, grøn (thumbs-trin kørt, idempotent)
- `npm run site:test`: 25/25 · `npm run ai-news:test`: 23/23
- `npm run seo:validate`: bestået
- Intern linkcheck over alle 283 byggede sider: 0 brudte links
- Alle markdown-billedreferencer verificeret mod public/
- Visuel browser-verifikation (Playwright): forside DA/EN, thumbs,
  arkitekturdiagram DA/EN, vaskemaskine-diagram, EN kom-godt-i-gang
- npm audit: 4 low (esbuild dev-server, GHSA-g7r4-m6w7-qqqr via
  astro-kæden) — rammer kun dev-serveren, ikke det statiske site.
  Ingen secrets i repoet; CSP og security headers på plads;
  AI-news-pipelinen er injection-hærdet (safeText/safeUrl).

## Kendt efterslæb (bevidst ikke rørt)
- De ~55 arkiverede AI-nyhedsartikler er genereret med den gamle
  skabelon (ens sætningsstempler). Pipelinen (renderIssue v2 med
  fingerprint-dedup) løser det for fremtidige udgaver; en regenerering
  af arkivet kræver kildedata pr. dato.
- Emoji-overskrifter på ældre sider (om-os, sikkerhed, esp32- og
  HA-guides) er et AI-mønster, men fjernelse ændrer anchor-slugs og
  bør laves som samlet migrering med linkkontrol.
- og:image-varianterne (1x1/4x3/16x9, ~381 MB) bruges kun af sociale
  crawlere; kan komprimeres i en opfølgning.
- ~200 low-fund (sprognuancer, stil) er dokumenteret i audit-datasættet.
