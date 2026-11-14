# SmartBolig.net: måling efter redesignet (2026-11-14)

Målt aftenen den 2026-11-14 mod den offentlige produktion på https://smartbolig.net. Svar-headers og feltdata-kald er hentet kl. 20:57 lokal tid (19:57 UTC); de 20 Lighthouse-kørsler løb kl. 20:57-21:02 lokal tid (19:57-20:02 UTC). Målingen gentager `../2026-11-13-baseline/README.md`, `../2026-11-14-efter-design/README.md` (runde 1) og `../2026-11-14-efter-runde-2/README.md` med samme værktøjer, samme otte URL'er og samme metode, så tallene kan sammenlignes direkte. Der er kun hentet offentlige URL'er. Intet i repoet uden for denne mappe er rettet.

Ved gennemlæsningen er der tilføjet forklaringer med henvisning til repoets egne dokumenter (samtykke, 3D-huset) og én aflæsning mere af de rå rapporter (`worker-*.js` i de to kontrolkørsler med grafikvej). Tallene er uændrede.

Den live version er ifølge udgivelseskørslen Worker `336b9305` (`main` 4fe5691). Det er oplyst af udgiveren og ikke aflæst udefra (ikke verificeret udefra: præcis versions-ID). Udefra er kun påvist, at siderne har ændret sig siden runde 2 (se nedenfor: andre CSS-/JS-filnavne, ny `Content-Security-Policy-Report-Only`, ingen `gtag/js` og ingen `house3d.B_BhrkPz.js` i anmodningerne).

## Værktøjer

| Værktøj | Version |
|---|---|
| Lighthouse | 13.6.0 (npm, `--save-exact`, samme installation i en midlertidig mappe uden for repoet som i de tidligere målinger; ikke geninstalleret) |
| Chrome (headless) | 158.0.8127.37, UA `HeadlessChrome/158.0.0.0` (tidligere målinger: 158.0.8127.18; samme hovedversion, nyere rettelsesnummer) |
| Node / npm | 24.22.1 / 11.19.1 (samme) |
| curl | 8.22.0 (Windows, Schannel) (samme) |
| Vært | Windows 11 Pro, PowerShell 7 |

## Præcise kommandoer

Identiske med runde 2 (ingen skærmbilleder taget):

```powershell
# Lighthouse, pr. URL (mobil = standardpræset, desktop = --preset=desktop); én kørsel pr. URL og formfaktor, én ad gangen
node <midlertidig mappe>/node_modules/lighthouse/cli/index.js <URL> --output=json --output-path=<midlertidig mappe>/raw/<side>-mobile.json --quiet `
  --chrome-flags="--headless=new --no-sandbox --disable-gpu"
node <midlertidig mappe>/node_modules/lighthouse/cli/index.js <URL> --output=json --output-path=<midlertidig mappe>/raw/<side>-desktop.json --quiet `
  --chrome-flags="--headless=new --no-sandbox --disable-gpu" --preset=desktop

# Svar-headers
curl.exe -sI --max-time 30 https://smartbolig.net/da/ -o headers/da-forside.txt
# (tilsvarende for /da/home-assistant/dashboard-design/ -> guide.txt, /api/chat, /robots.txt, /ads.txt, /llms.txt, /.well-known/security.txt)

# Feltdata
curl.exe -s "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=<URL>&strategy=mobile&category=performance"
```

Alle 16 kørsler gav en gyldig rapport uden `runtimeError`; ingen kørsel måtte gentages (loggen har intet andet forsøg). Hver URL og formfaktor er målt én gang, og alle tal herunder er enkeltmålinger. Lighthouse-score svinger typisk nogle point mellem kørsler; enkeltmålinger bør ikke læses som præcise. De rå Lighthouse-JSON-filer er, som før, ikke gemt i repoet.

Ud over de 16 kørsler er der lavet fire kontrolkørsler (afviger fra metoden eller er gentagelser); de står adskilt i afsnittet "Kontrolkørsler" og indgår ikke i nogen tabel ellers. `/api/chat` er kun anmodet med ét `curl -sI` (HEAD), som i de tidligere målinger; der er ikke sendt POST eller spørgsmål.

## Målte URL'er

De samme otte URL'er som baseline, runde 1 og runde 2 (nyhedsartiklen er fortsat `/da/ai/nyheder/2026-09-10/`).

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

## VIGTIGT forbehold: tredjepartsscripts er stadig delvist blokeret af netværket

Forbeholdet fra de tidligere målinger gælder uændret. Kontrolleret med `Resolve-DnsName` før kørslerne: `pagead2.googlesyndication.com`, `static.cloudflareinsights.com` og `region1.google-analytics.com` giver stadig "DNS name does not exist", mens `www.googletagmanager.com` opløses. Dette er IKKE omgået.

Hvad der har ændret sig i, hvordan forbeholdet viser sig: i alle 16 rapporter fejler nu kun én anmodning med `net::ERR_NAME_NOT_RESOLVED`, nemlig Cloudflare-beaconen (`static.cloudflareinsights.com/beacon.min.js/...`); den er den eneste konsolfejl. Anmodningerne til `adsbygoogle.js`, `region1.google-analytics.com/g/collect` og `googletagmanager.com/gtag/js` forekommer ikke længere i nogen af de 20 kørsler. De eneste værter i anmodningslisterne er `smartbolig.net`, `static.cloudflareinsights.com` (blokeret) og `fundingchoicesmessages.google.com` (hentes, se nedenfor). Det svarer til sidens samtykkestyring (`docs/samtykke.md`): Analytics og AdSense hentes først efter et ja i samtykkebeskeden, og beskeden er ikke udgivet endnu. Målingen viser derfor fortsat siden uden de scripts, netværket blokerer, og uden annoncer; ydeevne med annoncer og Cloudflare-beacon indlæst er ikke målt (gentag fra et netværk uden DNS-filter, eller i CI).

