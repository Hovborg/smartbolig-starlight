# SmartBolig.net: måling "efter runde 2" (2026-11-14)

Målt morgenen den 2026-11-14 (kl. ca. 05:26-05:32 lokal tid, godt tre minutter efter udgivelsen) mod den offentlige produktion på https://smartbolig.net, efter at design "runde 2" blev udgivet (Worker-version 82aa27ca, commit d3eaa30 på `main`, udgivet ca. kl. 04:23 UTC). Målingen gentager `../2026-11-13-baseline/README.md` og `../2026-11-14-efter-design/README.md` (runde 1) med samme værktøjer, samme otte URL'er og samme metode, så tallene kan sammenlignes direkte. Der er kun hentet offentlige URL'er. Intet i repoet uden for denne mappe er rettet.

Hvilken Worker-version der svarede, er ikke aflæst udefra (ikke verificeret: præcis versions-ID). At runde 2 er live, er kun påvist indirekte: forsiderne henviser nu til `/_astro/house3d.B_BhrkPz.js`, `HomeHouseScript.*.js` og `/images/home/house-evening-*.avif`, som runde 1 ikke målte.

Nyt i runde 2: forsiderne (`/da/`, `/en/`) har et 3D-hus (three.js) med et stillbillede som LCP-kandidat. Bundtet hentes først, når browseren er ledig på desktop; på telefoner efter første berøring/rul. Resultaterne for forsiderne er derfor beskrevet særskilt i afsnittet "Forsiderne og 3D-huset" nedenfor.

## Værktøjer

| Værktøj | Version |
|---|---|
| Lighthouse | 13.6.0 (npm, installeret med `--save-exact` i en midlertidig mappe uden for repoet; samme som baseline og runde 1) |
| Chrome (headless) | 158.0.8127.18, UA `HeadlessChrome/158.0.0.0` (samme) |
| Node / npm | 24.22.1 / 11.19.1 (samme) |
| curl | 8.22.0 (Windows, Schannel) |
| Vært | Windows 11 Pro, PowerShell 7 |

## Præcise kommandoer

Identiske med runde 1 (ingen skærmbilleder taget):

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

Alle 16 kørsler gav en gyldig rapport uden `runtimeError`; ingen kørsel måtte gentages (loggen har intet andet forsøg). Hver URL og formfaktor er målt én gang. Lighthouse-score svinger typisk nogle point mellem kørsler; enkeltmålinger bør ikke læses som præcise. Lighthouse-JSON-filerne er, som før, ikke gemt i repoet.

Ud over de 16 kørsler er der lavet tre kontrolkørsler, som afviger fra metoden eller er gentagelser; de står adskilt i afsnittet "Kontrolkørsler" og indgår ikke i nogen tabel ellers.

## Målte URL'er

De samme otte URL'er som baseline og runde 1 (nyhedsartiklen er fortsat `/da/ai/nyheder/2026-09-10/`).

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

Forbeholdet fra baseline og runde 1 gælder uændret; intet er ændret. Kontrolleret med `Resolve-DnsName` før kørslerne: `pagead2.googlesyndication.com`, `static.cloudflareinsights.com` og `region1.google-analytics.com` giver stadig "DNS name does not exist", mens `www.googletagmanager.com` opløses. I alle 16 rapporter fejler derfor de samme tre anmodninger med `net::ERR_NAME_NOT_RESOLVED` (AdSense `adsbygoogle.js`, Cloudflare-beacon, GA4 `g/collect`), og de er de eneste konsolfejl. Målingen viser siden UDEN annoncescriptet og det, det plejer at trække ind. Dette er IKKE omgået. Ikke målt: ydeevne med annoncer og Cloudflare-beacon indlæst; gentag fra et netværk uden DNS-filter (eller i CI).

Øvrige målebetingelser som før: mobil bruger standardemuleringen (Moto G Power, simuleret langsom 4G, 4x CPU-nedsættelse), desktop `--preset=desktop`. "Overført" er `total-byte-weight`; "Requests" er antal poster i `network-requests` (inkl. de blokerede). Alle svar kom fra Cloudflares cache (`CF-Cache-Status: HIT` på `/da/`).

