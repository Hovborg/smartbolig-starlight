# SmartBolig.net: baseline "før" redesign (2026-11-13)

Målt 2026-11-13 (kl. ca. 21:00-21:30 lokal tid) mod den offentlige produktion på https://smartbolig.net. Der er kun hentet offentlige URL'er. Intet i repoet er rettet eller committet.

## Værktøjer

| Værktøj | Version |
|---|---|
| Lighthouse | 13.6.0 (npm, installeret med eksakt version i en midlertidig mappe uden for repoet; seneste stabile pr. `npm view lighthouse dist-tags` den dag) |
| Chrome (headless) | 158.0.8127.18, UA `HeadlessChrome/158.0.0.0` |
| Node / npm | 24.22.1 / 11.19.1 |
| puppeteer-core | den version Lighthouse 13.6.0 afhænger af (kun brugt til mobil-skærmbilleder) |
| curl | 8.22.0 (Windows, Schannel) |
| Vært | Windows 11 Pro, PowerShell 7 |

## Præcise kommandoer

```powershell
# Installation (i en midlertidig mappe)
npm init -y
npm install lighthouse@13.6.0 --save-exact

# Lighthouse, pr. URL (mobil = standardpræset, desktop = --preset=desktop); én kørsel pr. URL og formfaktor
lighthouse <URL> --output=json --output-path=lighthouse/<side>-mobile.json --quiet `
  --chrome-flags="--headless=new --no-sandbox --disable-gpu"
lighthouse <URL> --output=json --output-path=lighthouse/<side>-desktop.json --quiet `
  --chrome-flags="--headless=new --no-sandbox --disable-gpu" --preset=desktop

# Svar-headers
curl.exe -sI --max-time 30 https://smartbolig.net/da/ > headers/da-forside.txt
# (tilsvarende for /da/home-assistant/dashboard-design/, /api/chat, /robots.txt, /ads.txt, /llms.txt, /.well-known/security.txt)

# Feltdata
curl.exe -s "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=<URL>&strategy=mobile&category=performance"

# Skærmbilleder, desktop (1440x900) med Chrome CLI
chrome.exe --headless=new --disable-gpu --no-sandbox --hide-scrollbars --virtual-time-budget=15000 `
  --window-size=1440,900 --screenshot=screenshots/<side>-desktop-1440x900.png <URL>
# Skærmbilleder, mobil (390x844): puppeteer-core, headless, setViewport({width:390,height:844,isMobile:true,hasTouch:true}),
# goto(waitUntil:'networkidle2'), screenshot (se afvigelsen nedenfor)
```

Alle 16 kørsler gav en gyldig rapport uden ``runtimeError``. Kørselsscriptet gentog en kørsel højst én gang, hvis rapportfilen manglede; om det skete for en enkelt kørsel er ikke logget. Hver URL og formfaktor er målt én gang. Lighthouse-score svinger typisk nogle point mellem kørsler; enkeltmålinger bør ikke læses som præcise.

## Målte URL'er (fra sitemap-0.xml, nået via sitemap-index.xml)

| Rolle | URL |
|---|---|
| Dansk forside | https://smartbolig.net/da/ |
| Engelsk forside | https://smartbolig.net/en/ |
| Home Assistant-guide | https://smartbolig.net/da/home-assistant/dashboard-design/ |
| ESP32-guide | https://smartbolig.net/da/esp32/ld2410-mmwave/ |
| Produktside | https://smartbolig.net/da/produkter/smart-belysning/ |
| AI-nyhedsoversigt | https://smartbolig.net/da/ai/nyheder/ |
| AI-nyhedsartikel | https://smartbolig.net/da/ai/nyheder/2026-09-10/ (nyeste dato i sitemap) |
| Juridisk (privatliv) | https://smartbolig.net/da/juridisk/privatlivspolitik/ |

`https://smartbolig.net/` svarer 301 til `/da/`.

## VIGTIGT forbehold: tredjepartsscripts blev blokeret af netværket under målingen

Målemaskinens lokale netværks-DNS returnerer NXDOMAIN for en række annonce- og analyse-domæner (bekræftet med `Resolve-DnsName`, også når 1.1.1.1, 8.8.8.8 og 9.9.9.9 blev spurgt direkte, så trafikken ser ud til at blive opfanget). I alle 16 Lighthouse-rapporter fejlede derfor disse anmodninger med `net::ERR_NAME_NOT_RESOLVED`:

- `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js` (AdSense)
- `https://static.cloudflareinsights.com/beacon.min.js/...` (Cloudflare Web Analytics)
- `https://region1.google-analytics.com/g/collect` (GA4-kald; selve `gtag/js` fra googletagmanager.com blev hentet)

Konsekvens: score, vægt, request-antal og TBT herunder viser siden UDEN annoncescriptet (og det, det plejer at trække ind), og "Best Practices" er trykket af disse konsolfejl. Produktionens reelle ydeevne for besøgende uden blokering er sandsynligvis dårligere end tallene her. Dette er IKKE omgået (ingen DoH/hosts-tricks). Ikke målt: sidens ydeevne med annoncer og Cloudflare-beacon indlæst; gentag fra et netværk uden DNS-filter (eller i CI) før en endelig før/efter-sammenligning.

Øvrige målebetingelser: Lighthouse mobil bruger standardemuleringen (Moto G Power, simuleret langsom 4G, 4x CPU-nedsættelse); desktop bruger `--preset=desktop`. "Overført" er Lighthouse' `total-byte-weight`; "Requests" er antal poster i `network-requests` (inkl. de blokerede).

## Resultater pr. URL og formfaktor

### da-forside

https://smartbolig.net/da/

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 97 | 100 | 96 | 100 | 2.3 s | 0 | 110 ms | 1.5 s | 429 KiB | 21 |
| desktop | 100 | 100 | 96 | 100 | 0.5 s | 0.003 | 0 ms | 0.5 s | 580 KiB | 22 |

### en-forside

https://smartbolig.net/en/

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 98 | 100 | 96 | 100 | 2.3 s | 0 | 80 ms | 1.5 s | 428 KiB | 21 |
| desktop | 100 | 100 | 96 | 100 | 0.5 s | 0.041 | 0 ms | 0.5 s | 580 KiB | 22 |

### ha-guide

https://smartbolig.net/da/home-assistant/dashboard-design/

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 96 | 100 | 92 | 100 | 2.1 s | 0 | 210 ms | 1.3 s | 507 KiB | 43 |
| desktop | 100 | 100 | 92 | 100 | 0.6 s | 0.014 | 0 ms | 0.5 s | 507 KiB | 42 |

### esp32-guide

https://smartbolig.net/da/esp32/ld2410-mmwave/

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 98 | 100 | 92 | 100 | 2.4 s | 0 | 50 ms | 1.5 s | 509 KiB | 44 |
| desktop | 100 | 100 | 92 | 100 | 0.6 s | 0.014 | 10 ms | 0.5 s | 511 KiB | 44 |

### produkt

https://smartbolig.net/da/produkter/smart-belysning/

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 100 | 97 | 92 | 100 | 1.1 s | 0 | 80 ms | 1.5 s | 508 KiB | 44 |
| desktop | 89 | 97 | 92 | 100 | 0.6 s | 0.229 | 0 ms | 0.5 s | 508 KiB | 42 |

### ai-nyheder

https://smartbolig.net/da/ai/nyheder/

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 99 | 100 | 96 | 100 | 2.0 s | 0 | 20 ms | 1.1 s | 340 KiB | 21 |
| desktop | 100 | 100 | 96 | 100 | 0.5 s | 0.043 | 0 ms | 0.4 s | 340 KiB | 20 |

### ai-artikel

https://smartbolig.net/da/ai/nyheder/2026-09-10/

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 100 | 96 | 92 | 100 | 1.4 s | 0 | 10 ms | 1.4 s | 502 KiB | 40 |
| desktop | 100 | 96 | 92 | 100 | 0.6 s | 0.002 | 0 ms | 0.5 s | 503 KiB | 39 |

### privatliv

https://smartbolig.net/da/juridisk/privatlivspolitik/

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 99 | 100 | 96 | 100 | 2.0 s | 0 | 40 ms | 1.1 s | 377 KiB | 20 |
| desktop | 100 | 100 | 96 | 100 | 0.3 s | 0.001 | 0 ms | 0.4 s | 377 KiB | 19 |

Overblik: Performance 96-100 på alle sider undtagen produktsiden på desktop (89, CLS 0,229) og AI-nyhedsoversigten på mobil (99). Accessibility 96-100, Best Practices 92-96, SEO 100 overalt. Disse høje tal er målt uden annoncescriptet (se forbeholdet).

## Feltdata (CrUX / Core Web Vitals)