Øvrige målebetingelser som før: mobil bruger standardemuleringen (Moto G Power, simuleret langsom 4G, 4x CPU-nedsættelse, `throttlingMethod: simulate`), desktop `--preset=desktop`. "Overført" er `total-byte-weight`; "Requests" er antal poster i `network-requests` (inkl. den blokerede beacon). `/da/` svarede fra Cloudflares cache (`CF-Cache-Status: HIT`).

**Forbehold om WebGL (fra runde 2):** kørslerne bruger `--disable-gpu` som i baseline. Med `--disable-gpu` har headless Chrome kun software-tegning, og siden henter da ikke 3D-huset (se næste afsnit); kontrolkørslerne uden `--disable-gpu` er lavet som beskrevet i runde 2.

## Forbehold: 3D-huset indgår ikke i metodens tal

I runde 2 hentede Lighthouse `/_astro/house3d.B_BhrkPz.js` (ca. 172 KiB) på desktop. Den fil findes ikke længere (404). Siden er ændret siden: forsiden spørger først, om browseren kan tegne med et grafikkort (`src/lib/house3d/probe.mjs`), og huset tegnes i en worker. Forløbet står i `docs/3d-hus.md` ("Sådan virker workeren").

- Metodens kørsler bruger `--disable-gpu`, så headless Chrome kun har software-tegning. Efter `docs/3d-hus.md` er svaret da `none`: stillbilledet bliver stående, og three.js hentes ikke. Det passer med rapporterne: i de fire forsidekørsler og i gentagelsen forekommer hverken `house3d.*.js`, `remote.*.js` eller `worker-*.js` i anmodningslisten. Desktop-scorerne på 100 viser derfor forsiden med stillbilledet, som en besøgende uden grafikkort får den.
- I de to kontrolkørsler uden `--disable-gpu` (`/da/` og `/en/`) forekommer `remote.pzPMnxdL.js` (ca. 3,2 KB) og `worker-CdsPRrqg.js` i listen: huset startes i en worker. `house3d.DrddBP9V.js` er pakken til tegning på siden og hentes ikke på den vej. Lighthouse noterer ca. 2,7 KB overført for worker-filen; hentet med curl er den 174 336 B (brotli). Kontrolkørslernes "Overført" (325 KiB) har altså ikke hele worker-pakken med. Hvorfor Lighthouse' tal er lavere, er ikke undersøgt.
- Ikke målt i denne rapport: hvad huset koster for en besøgende med et rigtigt grafikkort, og mobil efter første berøring. `docs/3d-hus.md` ("Kvalitet og hastighed") har egne målinger af sidens tråd, mens huset starter.

## Resultater pr. URL og formfaktor

Samme format som runde 2.

### da-forside

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 98 | 100 | 96 | 100 | 2.4 s | 0 | 19 ms | 1.2 s | 435 KiB | 35 |
| desktop | 100 | 100 | 96 | 100 | 0.5 s | 0.021 | 0 ms | 0.4 s | 316 KiB | 30 |

### en-forside

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 98 | 100 | 96 | 100 | 2.3 s | 0 | 20 ms | 1.1 s | 397 KiB | 33 |
| desktop | 100 | 100 | 96 | 100 | 0.5 s | 0.021 | 0 ms | 0.4 s | 316 KiB | 30 |

### ha-guide

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 98 | 100 | 96 | 100 | 2.3 s | 0 | 37 ms | 1.2 s | 314 KiB | 35 |
| desktop | 100 | 100 | 96 | 100 | 0.6 s | 0 | 0 ms | 0.5 s | 315 KiB | 34 |

### esp32-guide

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 98 | 100 | 96 | 100 | 2.4 s | 0 | 47 ms | 1.4 s | 299 KiB | 36 |
| desktop | 100 | 100 | 96 | 100 | 0.5 s | 0 | 0 ms | 0.4 s | 299 KiB | 35 |

### produkt

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 98 | 100 | 96 | 100 | 2.4 s | 0 | 42 ms | 1.7 s | 324 KiB | 36 |
| desktop | 100 | 100 | 96 | 100 | 0.5 s | 0 | 0 ms | 0.4 s | 324 KiB | 35 |

### ai-nyheder

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 98 | 96 | 96 | 100 | 2.3 s | 0 | 20 ms | 1.3 s | 434 KiB | 46 |
| desktop | 100 | 96 | 96 | 100 | 0.6 s | 0 | 0 ms | 0.4 s | 475 KiB | 51 |

### ai-artikel

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 98 | 100 | 96 | 100 | 2.3 s | 0 | 20 ms | 1.4 s | 317 KiB | 32 |
| desktop | 100 | 100 | 96 | 100 | 0.5 s | 0 | 0 ms | 0.4 s | 318 KiB | 31 |

### privatliv

| Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 99 | 100 | 96 | 100 | 2.1 s | 0 | 21 ms | 1.6 s | 295 KiB | 32 |
| desktop | 100 | 100 | 96 | 100 | 0.5 s | 0 | 0 ms | 0.4 s | 295 KiB | 31 |

Overblik: Performance 98-100 på alle kørsler (mobil 98-99, desktop 100). Accessibility 100 på alle undtagen AI-nyhedsoversigten (96, begge formfaktorer). Best Practices 96 overalt. SEO 100 overalt. CLS er 0 på alle kørsler undtagen forsiderne på desktop (0,021).