**Nyt forbehold om WebGL:** kørslerne bruger `--disable-gpu` som i baseline. I headless Chrome uden GPU renderes WebGL i software, og det trækker 3D-huset på desktop (se nedenfor). De desktop-tal for forsiderne, der er markeret som kraftigt forværrede, er derfor sandsynligvis langt dårligere, end en besøgende med en grafikprocessor oplever. Kontrolkørslen uden `--disable-gpu` giver et mindre, men stadig tydeligt udslag.

## Resultater pr. URL og formfaktor

Samme format som runde 1.

### da-forside

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 98 | 100 | 96 | 100 | 2.3 s | 0.001 | 6 ms | 1.1 s | 496 KiB | 24 |
| desktop | 60 | 100 | 96 | 100 | 0.6 s | 0.012 | 15781 ms | 6.3 s | 552 KiB | 20 |

### en-forside

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 99 | 100 | 96 | 100 | 2.3 s | 0.001 | 9 ms | 1.1 s | 459 KiB | 22 |
| desktop | 60 | 100 | 96 | 100 | 0.6 s | 0.012 | 15110 ms | 6.2 s | 552 KiB | 20 |

### ha-guide

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 98 | 100 | 96 | 100 | 2.4 s | 0 | 19 ms | 1.4 s | 497 KiB | 44 |
| desktop | 100 | 100 | 96 | 100 | 0.5 s | 0 | 0 ms | 0.4 s | 495 KiB | 43 |

### esp32-guide

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 99 | 100 | 96 | 100 | 2.1 s | 0 | 43 ms | 1.8 s | 478 KiB | 44 |
| desktop | 100 | 100 | 96 | 100 | 0.5 s | 0 | 0 ms | 0.5 s | 475 KiB | 43 |

### produkt

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 100 | 100 | 96 | 100 | 1.1 s | 0 | 9 ms | 1.4 s | 500 KiB | 44 |
| desktop | 100 | 100 | 96 | 100 | 0.5 s | 0 | 0 ms | 0.4 s | 500 KiB | 43 |

### ai-nyheder

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 98 | 96 | 96 | 100 | 2.3 s | 0 | 8 ms | 1.2 s | 489 KiB | 35 |
| desktop | 100 | 96 | 96 | 100 | 0.6 s | 0 | 0 ms | 0.4 s | 527 KiB | 40 |

### ai-artikel

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 96 | 100 | 96 | 100 | 2.7 s | 0 | 12 ms | 1.3 s | 500 KiB | 41 |
| desktop | 100 | 100 | 96 | 100 | 0.5 s | 0 | 0 ms | 0.4 s | 500 KiB | 40 |

### privatliv

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 99 | 100 | 96 | 100 | 2.3 s | 0 | 9 ms | 1.6 s | 366 KiB | 21 |
| desktop | 100 | 100 | 96 | 100 | 0.5 s | 0 | 0 ms | 0.4 s | 364 KiB | 20 |


Overblik: Performance 96-100 på alle kørsler undtagen de to forsider på desktop (60). Accessibility 96-100 (ny: 96 på AI-nyhedsoversigten, begge formfaktorer). Best Practices 96 overalt. SEO 100 overalt. CLS er 0 på alle kørsler undtagen forsiderne (0,012 på desktop, 0,001 på mobil).

## Baseline → runde 1 → runde 2

Format: baseline → runde 1 → runde 2. Baseline og runde 1 er hentet ordret fra deres README'er. Alle tre er enkeltmålinger.

### Scores

