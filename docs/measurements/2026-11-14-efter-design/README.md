# SmartBolig.net: måling "efter" nyt design (2026-11-14)

Målt natten til 2026-11-14 (kl. ca. 02:20-02:30 lokal tid) mod den offentlige produktion på https://smartbolig.net, efter at det nye design blev udgivet (Worker-version 13bb8557, commit 143eefc på `main`). Målingen gentager baselinen i `../2026-11-13-baseline/README.md` med samme værktøjer, samme URL'er og samme metode, så tallene kan sammenlignes direkte. Der er kun hentet offentlige URL'er. Intet i repoet uden for denne mappe er rettet.

Hvilken Worker-version der svarede, er ikke aflæst udefra. At det nye design er live, er kun påvist indirekte: svar-headerne har en ny CSP (se nedenfor), og siderne henviser til andre CSS-filer (`/_astro/index.BJh1GOaq.css`, `HomeStyles.BiJt6_cn.css`) end dem, baselinen målte. Ikke verificeret: præcis udgivet versions-ID.

## Værktøjer

| Værktøj | Version |
|---|---|
| Lighthouse | 13.6.0 (npm, installeret med `--save-exact` i en midlertidig mappe uden for repoet; samme version som baselinen) |
| Chrome (headless) | 158.0.8127.18, UA `HeadlessChrome/158.0.0.0` (samme som baselinen) |
| Node / npm | 24.22.1 / 11.19.1 (samme som baselinen) |
| curl | 8.22.0 (Windows, Schannel) |
| Vært | Windows 11 Pro, PowerShell 7 |

## Præcise kommandoer

Identiske med baselinen (se dens README), bortset fra at der ikke er taget skærmbilleder (se "Skærmbilleder" nedenfor):

```powershell
# Installation (i en midlertidig mappe, <midlertidig mappe>)
npm init -y
npm install lighthouse@13.6.0 --save-exact

# Lighthouse, pr. URL (mobil = standardpræset, desktop = --preset=desktop); én kørsel pr. URL og formfaktor
lighthouse <URL> --output=json --output-path=<midlertidig mappe>/out/<side>-mobile.json --quiet `
  --chrome-flags="--headless=new --no-sandbox --disable-gpu"
lighthouse <URL> --output=json --output-path=<midlertidig mappe>/out/<side>-desktop.json --quiet `
  --chrome-flags="--headless=new --no-sandbox --disable-gpu" --preset=desktop

# Svar-headers
curl.exe -sI --max-time 30 https://smartbolig.net/da/ > headers/da-forside.txt
# (tilsvarende for /da/home-assistant/dashboard-design/ -> guide.txt, /api/chat, /robots.txt, /ads.txt, /llms.txt, /.well-known/security.txt)

# Feltdata
curl.exe -s "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=<URL>&strategy=mobile&category=performance"
```

Alle 16 kørsler gav en gyldig rapport uden `runtimeError`. Kørselsscriptet var indrettet til at gentage en kørsel højst én gang, hvis rapportfilen manglede; ingen kørsel måtte gentages (loggen har ingen andet forsøg). Hver URL og formfaktor er målt én gang. Lighthouse-score svinger typisk nogle point mellem kørsler; enkeltmålinger bør ikke læses som præcise. Lighthouse-JSON-filerne er, som i baselinen, ikke gemt i repoet; tallene herunder er udtrukket af dem.

## Målte URL'er

De samme otte URL'er som baselinen. Nyhedsartiklen er den samme side som før (`/da/ai/nyheder/2026-09-10/`), så før og efter er samme indhold, selv om der siden er kommet nyere artikler.

| Rolle | URL |
|---|---|
| Dansk forside | https://smartbolig.net/da/ |
| Engelsk forside | https://smartbolig.net/en/ |
| Home Assistant-guide | https://smartbolig.net/da/home-assistant/dashboard-design/ |
| ESP32-guide | https://smartbolig.net/da/esp32/ld2410-mmwave/ |
| Produktside | https://smartbolig.net/da/produkter/smart-belysning/ |
| AI-nyhedsoversigt | https://smartbolig.net/da/ai/nyheder/ |
| AI-nyhedsartikel | https://smartbolig.net/da/ai/nyheder/2026-09-10/ |
| Juridisk (privatliv) | https://smartbolig.net/da/juridisk/privatlivspolitik/ |