## Baseline → runde 1 → runde 2 → efter redesign

Format: baseline → runde 1 → runde 2 → efter redesign. De tre første led er hentet ordret fra de tidligere README'er (via runde 2-rapportens tabeller); det fjerde er målt nu. Alle fire er enkeltmålinger.

### Scores

| Side | Formfaktor | Perf | A11y | BP | SEO |
|---|---|---|---|---|---|
| da-forside | mobile | 97 → 100 → 98 → 98 | 100 → 100 → 100 → 100 | 96 → 96 → 96 → 96 | 100 → 100 → 100 → 100 |
| da-forside | desktop | 100 → 100 → 60 → 100 | 100 → 100 → 100 → 100 | 96 → 96 → 96 → 96 | 100 → 100 → 100 → 100 |
| en-forside | mobile | 98 → 100 → 99 → 98 | 100 → 100 → 100 → 100 | 96 → 96 → 96 → 96 | 100 → 100 → 100 → 100 |
| en-forside | desktop | 100 → 100 → 60 → 100 | 100 → 100 → 100 → 100 | 96 → 96 → 96 → 96 | 100 → 100 → 100 → 100 |
| ha-guide | mobile | 96 → 100 → 98 → 98 | 100 → 100 → 100 → 100 | 92 → 96 → 96 → 96 | 100 → 100 → 100 → 100 |
| ha-guide | desktop | 100 → 100 → 100 → 100 | 100 → 100 → 100 → 100 | 92 → 96 → 96 → 96 | 100 → 100 → 100 → 100 |
| esp32-guide | mobile | 98 → 99 → 99 → 98 | 100 → 100 → 100 → 100 | 92 → 96 → 96 → 96 | 100 → 100 → 100 → 100 |
| esp32-guide | desktop | 100 → 100 → 100 → 100 | 100 → 100 → 100 → 100 | 92 → 96 → 96 → 96 | 100 → 100 → 100 → 100 |
| produkt | mobile | 100 → 99 → 100 → 98 | 97 → 100 → 100 → 100 | 92 → 96 → 96 → 96 | 100 → 100 → 100 → 100 |
| produkt | desktop | 89 → 100 → 100 → 100 | 97 → 100 → 100 → 100 | 92 → 96 → 96 → 96 | 100 → 100 → 100 → 100 |
| ai-nyheder | mobile | 99 → 99 → 98 → 98 | 100 → 100 → 96 → 96 | 96 → 96 → 96 → 96 | 100 → 100 → 100 → 100 |
| ai-nyheder | desktop | 100 → 100 → 100 → 100 | 100 → 100 → 96 → 96 | 96 → 96 → 96 → 96 | 100 → 100 → 100 → 100 |
| ai-artikel | mobile | 100 → 99 → 96 → 98 | 96 → 100 → 100 → 100 | 92 → 96 → 96 → 96 | 100 → 100 → 100 → 100 |
| ai-artikel | desktop | 100 → 100 → 100 → 100 | 96 → 100 → 100 → 100 | 92 → 96 → 96 → 96 | 100 → 100 → 100 → 100 |
| privatliv | mobile | 99 → 100 → 99 → 99 | 100 → 100 → 100 → 100 | 96 → 96 → 96 → 96 | 100 → 100 → 100 → 100 |
| privatliv | desktop | 100 → 100 → 100 → 100 | 100 → 100 → 100 → 100 | 96 → 96 → 96 → 96 | 100 → 100 → 100 → 100 |

### Metrikker