| Side | Formfaktor | Perf | A11y | BP | SEO |
|---|---|---|---|---|---|
| da-forside | mobile | 97 → 100 → 98 | 100 → 100 → 100 | 96 → 96 → 96 | 100 → 100 → 100 |
| da-forside | desktop | 100 → 100 → 60 | 100 → 100 → 100 | 96 → 96 → 96 | 100 → 100 → 100 |
| en-forside | mobile | 98 → 100 → 99 | 100 → 100 → 100 | 96 → 96 → 96 | 100 → 100 → 100 |
| en-forside | desktop | 100 → 100 → 60 | 100 → 100 → 100 | 96 → 96 → 96 | 100 → 100 → 100 |
| ha-guide | mobile | 96 → 100 → 98 | 100 → 100 → 100 | 92 → 96 → 96 | 100 → 100 → 100 |
| ha-guide | desktop | 100 → 100 → 100 | 100 → 100 → 100 | 92 → 96 → 96 | 100 → 100 → 100 |
| esp32-guide | mobile | 98 → 99 → 99 | 100 → 100 → 100 | 92 → 96 → 96 | 100 → 100 → 100 |
| esp32-guide | desktop | 100 → 100 → 100 | 100 → 100 → 100 | 92 → 96 → 96 | 100 → 100 → 100 |
| produkt | mobile | 100 → 99 → 100 | 97 → 100 → 100 | 92 → 96 → 96 | 100 → 100 → 100 |
| produkt | desktop | 89 → 100 → 100 | 97 → 100 → 100 | 92 → 96 → 96 | 100 → 100 → 100 |
| ai-nyheder | mobile | 99 → 99 → 98 | 100 → 100 → 96 | 96 → 96 → 96 | 100 → 100 → 100 |
| ai-nyheder | desktop | 100 → 100 → 100 | 100 → 100 → 96 | 96 → 96 → 96 | 100 → 100 → 100 |
| ai-artikel | mobile | 100 → 99 → 96 | 96 → 100 → 100 | 92 → 96 → 96 | 100 → 100 → 100 |
| ai-artikel | desktop | 100 → 100 → 100 | 96 → 100 → 100 | 92 → 96 → 96 | 100 → 100 → 100 |
| privatliv | mobile | 99 → 100 → 99 | 100 → 100 → 100 | 96 → 96 → 96 | 100 → 100 → 100 |
| privatliv | desktop | 100 → 100 → 100 | 100 → 100 → 100 | 96 → 96 → 96 | 100 → 100 → 100 |

### Metrikker