## VIGTIGT forbehold: tredjepartsscripts er stadig blokeret af netværket

Samme forbehold som i baselinen gælder uændret. Målemaskinens lokale netværks-DNS returnerer stadig NXDOMAIN for annonce- og analysedomænerne (kontrolleret med `Resolve-DnsName` før kørslerne: `pagead2.googlesyndication.com`, `static.cloudflareinsights.com` og `region1.google-analytics.com` giver "DNS name does not exist", mens `www.googletagmanager.com` opløses). I alle 16 rapporter fejler derfor de samme tre anmodninger med `net::ERR_NAME_NOT_RESOLVED`:

- `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js` (AdSense)
- `https://static.cloudflareinsights.com/beacon.min.js/...` (Cloudflare Web Analytics)
- `https://region1.google-analytics.com/g/collect` (GA4-kald; `gtag/js` fra googletagmanager.com hentes)

Konsekvens: som i baselinen viser score, vægt, request-antal og TBT siden UDEN annoncescriptet og det, det plejer at trække ind, og "Best Practices" er trykket af disse konsolfejl (96 på sider uden andre fund). Det gør før og efter sammenlignelige indbyrdes (begge uden annoncer), men ingen af dem viser, hvordan siden opfører sig for besøgende uden filter. Dette er IKKE omgået. Ikke målt: ydeevne med annoncer og Cloudflare-beacon indlæst; gentag fra et netværk uden DNS-filter (eller i CI), før der drages konklusioner om det nye designs reelle ydeevne for besøgende.

Øvrige målebetingelser er som i baselinen: Lighthouse mobil bruger standardemuleringen (Moto G Power, simuleret langsom 4G, 4x CPU-nedsættelse); desktop bruger `--preset=desktop`. "Overført" er `total-byte-weight`; "Requests" er antal poster i `network-requests` (inkl. de blokerede). Én forskel i måleomgivelserne: baselinen er målt om aftenen (kl. ca. 21), denne måling om natten; baselinens svar kom fra Cloudflares cache (`CF-Cache-Status: HIT`), og det gør svarene nu også.

## Resultater pr. URL og formfaktor

### da-forside

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 100 | 100 | 96 | 100 | 1.1 s | 0 | 54 ms | 1.5 s | 372 KiB | 20 |
| desktop | 100 | 100 | 96 | 100 | 0.3 s | 0 | 0 ms | 0.5 s | 535 KiB | 21 |

### en-forside

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 100 | 100 | 96 | 100 | 1.1 s | 0 | 44 ms | 1.5 s | 372 KiB | 20 |
| desktop | 100 | 100 | 96 | 100 | 0.3 s | 0 | 0 ms | 0.5 s | 534 KiB | 21 |

### ha-guide

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 100 | 100 | 96 | 100 | 1.2 s | 0 | 11 ms | 1.2 s | 470 KiB | 42 |
| desktop | 100 | 100 | 96 | 100 | 0.3 s | 0 | 0 ms | 0.5 s | 470 KiB | 41 |

### esp32-guide

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 99 | 100 | 96 | 100 | 2.1 s | 0 | 39 ms | 1.3 s | 476 KiB | 43 |
| desktop | 100 | 100 | 96 | 100 | 0.5 s | 0 | 0 ms | 0.5 s | 481 KiB | 42 |

### produkt

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 99 | 100 | 96 | 100 | 2.1 s | 0 | 18 ms | 1.1 s | 470 KiB | 42 |
| desktop | 100 | 100 | 96 | 100 | 0.3 s | 0 | 0 ms | 0.4 s | 470 KiB | 41 |

### ai-nyheder

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 99 | 100 | 96 | 100 | 2.1 s | 0 | 16 ms | 1.1 s | 344 KiB | 21 |
| desktop | 100 | 100 | 96 | 100 | 0.3 s | 0 | 0 ms | 0.4 s | 345 KiB | 20 |

