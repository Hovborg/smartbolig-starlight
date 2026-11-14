# SEO: hvad siden fortæller søgemaskiner

Sidst opdateret: 2026-11-14.
Kontrolleret ved: `npm run site:test`, `npm run build` og `npm run seo:validate` kørt på
grenen. Omdirigeringerne, `robots.txt` og `og:type` er set på den levende side med `curl`
efter udgivelsen (resultatet står i `docs/redesign/STATUS.md`).
Ikke kontrolleret: hvordan Google og Bing viser siderne. Det ses i Search Console og Bing
Webmaster Tools nogle dage efter en ændring.

## Hvor tingene ligger

| Sti | Indhold |
|---|---|
| `public/robots.txt` | Hvem der må hente hvad. Skrevet i hånden |
| `public/_redirects` | Gamle adresser, der sendes videre med 301 |
| `public/llms.txt` | Kort beskrivelse af siden til AI-søgemaskiner. Skrevet i hånden |
| `src/lib/seo/page-kind.ts` | Hvilken slags side en adresse er (forside, guide, nyhed, juridisk ...) |
| `src/lib/seo/schema-graph.ts` | Samler sidens strukturerede data (JSON-LD) af delene i `schema-*.ts` og `breadcrumbs.ts` |
| `src/lib/seo/social-meta.ts` | `og:`- og `twitter:`-felterne, herunder `og:type` |
| `src/lib/seo/dates.ts`, `page-text.ts`, `site.ts` | Datoer, titel og beskrivelse, sidens faste adresser |
| `src/components/Head.astro` | Sætter det hele i sidens `<head>` |
| `src/components/SiteTitle.astro` | Logoets link (`/da/` og `/en/` med skråstreg) |
| `src/pages/rss.xml.js` | RSS-feedet med nyheder |
| `scripts/finalize-build.mjs` | Sætter rigtige datoer (`lastmod`) i det sitemap, Starlight laver |
| `scripts/seo-validate.mjs`, `scripts/lib/seo-head-checks.mjs` | Kontrollerer de byggede sider. Køres som `npm run seo:validate` |
| `scripts/site-redirects.test.mjs`, `scripts/site-seo-checks.test.mjs` | Tests af omdirigeringerne og af kontrollerne selv |

Sitemap (`/sitemap-index.xml`) og RSS (`/rss.xml`) laves af sig selv ved hvert byg. De skal
ikke rettes i hånden.

## Regler, der er valgt med vilje

- **`robots.txt` har ingen gruppe til Googlebot eller Bingbot.** En crawler med sin egen
  gruppe læser ikke `*`-gruppen. Med en egen gruppe sprang de derfor `Disallow: /api/` og
  `Disallow: /pagefind/` over. De crawlere, der har en gruppe (AI-søgemaskiner, der er
  tilladt ved navn), gentager de to linjer. `seo:validate` stopper, hvis en af dem mangler.
- **Ingen `Crawl-delay`.** Google læser den ikke.
- **`/_index/` er ikke spærret i `robots.txt`.** Filerne har hovedet `X-Robots-Tag: noindex`,
  og det kan en søgemaskine kun se, hvis den må hente dem (`docs/assistent.md`).
- **Ingen HowTo-data.** Google viser ikke længere HowTo-resultater, og 50 af de 52 sider
  havde ugyldige data. FAQ-data (`FAQPage`) er beholdt.
- **`og:type` er `article` kun på guides og nyhedsudgaver**, altså de sider, der også har
  artikeldata. Forside, oversigter, juridiske sider, kontakt, om os og 404 er `website`.
- **Brødkrumme-data kræver mindst to led.** Forsiden har derfor ingen.
- **Faste regler står før regler med `*` i `_redirects`.** Cloudflare tæller alle regler efter
  den første med `*` mod en grænse på 100.

## Tilføj en omdirigering

1. Åbn `public/_redirects`. Skriv reglen som `/gammel-adresse /ny-adresse/ 301`.
2. Har reglen ingen `*`, skal den stå over den første regel med `*`.
3. Kør `node --test scripts/site-redirects.test.mjs`. Testen fejler, hvis rækkefølgen er
   forkert, eller hvis målet ikke findes som side.
4. Efter udgivelse: `curl -sI https://smartbolig.net/gammel-adresse` skal vise `301` og den
   nye adresse i `location`.

## Giv en crawler adgang ved navn

1. Tilføj en gruppe i `public/robots.txt`:

   ```text
   User-agent: NavnPåCrawler
   Allow: /
   Disallow: /api/
   Disallow: /pagefind/
   ```

2. Kør `npm run build` og `npm run seo:validate`.

## Fejlsøgning

| Det ser du | Årsag og løsning |
|---|---|
| `seo:validate`: "must not include HowTo JSON-LD" | En side bruger igen HowTo-data. Fjern det; se reglen ovenfor |
| `seo:validate`: "BreadcrumbList has 1 item(s); it needs at least 2" | En side uden forælder har fået brødkrummer. Se `src/lib/seo/breadcrumbs.ts` |
| `seo:validate`: "og:type is "article" on a page without article structured data" | `social-meta.ts` og `shouldRenderArticleSchema` i `page-kind.ts` er ikke enige om sidens slags |
| `seo:validate`: "expected at most one generator meta" | Både Astro og Starlight skriver feltet. `Head.astro` skal kun lade ét stå |
| `seo:validate`: en navngiven gruppe i `robots.txt` mangler `Disallow` | Tilføj de to `Disallow`-linjer i gruppen |
| En gammel adresse svarer 404 | Tilføj en regel i `_redirects` (se ovenfor) |
| En gammel adresse svarer 307 og derefter 200 | Linket mangler den afsluttende skråstreg. Ret linket, ikke omdirigeringen |

## Fjern en del

- En omdirigering: slet linjen og den tilhørende linje i `scripts/site-redirects.test.mjs`.
- Strukturerede data for én sidetype: fjern delen i `schema-graph.ts` og den kontrol i
  `seo-validate.mjs`, der kræver den.