| Side | Formfaktor | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|
| da-forside | mobile | 2.3 s → 1.1 s → 2.3 s | 0 → 0 → 0.001 | 110 ms → 54 ms → 6 ms | 1.5 s → 1.5 s → 1.1 s | 429 KiB → 372 KiB → 496 KiB | 21 → 20 → 24 |
| da-forside | desktop | 0.5 s → 0.3 s → 0.6 s | 0.003 → 0 → 0.012 | 0 ms → 0 ms → 15781 ms | 0.5 s → 0.5 s → 6.3 s | 580 KiB → 535 KiB → 552 KiB | 22 → 21 → 20 |
| en-forside | mobile | 2.3 s → 1.1 s → 2.3 s | 0 → 0 → 0.001 | 80 ms → 44 ms → 9 ms | 1.5 s → 1.5 s → 1.1 s | 428 KiB → 372 KiB → 459 KiB | 21 → 20 → 22 |
| en-forside | desktop | 0.5 s → 0.3 s → 0.6 s | 0.041 → 0 → 0.012 | 0 ms → 0 ms → 15110 ms | 0.5 s → 0.5 s → 6.2 s | 580 KiB → 534 KiB → 552 KiB | 22 → 21 → 20 |
| ha-guide | mobile | 2.1 s → 1.2 s → 2.4 s | 0 → 0 → 0 | 210 ms → 11 ms → 19 ms | 1.3 s → 1.2 s → 1.4 s | 507 KiB → 470 KiB → 497 KiB | 43 → 42 → 44 |
| ha-guide | desktop | 0.6 s → 0.3 s → 0.5 s | 0.014 → 0 → 0 | 0 ms → 0 ms → 0 ms | 0.5 s → 0.5 s → 0.4 s | 507 KiB → 470 KiB → 495 KiB | 42 → 41 → 43 |
| esp32-guide | mobile | 2.4 s → 2.1 s → 2.1 s | 0 → 0 → 0 | 50 ms → 39 ms → 43 ms | 1.5 s → 1.3 s → 1.8 s | 509 KiB → 476 KiB → 478 KiB | 44 → 43 → 44 |
| esp32-guide | desktop | 0.6 s → 0.5 s → 0.5 s | 0.014 → 0 → 0 | 10 ms → 0 ms → 0 ms | 0.5 s → 0.5 s → 0.5 s | 511 KiB → 481 KiB → 475 KiB | 44 → 42 → 43 |
| produkt | mobile | 1.1 s → 2.1 s → 1.1 s | 0 → 0 → 0 | 80 ms → 18 ms → 9 ms | 1.5 s → 1.1 s → 1.4 s | 508 KiB → 470 KiB → 500 KiB | 44 → 42 → 44 |
| produkt | desktop | 0.6 s → 0.3 s → 0.5 s | 0.229 → 0 → 0 | 0 ms → 0 ms → 0 ms | 0.5 s → 0.4 s → 0.4 s | 508 KiB → 470 KiB → 500 KiB | 42 → 41 → 43 |
| ai-nyheder | mobile | 2.0 s → 2.1 s → 2.3 s | 0 → 0 → 0 | 20 ms → 16 ms → 8 ms | 1.1 s → 1.1 s → 1.2 s | 340 KiB → 344 KiB → 489 KiB | 21 → 21 → 35 |
| ai-nyheder | desktop | 0.5 s → 0.3 s → 0.6 s | 0.043 → 0 → 0 | 0 ms → 0 ms → 0 ms | 0.4 s → 0.4 s → 0.4 s | 340 KiB → 345 KiB → 527 KiB | 20 → 20 → 40 |
| ai-artikel | mobile | 1.4 s → 2.3 s → 2.7 s | 0 → 0 → 0 | 10 ms → 10 ms → 12 ms | 1.4 s → 1.3 s → 1.3 s | 502 KiB → 506 KiB → 500 KiB | 40 → 40 → 41 |
| ai-artikel | desktop | 0.6 s → 0.6 s → 0.5 s | 0.002 → 0 → 0 | 0 ms → 0 ms → 0 ms | 0.5 s → 0.4 s → 0.4 s | 503 KiB → 507 KiB → 500 KiB | 39 → 39 → 40 |
| privatliv | mobile | 2.0 s → 1.0 s → 2.3 s | 0 → 0 → 0 | 40 ms → 18 ms → 9 ms | 1.1 s → 1.2 s → 1.6 s | 377 KiB → 345 KiB → 366 KiB | 20 → 19 → 21 |
| privatliv | desktop | 0.3 s → 0.3 s → 0.5 s | 0.001 → 0 → 0 | 0 ms → 0 ms → 0 ms | 0.4 s → 0.4 s → 0.4 s | 377 KiB → 340 KiB → 364 KiB | 19 → 18 → 20 |

Læsning (målt, ikke vurderet):

- Forsiderne på desktop er den eneste reelle forværring: Performance 100 → 60, TBT 0 ms → ca. 15 000 ms, Speed Index 0,5 s → ca. 6,2 s. Årsagen ligger i 3D-bundtet (se nedenfor).
- Mobil-LCP er 2,1-2,7 s på 7 af 8 sider (runde 1: 1,0-2,3 s), også på sider, der ikke har fået nyt indhold (privatliv: 1,0 s → 2,3 s; en gentagelse gav 2,1 s, se kontrolkørsler). Det ligner en fælles ændring eller målemiljøet og ikke 3D-huset; årsagen er ikke fastslået. Alle stadig under 2,5 s undtagen AI-artiklen på mobil (2,7 s).
- AI-nyhedsoversigten vejer 340 → 344 → 489 KiB (mobil) og har 35-40 requests (før 20-21). Siden viser dagens nyheder, og nye artikler med billeder (fx `/images/ai-news/2026-11-14.jpg`, 37 KiB) er kommet til siden runde 1; det er indholdsændring, ikke designændring.

## Forsiderne og 3D-huset (/da/ og /en/)

Alle tal er fra de fire Lighthouse-rapporter for forsiderne. "Runde 1" er fra runde 1's README.