### ai-artikel

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 99 | 100 | 96 | 100 | 2.3 s | 0 | 10 ms | 1.3 s | 506 KiB | 40 |
| desktop | 100 | 100 | 96 | 100 | 0.6 s | 0 | 0 ms | 0.4 s | 507 KiB | 39 |

### privatliv

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 100 | 100 | 96 | 100 | 1.0 s | 0 | 18 ms | 1.2 s | 345 KiB | 19 |
| desktop | 100 | 100 | 96 | 100 | 0.3 s | 0 | 0 ms | 0.4 s | 340 KiB | 18 |

Overblik: Performance 99-100 på alle 16 kørsler (baseline 89-100). Accessibility 100 overalt (baseline 96-100). Best Practices 96 overalt (baseline 92-96). SEO 100 overalt. CLS er 0 på alle 16 kørsler (baseline: op til 0,229). Disse tal er som baselinen målt uden annoncescriptet (se forbeholdet).

## Før og efter

Format: før → efter. "Før" er hentet fra baselinens README (`../2026-11-13-baseline/README.md`), "efter" fra denne måling. Mærket ⚠ betyder: forværring på mere end 3 point i en score, eller en Core Web Vital (LCP højst 2,5 s, CLS højst 0,1, TBT er ikke en Core Web Vital men markeres ved passage af 200 ms), der går fra grøn til ikke-grøn. **Ingen kørsel har fået ⚠.**

### da-forside

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| mobile | 97 → 100 | 100 → 100 | 96 → 96 | 100 → 100 | 2.3 s → 1.1 s | 0 → 0 | 110 ms → 54 ms |
| desktop | 100 → 100 | 100 → 100 | 96 → 96 | 100 → 100 | 0.5 s → 0.3 s | 0,003 → 0 | 0 ms → 0 ms |

### en-forside

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| mobile | 98 → 100 | 100 → 100 | 96 → 96 | 100 → 100 | 2.3 s → 1.1 s | 0 → 0 | 80 ms → 44 ms |
| desktop | 100 → 100 | 100 → 100 | 96 → 96 | 100 → 100 | 0.5 s → 0.3 s | 0,041 → 0 | 0 ms → 0 ms |

### ha-guide

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| mobile | 96 → 100 | 100 → 100 | 92 → 96 | 100 → 100 | 2.1 s → 1.2 s | 0 → 0 | 210 ms → 11 ms |
| desktop | 100 → 100 | 100 → 100 | 92 → 96 | 100 → 100 | 0.6 s → 0.3 s | 0,014 → 0 | 0 ms → 0 ms |

### esp32-guide

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| mobile | 98 → 99 | 100 → 100 | 92 → 96 | 100 → 100 | 2.4 s → 2.1 s | 0 → 0 | 50 ms → 39 ms |
| desktop | 100 → 100 | 100 → 100 | 92 → 96 | 100 → 100 | 0.6 s → 0.5 s | 0,014 → 0 | 10 ms → 0 ms |

### produkt

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| mobile | 100 → 99 | 97 → 100 | 92 → 96 | 100 → 100 | 1.1 s → 2.1 s | 0 → 0 | 80 ms → 18 ms |
| desktop | 89 → 100 | 97 → 100 | 92 → 96 | 100 → 100 | 0.6 s → 0.3 s | 0,229 → 0 | 0 ms → 0 ms |

### ai-nyheder

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| mobile | 99 → 99 | 100 → 100 | 96 → 96 | 100 → 100 | 2.0 s → 2.1 s | 0 → 0 | 20 ms → 16 ms |
| desktop | 100 → 100 | 100 → 100 | 96 → 96 | 100 → 100 | 0.5 s → 0.3 s | 0,043 → 0 | 0 ms → 0 ms |

### ai-artikel

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| mobile | 100 → 99 | 96 → 100 | 92 → 96 | 100 → 100 | 1.4 s → 2.3 s | 0 → 0 | 10 ms → 10 ms |
| desktop | 100 → 100 | 96 → 100 | 92 → 96 | 100 → 100 | 0.6 s → 0.6 s | 0,002 → 0 | 0 ms → 0 ms |

