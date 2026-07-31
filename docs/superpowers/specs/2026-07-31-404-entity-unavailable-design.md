# 404: "entity unavailable" (design)

**Dato:** 2026-07-31
**Status:** implementeret
**Fil:** `src/pages/404.astro`

## Problem

Den tidligere 404-side var visuelt løsrevet fra resten af sitet: indigo/lilla
gradient (`#1a1a2e` → `#16213e`, accent `#818cf8`) og hus-emoji, mens sitet selv
kører den mørke editorial-palet fra `HomeStyles.astro` (`#0a0e13`, cyan `#67e8f9`,
Charter-serif overskrifter, mono-eyebrow). Den hjalp heller ikke den besøgende
videre: fire faste "populære guides" er det samme svar uanset hvad der blev
efterspurgt.

## Koncept

Siden renderes som et Home Assistant dashboard-kort, hvor entiteten er
`unavailable`. Det er målgruppens eget sprog (Home Assistant + ESP32), og det
gør fejlsiden læsbar som diagnostik i stedet for en undskyldning.

Kortet indeholder:

- `sensor.side_du_soegte` med tilstanden `unavailable` og badge `HTTP 404`
- en 24-timers tilstandshistorik, hvor de sidste tre felter er nede
- attributter i HA-stil: `state`, `requested_path`, `device_class`, `restored`,
  `last_changed`
- en logbog med tidsstempler regnet ud fra sideindlæsning

`requested_path` viser den faktiske sti der fejlede, og `last_changed` tæller op
fra sideindlæsning, så kortet opfører sig som en levende entitet.

## Humor

Vittighederne er skrevet separat på dansk og engelsk, ikke oversat: de lander kun
hvis hvert sprog får sin egen formulering.

Den ligger i detaljer der er *rigtige* i Home Assistant, ikke i påklistrede
jokes: `device_class: skuffelse` / `disappointment`, og `restored: true`, som er
præcis hvad man ser på en entitet der ikke findes længere men huskes fra forrige
kørsel. Logbogen slutter på `smartbolig.net: prøver igen om aldrig`.

Knappen "Genstart Home Assistant" er selve pointen. Den sætter tilstanden til
`restarting`, kører animationen, og lander så tilbage på `unavailable` med en ny
logbogslinje. Tre klik eskalerer ("Genstart nr. 2. Stadig ingenting."), og
derefter fjerner knappen sig selv. Den står i logbogen, ikke blandt de rigtige
knapper, så den ikke konkurrerer med navigationen.

Overskriften over de populære links siger `Sider der rent faktisk svarer` /
`Pages that do respond`, hvilket både er sjovere og mere præcist end "populære
guides".

## "Mente du?"

Den reelle brugsværdi. Ved build genereres et indeks over alle rigtige sider fra
`getCollection('docs')` (188 sider, 94 pr. sprog). Daterede AI-nyhedssider
udelades: der er ~124 af dem, og "mente du 2026-03-11?" er aldrig et brugbart
svar.

Klienten scorer den brudte sti mod indekset med en Dice-koefficient over
tegn-bigrammer, plus 0,15 bonus når topniveau-sektionen er den samme. Tærskel
0,34, maks. tre forslag. Under tærsklen vises sektionen ikke, så en tilfældig
sti ikke får misvisende forslag.

Kun kandidater med den besøgendes eget sprogpræfiks foreslås.

## Begrænsninger der styrer designet

- **Én statisk fil.** Cloudflare serverer `dist/404.html` for enhver ukendt sti,
  så siden bygges kun én gang. Dansk er build-tidens sprog, og et inline-script
  skifter til engelsk ved runtime. Derfor kan Astro ikke sprogdetektere her.
- **Sprogvalg.** `/en/`-præfiks giver engelsk, `/da/` giver dansk. Uden præfiks
  (fx `/kaputt-side/`) afgør `navigator.languages` det, så en engelsktalende der
  rammer en præfiksløs død URL ikke får dansk. Forslagene følger samme valg.
- **Ingen dynamiske DOM-noder til stylede elementer.** Astro scoper `<style>` via
  en genereret klasse, som JS-skabte elementer ikke får. Forslagsrækker og
  historikfelter renderes derfor server-side og fyldes/afsløres af JS.
- **`scripts/seo-validate.mjs`** kræver den danske meta-description ordret,
  `og:type=website`, `noindex, nofollow` og `WebPage` JSON-LD, og forbyder
  `TechArticle` samt `https://smartbolig.net/404/#article`.
- **Tema.** Starlight gemmer valget i `localStorage['starlight-theme']`;
  `astro.config.mjs` tvinger dark for nye besøgende. 404-siden læser samme nøgle
  før paint, så temaet ikke blinker.
- **Sikkerhed.** Stien er besøgende-kontrolleret og sættes udelukkende med
  `textContent`, aldrig `innerHTML`.

## Verifikation

`npm run build`, `npm run seo:validate`, `npm run ai-news:validate` samt en
Playwright-kørsel mod `dist/` med en server der efterligner Cloudflares
404-fallback. Dækker: HTTP 404-status, dansk og engelsk tekst, sprogvalg fra
browseren på præfiksløse stier, at forslagene rammer den rigtige guide og selv
svarer 200, genstart-gaggets tre trin og at knappen forsvinder bagefter, at
tilstandsfarven falder tilbage til amber, lyst tema, ingen forslag ved
nonsens-stier eller direkte `/404`, ingen vandret overflow ved 390 px, og at
`<img src=x onerror=...>` i stien rendres som tekst.

Bemærk ved fejlsøgning: Astro lægger de scopede styles i en separat
`/_astro/404.*.css`. En testserver der svarer `text/html` på den fil får Chrome
til at afvise den, og siden ser ustylet ud uden at noget er galt med koden.