### 1. LCP-element, LCP-tid, preload og fetchpriority

| Måling | da mobil | da desktop | en mobil | en desktop |
|---|---|---|---|---|
| LCP-element | `div.home-stage > div.home-stage__screen > picture > img.home-stage__poster` | samme | samme | samme |
| LCP-ressource (netværk) | `/images/home/house-evening-960.avif`, 37 381 B | samme, 35 935 B | samme, 35 941 B | samme, 35 943 B |
| LCP, Lighthouse-metrik | 2,3 s (runde 1: 1,1 s) | 0,6 s (0,3 s) | 2,3 s (1,1 s) | 0,6 s (0,3 s) |
| LCP, observeret fordeling (ms: TTFB / indlæsningsforsinkelse / indlæsningstid / renderforsinkelse) | 332 / 13 / 18 / 60 | 363 / 13 / 34 / 96 | 331 / 14 / 22 / 55 | 341 / 11 / 25 / 91 |
| `fetchpriority="high"` på LCP-billedet | ja | ja | ja | ja |
| Opdagelig i det første dokument, ikke `loading=lazy` | ja | ja | ja | ja |
| `<link rel="preload" as="image">` | nej | nej | nej | nej |
| `lcp-discovery-insight` | bestået | bestået | bestået | bestået |

Preload: HTML'en (`/da/`, hentet med curl) har kun to `<link rel="preload" as="font">` (woff2) og ingen billed-preload. Stillbilledet er i stedet et `<img ... loading="eager" fetchpriority="high" decoding="async">` inde i et `<picture>` med AVIF- og WebP-`source` (640/960/1440 px). Lighthouse regner det som tidligt opdaget; målt resultat: ca. 13 ms fra dokumentet til anmodningen.

Forskellen mellem Lighthouse-metrikken (2,3 s på mobil) og den observerede fordeling (summen er ca. 0,4-0,5 s) skyldes, at mobilmetrikken er simuleret med netværks- og CPU-nedsættelse, mens fordelingen er observeret uden. Begge er korrekte aflæsninger af hvert sit instrument.

### 2. TBT, CLS, Speed Index, vægt og requests (runde 1 → runde 2)

| Måling | da mobil | da desktop | en mobil | en desktop |
|---|---|---|---|---|
| TBT | 54 ms → 6 ms | 0 ms → 15 781 ms | 44 ms → 9 ms | 0 ms → 15 110 ms |
| CLS | 0 → 0,001 | 0 → 0,012 | 0 → 0,001 | 0 → 0,012 |
| Speed Index | 1,5 s → 1,1 s | 0,5 s → 6,3 s | 1,5 s → 1,1 s | 0,5 s → 6,2 s |
| Overført | 372 → 496 KiB | 535 → 552 KiB | 372 → 459 KiB | 534 → 552 KiB |
| Requests | 20 → 24 | 21 → 20 | 20 → 22 | 21 → 20 |
| Performance | 100 → 98 | 100 → 60 | 100 → 99 | 100 → 60 |

CLS 0,012 på desktop skyldes ét skift i `section.home-hero > div.home-day > div.home-stage > div.home-stage__screen` (Lighthouse: layout shift score 0,012).

Mobilvægten er steget, fordi fem lazy-loadede emnebilleder (`/images/home/topic-*.avif`, i alt ca. 117 KB, bl.a. `topic-home-assistant-960.avif` 44 888 B) hentes under målingen trods `loading="lazy"` (prioritet `Low`). Hvorfor de hentes så tidligt, er ikke undersøgt. Desktopvægten er næsten uændret (+17 KiB) trods 3D-bundtet, fordi `/images/produkter/zigbee-koordinatorer/hero.jpg` (ca. 118-120 KiB i baseline og runde 1) ikke længere indgår i requestlisten (hypotese: billedet er fjernet fra forsiden; ikke undersøgt i kildekoden).

### 3. Blev three.js-bundtet hentet, og hvad vejer det?