### privatliv

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| mobile | 99 → 100 | 100 → 100 | 96 → 96 | 100 → 100 | 2.0 s → 1.0 s | 0 → 0 | 40 ms → 18 ms |
| desktop | 100 → 100 | 100 → 100 | 96 → 96 | 100 → 100 | 0.3 s → 0.3 s | 0,001 → 0 | 0 ms → 0 ms |

Forværringer under markeringsgrænsen (alle stadig grønne):

| Side | Formfaktor | Måling | Før → efter | Lighthouse-forklaring |
|---|---|---|---|---|
| ai-artikel | mobile | LCP | 1,4 s → 2,3 s | `lcp-discovery-insight`: LCP-billedet (`figure.ai-news-hero > img`) har ikke `fetchpriority=high`; `image-delivery-insight`: `/images/ai-news/2026-09-10.jpg` ca. 34 KiB mulig besparelse. Performance 100 → 99 |
| produkt | mobile | LCP | 1,1 s → 2,1 s | Ingen LCP-audit er markeret på siden; LCP-fordelingen er ca. 330 ms TTFB + ca. 150 ms render-forsinkelse. Performance 100 → 99. Hvilket element der er LCP, er ikke udtrukket; baselinens 1,1 s kan skyldes et andet LCP-element (hypotese, ikke undersøgt) |
| ai-nyheder | mobile | LCP | 2,0 s → 2,1 s | Inden for normal variation |
| ai-artikel, ai-nyheder | begge | Overført | +4-5 KiB | Ingen enkelt audit; `total-byte-weight` er 506 KiB og 344 KiB |

Alle øvrige målinger er uændrede eller bedre. Største forbedringer: LCP på forsiderne (mobil) 2,3 s → 1,1 s, TBT på HA-guide (mobil) 210 ms → 11 ms, Performance på produktsiden (desktop) 89 → 100 (CLS 0,229 → 0), kontrastfejlen `p.starlight-aside__title` er væk (Accessibility 96/97 → 100), og CSP-blokeringen af `giscus.app/default.css` er væk (Best Practices 92 → 96 på guide-, produkt- og artikelsiderne). Enkeltmålinger svinger; forskelle på 1-2 Performance-point bør ikke læses som reelle.

### Sikkerhedsheaders: før og efter

Hentet med `curl.exe -sI` på `/da/` (de øvrige statiske svar og `/api/chat` er sammenlignet; se `headers/`). Kun CSP er ændret; alt andet er identisk med baselinen på alle syv stier.

| Header | Før (2026-11-13) | Efter (2026-11-14) |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | uændret |
| `X-Content-Type-Options` | `nosniff` | uændret |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | uændret |
| `Permissions-Policy` | accelerometer, camera, geolocation, gyroscope, magnetometer, microphone, payment, usb slået fra (`=()`) | uændret |
| `Content-Security-Policy` | se nedenfor | ændret: `style-src` og `font-src` |
| `Cross-Origin-Opener-Policy` / `-Resource-Policy` | `same-origin` / `same-site` | uændret |
| `X-Frame-Options` | `SAMEORIGIN` | uændret |

CSP-ændringen (resten af headeren er ordret identisk med baselinens CSP):

```text
FØR:   style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
       font-src 'self' https://fonts.gstatic.com data:;
EFTER: style-src 'self' 'unsafe-inline' https://giscus.app;
       font-src 'self' data:;
```

Det vil sige: Google Fonts er fjernet fra tilladelserne (siden forhåndsindlæser nu selv-hostede `/_astro/fonts/*.woff2`), og `https://giscus.app` er tilføjet til `style-src`, så giscus-kommentarfeltets stylesheet ikke længere blokeres. `script-src` indeholder uændret `'unsafe-inline'` og `'wasm-unsafe-eval'`, og der er stadig hverken nonce eller hash; `style-src` har fortsat `'unsafe-inline'`. Hashede `/_astro/*`-aktiver, `/_astro/fonts/*.woff2` og billeder (testet: `index.BJh1GOaq.css`, `page.cNngjUgL.js`, `smart-home-editorial-960.avif`, en woff2-font) leveres fortsat med `Cache-Control: public, max-age=0, must-revalidate`, dvs. stadig ingen langtidscache/`immutable`.