| Side | Formfaktor | LCP | CLS | TBT | Speed Index | Overført | Requests |
|---|---|---|---|---|---|---|---|
| da-forside | mobile | 2.3 s → 1.1 s → 2.3 s → 2.4 s | 0 → 0 → 0.001 → 0 | 110 ms → 54 ms → 6 ms → 19 ms | 1.5 s → 1.5 s → 1.1 s → 1.2 s | 429 KiB → 372 KiB → 496 KiB → 435 KiB | 21 → 20 → 24 → 35 |
| da-forside | desktop | 0.5 s → 0.3 s → 0.6 s → 0.5 s | 0.003 → 0 → 0.012 → 0.021 | 0 ms → 0 ms → 15781 ms → 0 ms | 0.5 s → 0.5 s → 6.3 s → 0.4 s | 580 KiB → 535 KiB → 552 KiB → 316 KiB | 22 → 21 → 20 → 30 |
| en-forside | mobile | 2.3 s → 1.1 s → 2.3 s → 2.3 s | 0 → 0 → 0.001 → 0 | 80 ms → 44 ms → 9 ms → 20 ms | 1.5 s → 1.5 s → 1.1 s → 1.1 s | 428 KiB → 372 KiB → 459 KiB → 397 KiB | 21 → 20 → 22 → 33 |
| en-forside | desktop | 0.5 s → 0.3 s → 0.6 s → 0.5 s | 0.041 → 0 → 0.012 → 0.021 | 0 ms → 0 ms → 15110 ms → 0 ms | 0.5 s → 0.5 s → 6.2 s → 0.4 s | 580 KiB → 534 KiB → 552 KiB → 316 KiB | 22 → 21 → 20 → 30 |
| ha-guide | mobile | 2.1 s → 1.2 s → 2.4 s → 2.3 s | 0 → 0 → 0 → 0 | 210 ms → 11 ms → 19 ms → 37 ms | 1.3 s → 1.2 s → 1.4 s → 1.2 s | 507 KiB → 470 KiB → 497 KiB → 314 KiB | 43 → 42 → 44 → 35 |
| ha-guide | desktop | 0.6 s → 0.3 s → 0.5 s → 0.6 s | 0.014 → 0 → 0 → 0 | 0 ms → 0 ms → 0 ms → 0 ms | 0.5 s → 0.5 s → 0.4 s → 0.5 s | 507 KiB → 470 KiB → 495 KiB → 315 KiB | 42 → 41 → 43 → 34 |
| esp32-guide | mobile | 2.4 s → 2.1 s → 2.1 s → 2.4 s | 0 → 0 → 0 → 0 | 50 ms → 39 ms → 43 ms → 47 ms | 1.5 s → 1.3 s → 1.8 s → 1.4 s | 509 KiB → 476 KiB → 478 KiB → 299 KiB | 44 → 43 → 44 → 36 |
| esp32-guide | desktop | 0.6 s → 0.5 s → 0.5 s → 0.5 s | 0.014 → 0 → 0 → 0 | 10 ms → 0 ms → 0 ms → 0 ms | 0.5 s → 0.5 s → 0.5 s → 0.4 s | 511 KiB → 481 KiB → 475 KiB → 299 KiB | 44 → 42 → 43 → 35 |
| produkt | mobile | 1.1 s → 2.1 s → 1.1 s → 2.4 s | 0 → 0 → 0 → 0 | 80 ms → 18 ms → 9 ms → 42 ms | 1.5 s → 1.1 s → 1.4 s → 1.7 s | 508 KiB → 470 KiB → 500 KiB → 324 KiB | 44 → 42 → 44 → 36 |
| produkt | desktop | 0.6 s → 0.3 s → 0.5 s → 0.5 s | 0.229 → 0 → 0 → 0 | 0 ms → 0 ms → 0 ms → 0 ms | 0.5 s → 0.4 s → 0.4 s → 0.4 s | 508 KiB → 470 KiB → 500 KiB → 324 KiB | 42 → 41 → 43 → 35 |
| ai-nyheder | mobile | 2.0 s → 2.1 s → 2.3 s → 2.3 s | 0 → 0 → 0 → 0 | 20 ms → 16 ms → 8 ms → 20 ms | 1.1 s → 1.1 s → 1.2 s → 1.3 s | 340 KiB → 344 KiB → 489 KiB → 434 KiB | 21 → 21 → 35 → 46 |
| ai-nyheder | desktop | 0.5 s → 0.3 s → 0.6 s → 0.6 s | 0.043 → 0 → 0 → 0 | 0 ms → 0 ms → 0 ms → 0 ms | 0.4 s → 0.4 s → 0.4 s → 0.4 s | 340 KiB → 345 KiB → 527 KiB → 475 KiB | 20 → 20 → 40 → 51 |
| ai-artikel | mobile | 1.4 s → 2.3 s → 2.7 s → 2.3 s | 0 → 0 → 0 → 0 | 10 ms → 10 ms → 12 ms → 20 ms | 1.4 s → 1.3 s → 1.3 s → 1.4 s | 502 KiB → 506 KiB → 500 KiB → 317 KiB | 40 → 40 → 41 → 32 |
| ai-artikel | desktop | 0.6 s → 0.6 s → 0.5 s → 0.5 s | 0.002 → 0 → 0 → 0 | 0 ms → 0 ms → 0 ms → 0 ms | 0.5 s → 0.4 s → 0.4 s → 0.4 s | 503 KiB → 507 KiB → 500 KiB → 318 KiB | 39 → 39 → 40 → 31 |
| privatliv | mobile | 2.0 s → 1.0 s → 2.3 s → 2.1 s | 0 → 0 → 0 → 0 | 40 ms → 18 ms → 9 ms → 21 ms | 1.1 s → 1.2 s → 1.6 s → 1.6 s | 377 KiB → 345 KiB → 366 KiB → 295 KiB | 20 → 19 → 21 → 32 |
| privatliv | desktop | 0.3 s → 0.3 s → 0.5 s → 0.5 s | 0.001 → 0 → 0 → 0 | 0 ms → 0 ms → 0 ms → 0 ms | 0.4 s → 0.4 s → 0.4 s → 0.4 s | 377 KiB → 340 KiB → 364 KiB → 295 KiB | 19 → 18 → 20 → 31 |

## Før og efter (baseline → nu)

Kun baseline (2026-11-13) og denne måling. Enkeltmålinger.