Ikke målt: PageSpeed Insights API afviste begge kald uden nøgle (`https://smartbolig.net/` for origin og `https://smartbolig.net/da/` for forsiden, strategy=mobile) med HTTP 429, `RESOURCE_EXHAUSTED`, `Queries per day` med `quota_limit_value: "0"` (`defaultPerDayPerProject`) for den delte projektkvote. Der er forsøgt to gange for origin; svaret er gemt i `psi-origin.json` og `psi-da-forside.json`. Der foreligger derfor ingen CrUX-data; det siger intet om, hvorvidt sitet har eller mangler feltdata, eller om de er gode eller dårlige. Næste skridt: PSI-API med egen nøgle, eller CrUX-API / Search Console.

## Header-fund (`headers/*.txt`)

Alle syv svar nedenfor er hentet med `curl.exe -sI` (HEAD). Cloudflare `Report-To`-endpoint-tokens er erstattet med `<redacted>` i de gemte filer.

| Sti | Status | Bemærkning |
|---|---|---|
| `/da/` | 200 | fuld sikkerhedsheader-pakke, `Cache-Control: public, max-age=0, must-revalidate` |
| `/da/home-assistant/dashboard-design/` | 200 | samme headers |
| `/api/chat` | 405 | `Allow: POST`, `Cache-Control: no-store`, `referrer-policy: no-referrer`, `x-content-type-options: nosniff`; GET giver også 405. Ingen CSP/HSTS-headers på dette svar |
| `/robots.txt` | 200 | samme headers som siderne |
| `/ads.txt` | 200 | samme |
| `/llms.txt` | 200 | samme |
| `/.well-known/security.txt` | 200 | samme |

Øvrige fund:

- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`, `x-content-type-options: nosniff`, `x-frame-options: SAMEORIGIN`, `cross-origin-opener-policy: same-origin`, `cross-origin-resource-policy: same-site`, `referrer-policy: strict-origin-when-cross-origin`, `permissions-policy` (accelerometer, camera, geolocation, gyroscope, magnetometer, microphone, payment, usb slået fra).
- Hashede `/_astro/*`-aktiver (testet på `index.7UJVBSu6.css`) og billeder (testet på en AVIF) leveres med `Cache-Control: public, max-age=0, must-revalidate` (ingen langtidscache/`immutable`).
- `script-src` indeholder `'unsafe-inline'`: JA (samt `'wasm-unsafe-eval'`). `style-src` indeholder også `'unsafe-inline'`. Der er hverken nonce eller hash i headeren. `script-src-attr 'none'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'`.
- CSP (ordret fra `/da/`; identisk på de øvrige statiske svar):

```text
default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://static.cloudflareinsights.com https://www.googletagmanager.com https://www.google-analytics.com https://cdn.ezoic.net https://pagead2.googlesyndication.com https://fundingchoicesmessages.google.com https://www.googleadservices.com https://adservice.google.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://tpc.googlesyndication.com https://*.googlesyndication.com https://giscus.app; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https://cloudflareinsights.com https://www.google-analytics.com https://region1.google-analytics.com https://analytics.google.com https://*.ezoic.net https://*.googlesyndication.com https://pagead2.googlesyndication.com https://fundingchoicesmessages.google.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://giscus.app; frame-src 'self' https://fundingchoicesmessages.google.com https://www.google.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://*.googlesyndication.com https://ep2.adtrafficquality.google https://giscus.app; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; script-src-attr 'none'; worker-src 'self' blob:;
```

- CSP-fund fra Lighthouse: `style-src` tillader ikke `https://giscus.app`, så Chrome blokerer `https://giscus.app/default.css` (giscus-kommentarfeltet) på de 4 sidetyper med giscus; det vises som "Issues"-fejl i Lighthouse (8 af 16 kørsler).

## Skærmbilleder (`screenshots/`)

Forside, HA-guide, produktside og nyhedsoversigt i 1440x900 (`*-desktop-1440x900.png`) og 390x844 (`*-mobil-390x844.png`); alle fra de danske URL'er ovenfor. Der er ingen vandret overflow på mobil (`scrollWidth` = 390 på alle fire).

Afvigelse fra den bestilte metode: Chrome CLI's `--headless=new --window-size=390,844 --screenshot` gav et beskåret billede (siden blev lagt ud i et bredere layout end 390 px, så højre side blev klippet). De fire mobilbilleder er derfor taget om med puppeteer-core og rigtig mobil-viewport-emulering (samme headless Chrome); desktopbillederne er taget med Chrome CLI som bestilt. Billederne er taget uden annoncescriptet (se forbeholdet).

## Top 10 Lighthouse-problemer på tværs af sider

Rangeret efter antal af de 16 kørsler (8 sider x mobil/desktop), hvor auditten ikke er bestået. "Insight"-audits (render-blocking, cache osv.) kan have 0 ms målt besparelse på desktop og tæller her alligevel, når Lighthouse markerer dem.

| # | Problem | Rammer | Detalje |
|---|---|---|---|
| 1 | Ubrugt JavaScript (`unused-javascript`) | alle 8 sider, begge formfaktorer (16/16) | `googletagmanager.com/gtag/js?id=G-…`: ca. 74-77 KiB ubrugt af ca. 187 KiB |
| 2 | Renderblokerende CSS (`render-blocking-insight`) | alle 8 sider, begge (16/16) | `/_astro/index.*.css` (ca. 32 KB), desuden `HomeStyles.*.css` (forsider) og `AiNewsFeed.*.css` (nyhedsoversigt); op til ca. 120 ms estimeret besparelse på mobil |
| 3 | Konsolfejl (`errors-in-console`) | alle 8 sider, begge (16/16) | Blokerede annonce-/analyse-anmodninger (netværksfilter, se forbeholdet) og på guide/artikel/produkt desuden CSP-blokering af `giscus.app/default.css` |
| 4 | Synligt label matcher ikke tilgængeligt navn (`label-content-name-mismatch`) | alle 8 sider, begge (16/16) | `button.smartbolig-ai__launcher`: `aria-label="Spørg SmartBolig AI"` indeholder ikke den synlige tekst "SMARTBOLIG AI / Spørg AI" |
| 5 | Cache-levetider (`cache-insight`) | HA-guide, ESP32-guide, produkt, AI-artikel, begge formfaktorer (8/16) | Tredjeparts-GIF `github.githubassets.com/images/mona-loading-dark.gif` (ca. 18 KiB) uden effektiv cache (giscus-kommentarfelt). Sitets egne aktiver har `max-age=0` (se headers), men Lighthouse markerer dem ikke her |
| 6 | CSP-problem i DevTools "Issues" (`inspector-issues`) | HA-guide, ESP32-guide, produkt, AI-artikel, begge (8/16) | `style-src` blokerer `https://giscus.app/default.css` |
| 7 | Billedlevering (`image-delivery-insight`) | DA-forside og EN-forside (begge formfaktorer), AI-artikel (begge) (6/16) | Forside desktop: `/images/produkter/zigbee-koordinatorer/hero.jpg` ca. 118 KiB + hero-AVIF ca. 13 KiB; forside mobil: `smart-home-editorial-960.avif` ca. 20 KiB; artikel: `/images/ai-news/2026-09-10.jpg` ca. 34-36 KiB |
| 8 | Utilstrækkelig farvekontrast (`color-contrast`) | AI-artikel og produktside, begge formfaktorer (4/16) | `p.starlight-aside__title` i tip-boksen; trækker Accessibility til 96-97 |
| 9 | LCP-anmodning kunne opdages tidligere (`lcp-discovery-insight`) | ESP32-guide (begge), AI-artikel desktop (3/16) | `fetchpriority=high` er ikke sat på LCP-billedet |
| 10 | Tung hovedtråd / layout (`mainthread-work-breakdown`) | ESP32-guide, HA-guide og produkt på mobil (3/16) | 2,0-2,6 s hovedtrådsarbejde, mest Style & Layout (ca. 0,9-1,0 s); TBT op til 210 ms (HA-guide mobil) |

Enkeltfund uden for top 10: CLS 0,229 på produktsiden på desktop (`aside.starlight-aside` "Top Anbefalinger 2025" flytter sig, når webfonts `inter` og `jetbrains-mono` loades; ikke gentaget på mobil, dvs. kan være variation i én måling); billeder uden bredde/højde (`/images/guides/ld2410-mmwave/overview.svg`, ESP32-guiden); forced reflow på HA-guide desktop og produkt mobil; `agent-accessibility-tree` ikke bestået på 2 kørsler.

## Filer

- `lighthouse/<side>-<mobile|desktop>.json`: de 16 fulde Lighthouse-rapporter (JSON).
- `headers/`: svar-headers.
- `screenshots/`: 8 PNG'er.
- `psi-origin.json`, `psi-da-forside.json`: PSI-API's fejlsvar (429).