| | Desktop (da og en) | Mobil (da og en) |
|---|---|---|
| `/_astro/house3d.B_BhrkPz.js` hentet under målingen | ja | nej |
| Overført (Lighthouse `transferSize`) | 175 703 B (da) / 175 754 B (en), ca. 172 KiB | ikke hentet |
| Afkodet størrelse | 679 371 B (ca. 663 KiB) | |
| Prioritet / starttidspunkt | `High`, ca. 0,77-0,78 s efter navigationsstart | |
| Ubrugt JS ifølge Lighthouse | 49 302 B af 173 971 B | |

Brotli-svaret for filen, hentet med curl (`Accept-Encoding: br`), er 173 825 B i brødteksten, og filen leveres med `Cache-Control: public, max-age=31536000, immutable`. Det er altså ca. 170-172 KiB overført og ikke de ca. 138 kB, der er oplyst som forventning; hvorfra de 138 kB stammer, er ikke undersøgt. På mobil hentes kun det lille `HomeHouseScript.*.js` (2,6-4,0 kB), som beslutter, om huset skal indlæses. Mobil efter første berøring/rul er IKKE målt, fordi Lighthouse ikke rører eller ruller siden.

Hvorfor desktop falder: hovedtråden er optaget i alt ca. 38 s under kategorien "Other" og ca. 5,7 s i "Script Evaluation" (mobil: ca. 0,2 s i hver). Lighthouse' bootup-tid tilskriver ca. 43 s til `house3d.B_BhrkPz.js` (heraf ca. 5,2 s scripting) og 0,5 s til `HomeHouseScript.*.js`. Den første lange opgave i `house3d` er 660 ms ved ca. 1,5 s, og herefter følger en lang række opgaver på 100-150 ms; `HomeHouseScript` har en lang opgave på 533 ms ved ca. 0,9 s. Uden GPU er "Other" sandsynligvis softwarerenderingen af WebGL (hypotese; kontrolkørslen nedenfor understøtter den, men beviser den ikke).

### 4. De tre største ressourcer og de vigtigste opportunities

Største ressourcer (overført):

| | da mobil | da desktop |
|---|---|---|
| 1 | `googletagmanager.com/gtag/js` 196 718 B | `googletagmanager.com/gtag/js` 196 878 B |
| 2 | `/images/home/topic-home-assistant-960.avif` 44 888 B | `/_astro/house3d.B_BhrkPz.js` 175 703 B |
| 3 | `/_astro/fonts/d4669f4553080d4d.woff2` 41 719 B | `/_astro/fonts/d4669f4553080d4d.woff2` 41 702 B |

Eget indhold alene (uden gtag) er altså på desktop `house3d` (176 KB), fonten (42 KB) og stillbilledet (36 KB). `en` er næsten identisk (største: gtag 196 867/196 872 B, `house3d` 175 754 B på desktop, fonten 43 139 B).

Vigtigste Lighthouse-fund for `/da/` (`en` er næsten ens):

| Fund | Mobil | Desktop |
|---|---|---|
| `mainthread-work-breakdown` / `bootup-time` (TBT) | ikke markeret | metricSavings TBT 15 800 ms / 2 400 ms; årsag `house3d` |
| `unused-javascript` | 77 268 B, kun gtag | 126 762 B: gtag 77 460 B + `house3d` 49 302 B |
| `image-delivery-insight` | 43 KiB: `topic-home-assistant-960.avif` ca. 21,8 KB og `house-evening-960.avif` ca. 21,7 KB; LCP-besparelse 150 ms | 16 KiB: `house-evening-960.avif` |
| `render-blocking-insight` | `HomeStyles.CiU1z_YC.css` 150 ms (FCP) og `index.CzC7oJit.css` | de samme to filer, 0 ms estimeret |
| `valid-source-maps` | bestået | ikke bestået (`house3d`; ingen source map) |

### 5. Nye fejl i forhold til runde 1