| Side | Formfaktor | Perf | A11y | BP | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| da-forside | mobile | 97 → 98 | 100 → 100 | 96 → 96 | 100 → 100 | 2.3 s → 2.4 s | 0 → 0 | 110 ms → 19 ms |
| da-forside | desktop | 100 → 100 | 100 → 100 | 96 → 96 | 100 → 100 | 0.5 s → 0.5 s | 0.003 → 0.021 | 0 ms → 0 ms |
| en-forside | mobile | 98 → 98 | 100 → 100 | 96 → 96 | 100 → 100 | 2.3 s → 2.3 s | 0 → 0 | 80 ms → 20 ms |
| en-forside | desktop | 100 → 100 | 100 → 100 | 96 → 96 | 100 → 100 | 0.5 s → 0.5 s | 0.041 → 0.021 | 0 ms → 0 ms |
| ha-guide | mobile | 96 → 98 | 100 → 100 | 92 → 96 | 100 → 100 | 2.1 s → 2.3 s | 0 → 0 | 210 ms → 37 ms |
| ha-guide | desktop | 100 → 100 | 100 → 100 | 92 → 96 | 100 → 100 | 0.6 s → 0.6 s | 0.014 → 0 | 0 ms → 0 ms |
| esp32-guide | mobile | 98 → 98 | 100 → 100 | 92 → 96 | 100 → 100 | 2.4 s → 2.4 s | 0 → 0 | 50 ms → 47 ms |
| esp32-guide | desktop | 100 → 100 | 100 → 100 | 92 → 96 | 100 → 100 | 0.6 s → 0.5 s | 0.014 → 0 | 10 ms → 0 ms |
| produkt | mobile | 100 → 98 | 97 → 100 | 92 → 96 | 100 → 100 | 1.1 s → 2.4 s | 0 → 0 | 80 ms → 42 ms |
| produkt | desktop | 89 → 100 | 97 → 100 | 92 → 96 | 100 → 100 | 0.6 s → 0.5 s | 0.229 → 0 | 0 ms → 0 ms |
| ai-nyheder | mobile | 99 → 98 | 100 → 96 | 96 → 96 | 100 → 100 | 2.0 s → 2.3 s | 0 → 0 | 20 ms → 20 ms |
| ai-nyheder | desktop | 100 → 100 | 100 → 96 | 96 → 96 | 100 → 100 | 0.5 s → 0.6 s | 0.043 → 0 | 0 ms → 0 ms |
| ai-artikel | mobile | 100 → 98 | 96 → 100 | 92 → 96 | 100 → 100 | 1.4 s → 2.3 s | 0 → 0 | 10 ms → 20 ms |
| ai-artikel | desktop | 100 → 100 | 96 → 100 | 92 → 96 | 100 → 100 | 0.6 s → 0.5 s | 0.002 → 0 | 0 ms → 0 ms |
| privatliv | mobile | 99 → 99 | 100 → 100 | 96 → 96 | 100 → 100 | 2.0 s → 2.1 s | 0 → 0 | 40 ms → 21 ms |
| privatliv | desktop | 100 → 100 | 100 → 100 | 96 → 96 | 100 → 100 | 0.3 s → 0.5 s | 0.001 → 0 | 0 ms → 0 ms |

## Læsning (målt, ikke vurderet)

Alle tal er enkeltmålinger; forskelle på få point eller få hundrede ms ligger inden for det, Lighthouse normalt svinger mellem kørsler (de to gentagelser nedenfor viser det).