## Feltdata (CrUX / Core Web Vitals)

Ikke målt: PageSpeed Insights API afviste begge kald uden nøgle (`https://smartbolig.net/` for origin og `https://smartbolig.net/da/` for forsiden, strategy=mobile) igen med HTTP 429, `RESOURCE_EXHAUSTED`, `Queries per day` med `quota_limit_value: "0"` (`defaultPerDayPerProject`) for den delte projektkvote. Svarene er gemt i `psi-origin.json` og `psi-da-forside.json`. Der foreligger derfor ingen CrUX-data; det siger intet om, hvorvidt sitet har eller mangler feltdata, eller om de er gode eller dårlige. Feltdata for et nyt design vil under alle omstændigheder først afspejle det nye design efter en del dages besøg (CrUX er et rullende 28-dages vindue). Næste skridt: PSI-API med egen nøgle, eller CrUX-API / Search Console.

## Header-fund (`headers/*.txt`)

Alle syv svar er hentet med `curl.exe -sI` (HEAD). Cloudflare `Report-To`-endpoint-tokens er erstattet med `<redacted>` i de gemte filer.

| Sti | Status | Bemærkning |
|---|---|---|
| `/da/` | 200 | fuld sikkerhedsheader-pakke, `Cache-Control: public, max-age=0, must-revalidate` |
| `/da/home-assistant/dashboard-design/` (`guide.txt`) | 200 | samme headers |
| `/api/chat` | 405 | `Allow: POST`, `Cache-Control: no-store`, `referrer-policy: no-referrer`, `x-content-type-options: nosniff`; ingen CSP/HSTS på dette svar (som før) |
| `/robots.txt` | 200 | samme headers som siderne |
| `/ads.txt` | 200 | samme |
| `/llms.txt` | 200 | samme |
| `/.well-known/security.txt` | 200 | samme |

Den fulde CSP efter ændringen (ordret fra `/da/`):

```text
default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://static.cloudflareinsights.com https://www.googletagmanager.com https://www.google-analytics.com https://cdn.ezoic.net https://pagead2.googlesyndication.com https://fundingchoicesmessages.google.com https://www.googleadservices.com https://adservice.google.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://tpc.googlesyndication.com https://*.googlesyndication.com https://giscus.app; style-src 'self' 'unsafe-inline' https://giscus.app; font-src 'self' data:; img-src 'self' data: https: blob:; connect-src 'self' https://cloudflareinsights.com https://www.google-analytics.com https://region1.google-analytics.com https://analytics.google.com https://*.ezoic.net https://*.googlesyndication.com https://pagead2.googlesyndication.com https://fundingchoicesmessages.google.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://giscus.app; frame-src 'self' https://fundingchoicesmessages.google.com https://www.google.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://*.googlesyndication.com https://ep2.adtrafficquality.google https://giscus.app; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; script-src-attr 'none'; worker-src 'self' blob:;
```

## Skærmbilleder

Ikke taget. Baselinens README beskriver otte skærmbilleder (`screenshots/`), men de ligger ikke i repoet (mappen findes ikke i `../2026-11-13-baseline/`), og opgaven var at følge baselinens valg om, hvad der gemmes i repoet. Hvis der ønskes visuel før/efter-sammenligning, skal begge sæt tages på ny med samme metode (Chrome CLI 1440x900, puppeteer-core 390x844).

## Top Lighthouse-problemer på tværs af sider (efter)

Rangeret efter antal af de 16 kørsler (8 sider x mobil/desktop), hvor auditten ikke er bestået (score under 1; "informative" og "ikke relevante" audits er ikke talt med). Samme optælling som baselinen.