- Konsol: uændret. Kun de tre blokerede netværksanmodninger (se forbeholdet); ingen CSP-fejl, ingen andre konsolfejl, `inspector-issues` bestået på alle 16.
- Accessibility: forsiderne 100 (som før); `label-content-name-mismatch` er fortsat markeret på alle 16 kørsler (`a.sb-header__lang`, desktop desuden `site-search button` og `button.smartbolig-ai__launcher`) og har som før ingen vægt i scoren.
- Best Practices: 96 (som før); på forsidernes desktopkørsler er `valid-source-maps` ikke bestået (ingen effekt på tallet 96).
- SEO: 100 (som før).
- Nyt på forsiderne på desktop: `total-blocking-time`, `speed-index`, `mainthread-work-breakdown`, `bootup-time` og `valid-source-maps` er ikke bestået (runde 1 havde dem ikke blandt de markerede); CLS 0,012 (før 0).

## Nye fund uden for forsiderne

- **AI-nyhedsoversigten, Accessibility 100 → 96 (begge formfaktorer):** `target-size` er ikke bestået for `a.story-title` i `ol > li > div` (mål 263 x 23,8 px, mindst 24 x 24 px kræves). Sandsynligvis fra nyt indhold eller layout siden runde 1; ikke undersøgt hvilket.
- AI-artiklen på mobil: LCP 2,3 s → 2,7 s, Performance 99 → 96; `lcp-discovery-insight` og `image-delivery-insight` er som i runde 1 markeret (`fetchpriority=high` mangler på LCP-billedet); `/images/ai-news/2026-09-10.jpg` er stadig den foreslåede besparelse.
- Øvrige sider: Accessibility 100, Best Practices 96, SEO 100 og CLS 0 som i runde 1. HA-guiden på mobil: Performance 100 → 98 med LCP 1,2 s → 2,4 s.

## Kontrolkørsler (afviger fra metoden, udenfor tabellerne)

| Kørsel | Perf | LCP | CLS | TBT | Speed Index | Overført |
|---|---|---|---|---|---|---|
| `/da/` desktop, som metoden (`--disable-gpu`), gentagelse | 60 | 0,5 s | 0,012 | 16 154 ms | 6,2 s | 553 KiB |
| `/da/` desktop, UDEN `--disable-gpu` (afviger fra metoden) | 70 | 0,5 s | 0,012 | 1 216 ms | 1,3 s | 553 KiB |
| `/da/juridisk/privatlivspolitik/` mobil, som metoden, gentagelse | 99 | 2,1 s | 0 | 9 ms | 1,1 s | 361 KiB |

Uden `--disable-gpu` falder TBT fra ca. 16 000 ms til 1 216 ms, men Performance er stadig 70, fordi to lange opgaver tæller: 821 ms i `house3d.B_BhrkPz.js` (ved ca. 1,5 s) og 520 ms i `HomeHouseScript.*.js` (ved ca. 0,9 s); `house3d` bruger her ca. 2,7 s scripting. Gentagelsen med samme flag bekræfter, at 60 ikke er et enkeltstående udsving. Hvad en besøgende med en rigtig GPU og en langsommere CPU oplever, er ikke målt.

## Sikkerhedsheaders: før og efter

Hentet med `curl.exe -sI`; alle syv svar er sammenlignet med runde 1 (uden Date, ETag, CF-RAY og `x-request-id`, som varierer pr. svar; ETag på `/da/` er ændret, som forventet efter en ny udgivelse). Ingen forskel i nogen header, heller ikke i CSP (ordret identisk med runde 1, `script-src` har fortsat `'unsafe-inline'` og `'wasm-unsafe-eval'`, og der er hverken nonce eller hash).

Eneste ændring i leveringen, målt direkte på tre aktiver: hashede `/_astro/*`-filer og fonte leveres nu med `Cache-Control: public, max-age=31536000, immutable` (målt: `/_astro/index.CzC7oJit.css`, `/_astro/house3d.B_BhrkPz.js` og `/_astro/fonts/d4669f4553080d4d.woff2`). I baseline og runde 1 var det `max-age=0, must-revalidate`. HTML-siderne og billedet `/images/home/house-evening-960.avif` har stadig `public, max-age=0, must-revalidate`; øvrige billeder er ikke kontrolleret.