- Forsider på desktop: Performance 100 (runde 2: 60), TBT 0 ms (runde 2: ca. 15 000 ms), Speed Index 0,4 s (runde 2: ca. 6,3 s). 3D-huset hentes ikke i metodens kørsler (se forbeholdet ovenfor), så tallene viser forsiden med stillbilledet. Mobil: Performance 98 på begge forsider (baseline 97 og 98), TBT 19-20 ms (baseline 110 og 80 ms).
- CLS på forsiderne på desktop er 0,021 (baseline 0,003 og 0,041; runde 2 0,012). Det er to skift i samme element, `section.home-hero > div.home-day > div.home-stage > div.home-stage__screen` (0,012 + 0,008). Kontrolkørslerne gav 0,008 (gentagelse) og 0,012 (uden `--disable-gpu`).
- Alle otte mobil-LCP ligger på 2,1-2,4 s (baseline 1,1-2,4 s; runde 2 2,1-2,7 s). Produktsiden på mobil er 1,1 s i baseline og 2,4 s nu; AI-artiklen 1,4 s i baseline og 2,3 s nu. LCP-elementet på forsiderne er fortsat stillbilledet `img.home-stage__poster`, og `lcp-discovery-insight` er bestået (`fetchpriority="high"`, opdagelig i dokumentet).
- Overført vægt er faldet på de fleste sider (AI-nyhedsoversigten 340 → 434 KiB og dansk forside på mobil er undtagelserne): forsider desktop 580 → 316 KiB (baseline → nu), guider/produkt/artikel ca. 500-510 → 299-324 KiB; forsiderne på mobil er 429 → 435 KiB (da) og 428 → 397 KiB (en), og privatliv 377 → 295 KiB. `googletagmanager.com/gtag/js` (ca. 196 KB i runde 2) forekommer ikke længere. Antallet af requests er i stedet steget (forside desktop 22 → 30, mobil 21 → 35; guider 42-44 → 34-36), fordi en Google Funding Choices-fil og fem 204-kald (`fundingchoicesmessages.google.com`, ca. 73 KB for scriptet) nu hentes på alle sider. Det er samtykkebeskedens indlæser (`docs/samtykke.md`, "Forløbet"): den spørger efter Googles besked på hver side, når siden er indlæst.
- AI-nyhedsoversigten: 46 requests på mobil (baseline 21); siden viser mange miniaturebilleder (`*-thumb.webp`, ca. 7-8 KB hver) ud over dagens billede (`2026-11-14.jpg`, 38 KB). Accessibility 96 (baseline 100) på grund af `target-size` for `a.story-title` (Lighthouse viser 290 x 24 px; den rå rapport siger 23,8 px i højden mod kravet på 24 px; samme fund som i runde 2). Linket har fået mere højde i samme ændring som denne rapport (`src/components/ai-news/StoryDigest.astro`); det er ikke målt igen i denne rapport.
- Det, baseline fandt, er væk: Best Practices 92 → 96 (giscus-CSP-blokeringen og `inspector-issues` er væk), Accessibility 97/96 → 100 på produkt og AI-artikel (`color-contrast` er ikke længere markeret), CLS 0,229 på produktsiden på desktop → 0, og `cache-insight` (giscus-GIF'en) markeres ikke længere. Giscus-værten forekommer ikke i nogen anmodningsliste.
- Uændret på alle 16 kørsler: `label-content-name-mismatch` (`a.sb-header__lang`, søgeknappen og `button.smartbolig-ai__launcher`), `unused-javascript` (nu kun Funding Choices-scriptet, ca. 36 KB af 72 KB), `network-dependency-tree-insight` og `render-blocking-insight` (`index.*.css`, på forsiderne også `HomeStyles.*.css`).

## Forsiderne og 3D-huset (/da/ og /en/)

Alle tal er fra de fire Lighthouse-rapporter for forsiderne. Enkeltmålinger.

| Måling | da mobil | da desktop | en mobil | en desktop |
|---|---|---|---|---|
| LCP-element | `div.home-stage > div.home-stage__screen > picture > img.home-stage__poster` | samme | samme | samme |
| LCP-ressource (netværk) | `/images/home/house-evening-960.avif`, 38 323 B | samme, 38 319 B | samme, 38 320 B | samme, 38 320 B |
| LCP, Lighthouse-metrik | 2,4 s (runde 2: 2,3 s) | 0,5 s (0,6 s) | 2,3 s (2,3 s) | 0,5 s (0,6 s) |
| LCP, observeret fordeling (ms: TTFB / indlæsningsforsinkelse / indlæsningstid / renderforsinkelse) | 373 / 13 / 45 / 60 | 365 / 11 / 31 / 93 | 372 / 11 / 34 / 68 | 337 / 10 / 24 / 88 |
| `fetchpriority="high"` på LCP-billedet | ja | ja | ja | ja |
| Opdagelig i det første dokument, ikke `loading=lazy` | ja | ja | ja | ja |
| `<link rel="preload" as="image">` | nej | nej | nej | nej |
| `lcp-discovery-insight` | bestået | bestået | bestået | bestået |

HTML'en (`/da/`, hentet med curl) har to `<link rel="preload" as="font">` (woff2) og ingen billed-preload; stillbilledet er et `<img ... loading="eager" fetchpriority="high" decoding="async">` i et `<picture>`. Som i runde 2 skyldes forskellen mellem Lighthouse-metrikken og den observerede fordeling, at mobilmetrikken er simuleret med netværks- og CPU-nedsættelse.

| Måling (runde 2 → nu) | da mobil | da desktop | en mobil | en desktop |
|---|---|---|---|---|
| TBT | 6 ms → 19 ms | 15 781 ms → 0 ms | 9 ms → 20 ms | 15 110 ms → 0 ms |
| CLS | 0,001 → 0 | 0,012 → 0,021 | 0,001 → 0 | 0,012 → 0,021 |
| Speed Index | 1,1 s → 1,2 s | 6,3 s → 0,4 s | 1,1 s → 1,1 s | 6,2 s → 0,4 s |
| Overført | 496 → 435 KiB | 552 → 316 KiB | 459 → 397 KiB | 552 → 316 KiB |
| Requests | 24 → 35 | 20 → 30 | 22 → 33 | 20 → 30 |
| Performance | 98 → 98 | 60 → 100 | 99 → 98 | 60 → 100 |

CLS-skiftet på desktop er to skift i `section.home-hero > div.home-day > div.home-stage > div.home-stage__screen` (0,012 og 0,008).

Anmodninger, der er nye eller væk i forhold til runde 2 (målt i de fire rapporter):

- Hentes ikke længere: `googletagmanager.com/gtag/js` (ca. 196 KB i runde 2) og `/_astro/house3d.B_BhrkPz.js` (ca. 172 KiB, desktop).
- Hentes: `HomeHouseScript.*.js` (ca. 5,9 KB; indeholder dynamiske `import()` af `house3d.DrddBP9V.js` og `remote.pzPMnxdL.js`), `fundingchoicesmessages.google.com/i/pub-...` (ca. 73 KB, prioritet Low) og fem 204-kald til samme vært. På mobil hentes desuden fem lazy-loadede emnebilleder (`/images/home/topic-*.avif`, på `/en/` tre), som i runde 2.
- Største ressourcer (overført), da mobil: Funding Choices-scriptet 73 057 B, `topic-home-assistant-960.avif` 45 818 B, `/_astro/fonts/d4669f4553080d4d.woff2` 44 107 B. Da desktop: Funding Choices 73 069 B, fonten 44 103 B, `house-evening-960.avif` 38 319 B, `ui-core.*.js` 28 335 B. Eget indhold alene er altså små filer; `en` er næsten identisk.
- `house3d.DrddBP9V.js` er 174 230 B (brotli, curl) og `remote.pzPMnxdL.js` 535 B, begge `Cache-Control: public, max-age=31536000, immutable`. Loaderen starter indlæsningen ved ledig tid (`requestIdleCallback`, timeout 3 s) for fine pegeredskaber uden `saveData`, ellers efter første `pointerdown`/`keydown`/`scroll`. Lighthouse hentede den ikke: med software-tegning bliver stillbilledet stående, og ellers tegnes huset i en worker (se forbeholdet øverst). Mobil efter første berøring/rul er IKKE målt.

Vigtigste Lighthouse-fund for forsiderne: `unused-javascript` (Funding Choices-scriptet, ca. 36 KB ubrugt af ca. 72 KB), `image-delivery-insight` (mobil: `topic-home-assistant-960.avif` ca. 21,8 KB og `house-evening-960.avif` ca. 21,7 KB; desktop: `house-evening-960.avif` ca. 16,5 KB), `render-blocking-insight` (`index.CKvHavee.css` 150 ms estimeret FCP-besparelse på mobil, `HomeStyles.D8TCAcRg.css`). Konsol, Accessibility 100, Best Practices 96 og SEO 100 er som i runde 2; `inspector-issues` er bestået på alle 16.

## Kontrolkørsler (afviger fra metoden, udenfor tabellerne)

| Kørsel | Perf | LCP | CLS | TBT | Speed Index | Overført |
|---|---|---|---|---|---|---|
| `/da/` desktop, som metoden (`--disable-gpu`), gentagelse | 100 | 0.5 s | 0.008 | 0 ms | 0.4 s | 316 KiB |
| `/da/` desktop, UDEN `--disable-gpu` (afviger fra metoden) | 100 | 0.5 s | 0.012 | 0 ms | 0.6 s | 325 KiB |
| `/en/` desktop, UDEN `--disable-gpu` (afviger fra metoden) | 100 | 0.5 s | 0.012 | 0 ms | 0.6 s | 325 KiB |
| `/da/juridisk/privatlivspolitik/` mobil, som metoden, gentagelse | 99 | 2.3 s | 0 | 24 ms | 1.1 s | 295 KiB |

De to GPU-kørsler afviger fra metoden ved at udelade `--disable-gpu` (så headless Chrome bruger standardgrafikvejen). I runde 2 gav samme kontrol 70 mod 60 med metoden; her er begge 100. Gentagelsen af `/da/` med metoden giver 100 mod 100 i hovedtabellen (CLS 0,008 mod 0,021), og gentagelsen af privatlivspolitikken på mobil 99 mod 99 (LCP 2,3 s mod 2,1 s). De fire kørsler viser, at scorerne ligger tæt på hovedtabellens; de beviser ikke noget om, hvad en besøgende med en rigtig GPU oplever (det er ikke målt). I de to kørsler uden `--disable-gpu` startede huset i en worker (se forbeholdet øverst), og TBT på sidens tråd var 0 ms.

## Sikkerhedsheaders: før og efter

Hentet med `curl.exe -sI` kl. 19:57 UTC; alle syv svar er sammenlignet med baseline og runde 2 (uden Date, ETag, CF-RAY og `x-request-id`, som varierer pr. svar). Baseline-værdierne er taget ordret fra `../2026-11-13-baseline/headers/` og dens README.

| Header | Baseline | Nu |
|---|---|---|
| `Content-Security-Policy` | til stede (håndhævet), `script-src` med `'unsafe-inline'` og `'wasm-unsafe-eval'`, hverken nonce eller hash | til stede (håndhævet), `script-src` stadig med `'unsafe-inline'` og `'wasm-unsafe-eval'`, hverken nonce eller hash |
| `Content-Security-Policy-Report-Only` | ikke til stede | NY, til stede på alle seks sider/filer undtagen `/api/chat`: `script-src 'self'` med fire `sha256-...`-hashes og `'wasm-unsafe-eval'`, UDEN `'unsafe-inline'` i `script-src`; `style-src` har stadig `'unsafe-inline'`; øvrige direktiver som den håndhævede |
| CSP `script-src`-værter | `static.cloudflareinsights.com`, `www.googletagmanager.com`, `www.google-analytics.com`, `cdn.ezoic.net`, `pagead2.googlesyndication.com`, `fundingchoicesmessages.google.com`, `www.googleadservices.com`, `adservice.google.com`, `ep1.`/`ep2.adtrafficquality.google`, `tpc.googlesyndication.com`, `*.googlesyndication.com`, `giscus.app` | `static.cloudflareinsights.com`, `*.googletagmanager.com`, `*.googlesyndication.com`, `fundingchoicesmessages.google.com`, `www.googleadservices.com`, `adservice.google.com`, `ep1.`/`ep2.adtrafficquality.google`, `giscus.app` (ingen `google-analytics.com`, `cdn.ezoic.net` eller `tpc.googlesyndication.com`) |
| CSP `style-src` / `font-src` | `'self' 'unsafe-inline' https://fonts.googleapis.com` / `'self' https://fonts.gstatic.com data:` | `'self' 'unsafe-inline' https://giscus.app` / `'self' data:` (uændret siden runde 1) |
| CSP `connect-src` | `'self'`, `cloudflareinsights.com`, `www.`/`region1.google-analytics.com`, `analytics.google.com`, `*.ezoic.net`, `*.googlesyndication.com` m.fl., `giscus.app` | `'self'`, `cloudflareinsights.com`, `*.google-analytics.com`, `*.google.com`, `*.google.dk`, `*.googletagmanager.com`, `*.g.doubleclick.net`, `*.googlesyndication.com`, `ep1.`/`ep2.adtrafficquality.google`, `giscus.app` |
| CSP `frame-src` | `'self'`, `fundingchoicesmessages.google.com`, `www.google.com`, `googleads.g.doubleclick.net`, `tpc.googlesyndication.com`, `*.googlesyndication.com`, `ep2.adtrafficquality.google`, `giscus.app` | som før, men uden `tpc.googlesyndication.com`, og med `www.googletagmanager.com` og `td.doubleclick.net` tilføjet |
| CSP øvrige direktiver | `frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; script-src-attr 'none'; worker-src 'self' blob:; img-src 'self' data: https: blob:` | uændrede |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | uændret |
| `X-Content-Type-Options` | `nosniff` | uændret |
| `X-Frame-Options` / `frame-ancestors` | `SAMEORIGIN` / `'self'` | uændret |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | uændret |
| `Permissions-Policy` | accelerometer, camera, geolocation, gyroscope, magnetometer, microphone, payment, usb slået fra | uændret |
| `Cross-Origin-Opener-Policy` | `same-origin` | uændret |
| `Cross-Origin-Resource-Policy` | `same-site` | uændret |
| `X-Permitted-Cross-Domain-Policies` / `X-XSS-Protection` | `none` / `0` | uændrede |
| `Cache-Control`, HTML-sider | `public, max-age=0, must-revalidate` | uændret |
| `Cache-Control`, hashede `/_astro/*` og fonte | `public, max-age=0, must-revalidate` | `public, max-age=31536000, immutable` (målt på `/_astro/index.CKvHavee.css`, `/_astro/ui-core.DdZDRPcq.js`, `/_astro/fonts/d4669f4553080d4d.woff2`, `/_astro/house3d.DrddBP9V.js`, `/_astro/remote.pzPMnxdL.js`; ændret første gang i runde 2) |
| `Cache-Control`, billeder | `public, max-age=0, must-revalidate` | uændret (målt på `/images/home/house-evening-960.avif`; øvrige billeder ikke kontrolleret) |
| `/api/chat` (HEAD) | 405, `Allow: POST`, `Cache-Control: no-store`, `referrer-policy: no-referrer`, `x-content-type-options: nosniff`, ingen CSP/HSTS | uændret |

| Sti | Status | Bemærkning |
|---|---|---|
| `/da/` | 200 | fuld sikkerhedsheader-pakke, `CF-Cache-Status: HIT` |
| `/da/home-assistant/dashboard-design/` (`guide.txt`) | 200 | samme headers (`CF-Cache-Status: MISS` nu, `HIT` i baseline) |
| `/api/chat` | 405 | `Allow: POST`, `Cache-Control: no-store`; ingen CSP/HSTS (som før) |
| `/robots.txt`, `/ads.txt`, `/.well-known/security.txt` | 200 | samme headers som siderne |
| `/llms.txt` | 200 | samme headers (`CF-Cache-Status: MISS` nu, `HIT` i baseline) |

Ud over de to `CF-Cache-Status`-forskelle og CSP-ændringerne ovenfor er der ingen forskel i nogen header mellem baseline og nu. De gemte filer er kontrolleret for `Set-Cookie`, `Cookie` og tokens: ingen af dem forekommer. Cloudflare `Report-To`-endpoint-tokens er erstattet med `<redacted>` i de gemte filer, som i de tidligere målinger.

## Feltdata (CrUX / Core Web Vitals)

Ikke målt: PageSpeed Insights API afviste begge kald uden nøgle (origin `https://smartbolig.net/` og forsiden `https://smartbolig.net/da/`, strategy=mobile) igen med HTTP 429, `RESOURCE_EXHAUSTED`, `Queries per day`. Svarene er gemt i `psi-origin.json` og `psi-da-forside.json`. Der foreligger derfor ingen CrUX-data; det siger intet om sidens feltdata. Feltdata afspejler under alle omstændigheder først redesignet efter en del dages besøg (rullende 28-dages vindue).

## Top Lighthouse-problemer på tværs af sider (efter redesign)

Samme optælling som før: antal af de 16 kørsler, hvor auditten ikke er bestået (score under 1; informative og ikke-relevante audits er ikke talt med). Runde 2-kolonnen er hentet ordret fra runde 2-rapporten.

| # | Problem | Rammer | Detalje | Runde 2 |
|---|---|---|---|---|
| 1 | Konsolfejl (`errors-in-console`) | 16/16 | kun den blokerede Cloudflare-beacon (runde 2: tre blokerede anmodninger) | 16/16 |
| 2 | Synligt label matcher ikke tilgængeligt navn (`label-content-name-mismatch`) | 16/16 | søgeknappen, `a.sb-header__lang` og `button.smartbolig-ai__launcher` | 16/16 |
| 3 | Ubrugt JavaScript (`unused-javascript`) | 16/16 | kun Funding Choices-scriptet, ca. 36 KB af 72 KB (runde 2: gtag ca. 75-78 KiB, på forsider desktop desuden `house3d`) | 16/16 |
| 4 | Netværksafhængighedstræ (`network-dependency-tree-insight`) | 16/16 | ikke undersøgt nærmere | 16/16 |
| 5 | Renderblokerende CSS (`render-blocking-insight`) | 16/16 | `index.*.css`, på forsider også `HomeStyles.*.css` | 16/16 |
| 6 | Interactive (`interactive`) | 8/16 | alle mobilkørsler; metrikken er simuleret (runde 2: 10/16 inkl. forsider desktop) | 10/16 |
| 7 | Billedlevering (`image-delivery-insight`) | 8/16 | forsider (4), AI-nyheder (2), AI-artikel (2) | 8/16 |
| 8 | Cache-levetider (`cache-insight`) | 0/16 | ikke længere markeret | 8/16 |
| 9 | LCP-anmodning kunne opdages tidligere (`lcp-discovery-insight`) | 2/16 | kun AI-artiklen (begge formfaktorer): `fetchpriority=high` mangler; ESP32-guiden består nu | 4/16 |
| 10 | Mål-størrelse (`target-size`) | 2/16 | AI-nyhedsoversigt, `a.story-title` (290 x 24 px) | 2/16 |

Metrik-audits, der også tæller som "ikke bestået" på mobil (simulerede metrikker): `largest-contentful-paint` 8/16, `max-potential-fid` 8/16 og `first-contentful-paint` 7/16, alle kun mobilkørsler. Væk i forhold til runde 2: `total-blocking-time`, `speed-index`, `mainthread-work-breakdown`, `bootup-time` og `valid-source-maps` på forsiderne på desktop, samt `unsized-images` (ESP32-guide) og `forced-reflow-insight` (produkt mobil), som runde 2 markerede. Nyt: `unused-css-rules` (1, AI-artikel desktop).

## Filer

- `README.md`: denne rapport.
- `headers/`: svar-headers (samme syv filnavne som før).
- `psi-origin.json`, `psi-da-forside.json`: PSI-API's fejlsvar (429).
- Ikke gemt her, som før: de rå Lighthouse-JSON-filer (20 kørsler, ligger i en søstermappe uden for repoet).