| # | Problem | Rammer | Detalje | Før |
|---|---|---|---|---|
| 1 | Konsolfejl (`errors-in-console`) | 16/16 | Kun de tre blokerede netværksanmodninger (AdSense, Cloudflare-beacon, GA4 `collect`; se forbeholdet). CSP-blokeringen af `giscus.app/default.css` er væk | 16/16 |
| 2 | Ubrugt JavaScript (`unused-javascript`) | 16/16 | `googletagmanager.com/gtag/js?id=G-…`: ca. 76-79 KiB ubrugt | 16/16 |
| 3 | Renderblokerende CSS (`render-blocking-insight`) | 16/16 | `/_astro/index.BJh1GOaq.css` på alle 16; desuden `HomeStyles.*.css` (4), `AiNewsFeed.*.css` (2) og `ec.ml8fc.css` (4: HA-guide og produkt, begge formfaktorer); op til 150 ms estimeret besparelse (mobil) | 16/16 |
| 4 | Synligt label matcher ikke tilgængeligt navn (`label-content-name-mismatch`) | 16/16 | `a.sb-header__lang` (sprogskift, 16/16): `aria-label="Read this page in English"` / "Læs denne side på dansk" vs. synlig tekst "EN"/"DA"; `button.smartbolig-ai__launcher` (8/16, desktop-rapporter): `aria-label="Spørg SmartBolig AI"` vs. synlig tekst "SMARTBOLIG AI / Spørg AI / EDGE AI · ONLINE"; søgeknappen `site-search button` (8/16): `aria-label="Søg"` vs. synlig tekst "Søg Ctrl K". Auditten har ikke vægt i Accessibility-scoren (100 overalt) | 16/16 (kun launcher) |
| 5 | Netværksafhængighedstræ (`network-dependency-tree-insight`) | 16/16 | Lighthouse-insight; ikke et top-10-punkt i baselinen, og ikke undersøgt nærmere her | ikke optalt |
| 6 | Cache-levetider (`cache-insight`) | 8/16 | Tredjeparts-GIF `github.githubassets.com/images/mona-loading-dark.gif` (giscus), uændret. Sitets egne aktiver har fortsat `max-age=0` | 8/16 |
| 7 | Billedlevering (`image-delivery-insight`) | 6/16 | Forsider desktop: `/images/produkter/zigbee-koordinatorer/hero.jpg` ca. 120 KiB + `smart-home-editorial-640.avif` ca. 13 KiB; forsider mobil: `smart-home-editorial-640.avif` ca. 12 KiB; artikel: `/images/ai-news/2026-09-10.jpg` ca. 33-34 KiB | 6/16 |
| 8 | LCP-anmodning kunne opdages tidligere (`lcp-discovery-insight`) | 4/16 | ESP32-guide og AI-artikel, begge formfaktorer: `fetchpriority=high` er ikke sat på LCP-billedet | 3/16 |
| 9 | Billeder uden bredde/højde (`unsized-images`) | 2/16 | ESP32-guide, begge: `div.sl-markdown-content > p > img` (formentlig samme `overview.svg` som i baselinen; ikke bekræftet) | 2/16 |
| 10 | Agent-tilgængelighedstræ (`agent-accessibility-tree`) | 2/16 | AI-nyhedsoversigt, begge: `article.story-item` har eksplicit `role="listitem"` ("ARIA role should be appropriate for the element") | 2/16 (sider ikke angivet i baselinen) |

Væk i forhold til baselinen: `color-contrast` (`p.starlight-aside__title`, tidligere 4/16), `inspector-issues` (CSP-blokering af giscus, tidligere 8/16) og `mainthread-work-breakdown` (tidligere 3/16 på mobil). Enkeltfundet CLS 0,229 på produktsiden (desktop) gentog sig ikke (CLS 0).

## Filer

- `README.md`: denne rapport.
- `headers/`: svar-headers (samme syv filnavne som baselinen).
- `psi-origin.json`, `psi-da-forside.json`: PSI-API's fejlsvar (429).
- Ikke gemt, som i baselinen: de 16 rå Lighthouse-JSON-filer. Skærmbilleder: se afsnittet ovenfor.