| Sti | Status | Bemærkning |
|---|---|---|
| `/da/` | 200 | fuld sikkerhedsheader-pakke, `CF-Cache-Status: HIT` |
| `/da/home-assistant/dashboard-design/` (`guide.txt`) | 200 | samme headers |
| `/api/chat` | 405 | `Allow: POST`, `Cache-Control: no-store`; ingen CSP/HSTS (som før) |
| `/robots.txt`, `/ads.txt`, `/llms.txt`, `/.well-known/security.txt` | 200 | samme headers |

Cloudflare `Report-To`-endpoint-tokens er erstattet med `<redacted>` i de gemte filer.

## Feltdata (CrUX / Core Web Vitals)

Ikke målt: PageSpeed Insights API afviste begge kald uden nøgle (origin `https://smartbolig.net/` og forsiden `https://smartbolig.net/da/`, strategy=mobile) igen med HTTP 429, `RESOURCE_EXHAUSTED`, `Queries per day`. Svarene er gemt i `psi-origin.json` og `psi-da-forside.json`. Der foreligger derfor ingen CrUX-data; det siger intet om sidens feltdata. Feltdata for runde 2 afspejler under alle omstændigheder først designet efter en del dages besøg (rullende 28-dages vindue).

## Top Lighthouse-problemer på tværs af sider (runde 2)

Samme optælling som før: antal af de 16 kørsler, hvor auditten ikke er bestået (score under 1; informative og ikke-relevante audits er ikke talt med).

| # | Problem | Rammer | Detalje | Runde 1 |
|---|---|---|---|---|
| 1 | Konsolfejl (`errors-in-console`) | 16/16 | kun de tre blokerede netværksanmodninger | 16/16 |
| 2 | Synligt label matcher ikke tilgængeligt navn (`label-content-name-mismatch`) | 16/16 | `a.sb-header__lang`, desuden launcher og søgeknap | 16/16 |
| 3 | Ubrugt JavaScript (`unused-javascript`) | 16/16 | gtag ca. 75-78 KiB; på forsider desktop desuden `house3d` 49 302 B | 16/16 |
| 4 | Netværksafhængighedstræ (`network-dependency-tree-insight`) | 16/16 | ikke undersøgt nærmere | 16/16 |
| 5 | Renderblokerende CSS (`render-blocking-insight`) | 16/16 | `index.*.css`, `HomeStyles.*.css` m.fl. | 16/16 |
| 6 | Interactive (`interactive`) | 10/16 | alle mobilkørsler (8) og forsider desktop (2); metrikken er simuleret | ikke optalt |
| 7 | Cache-levetider (`cache-insight`) | 8/16 | giscus-GIF'en; sitets egne hashede aktiver er nu `immutable` | 8/16 |
| 8 | Billedlevering (`image-delivery-insight`) | 8/16 | forsider (4), AI-nyheder (2), AI-artikel (2) | 6/16 |
| 9 | LCP-anmodning kunne opdages tidligere (`lcp-discovery-insight`) | 4/16 | ESP32-guide og AI-artikel: `fetchpriority=high` mangler; forsiderne består | 4/16 |
| 10 | Mål-størrelse (`target-size`) | 2/16 | AI-nyhedsoversigt, `a.story-title` | 0/16 |

Nye i forhold til runde 1: `target-size` (2), `total-blocking-time`, `speed-index`, `mainthread-work-breakdown` og `bootup-time` (hver 2, forsider desktop) samt `valid-source-maps` (2, forsider desktop). `unsized-images` (2, ESP32-guide) og `forced-reflow-insight` (1, produkt mobil) er også markeret. Væk i forhold til runde 1: ingen af de problemer, som runde 1 rettede, er vendt tilbage (`color-contrast` og giscus-CSP er stadig væk).

## Filer

- `README.md`: denne rapport.
- `headers/`: svar-headers (samme syv filnavne som før).
- `psi-origin.json`, `psi-da-forside.json`: PSI-API's fejlsvar (429).
- Ikke gemt, som før: de 16 rå Lighthouse-JSON-filer og de tre kontrolkørsler.
