# SEO: hvad siden fortæller søgemaskiner

Sidst opdateret: 2026-11-14.
Kontrolleret ved: `npm run site:test`, `npm run build` og `npm run seo:validate` kørt på
grenen, og en uafhængig gennemgang, der prøvede kontrollerne mod alle byggede sider.
Ikke kontrolleret: hvordan Google og Bing viser siderne. Det ses i Search Console og Bing
Webmaster Tools nogle dage efter en ændring. Om omdirigeringerne, `robots.txt` og `og:type`
er set på den levende side efter udgivelsen, står i `docs/redesign/STATUS.md`.

## Hvor tingene ligger

| Sti | Indhold |
|---|---|
| `public/robots.txt` | Hvem der må hente hvad. Skrevet i hånden |
| `public/_redirects` | Gamle adresser, der sendes videre med 301 |
| `scripts/write-llms-txt.mjs`, `scripts/lib/llms-txt.mjs`, `scripts/lib/llms-pages.mjs` | Skriver `dist/llms.txt` til AI-søgemaskiner ved hvert byg (efter sitemappet er færdigt). Overskrift, resumé og politik står i `llms-txt.mjs`; siderne og deres titler og beskrivelser læses fra de byggede sider |
| `src/lib/seo/page-kind.ts` | Hvilken slags side en adresse er (forside, guide, nyhed, juridisk ...) |
| `src/lib/seo/schema-graph.ts` | Samler sidens strukturerede data (JSON-LD) af delene i `schema-*.ts` og `breadcrumbs.ts` |
| `src/lib/seo/social-meta.ts` | `og:`- og `twitter:`-felterne, herunder `og:type` |
| `src/lib/seo/dates.ts`, `page-text.ts`, `site.ts` | Datoer, titel, søgetitel (`seoTitle`) og beskrivelse, sidens faste adresser |
| `src/components/Head.astro` | Sætter det hele i sidens `<head>` |
| `src/components/SiteTitle.astro` | Logoets link (`/da/` og `/en/` med skråstreg) |
| `src/pages/rss.xml.js` | RSS-feedet med guiderne (nyhederne har deres eget: `/da/ai/nyheder/rss.xml`) |
| `scripts/finalize-build.mjs` | Sætter rigtige datoer (`lastmod`) i det sitemap, Starlight laver |
| `scripts/lib/seo-llms-check.mjs` | Kontrollerer, at `llms.txt` findes, begynder rigtigt, og at hvert link er en side i sitemappet eller et kendt feed |
| `scripts/seo-validate.mjs`, `scripts/lib/seo-head-checks.mjs` | Kontrollerer de byggede sider. Køres som `npm run seo:validate` |
| `scripts/site-redirects.test.mjs`, `scripts/site-seo-checks.test.mjs` | Tests af omdirigeringerne og af kontrollerne selv |

Sitemap (`/sitemap-index.xml`), RSS (`/rss.xml`) og `llms.txt` laves af sig selv ved hvert byg. De skal
ikke rettes i hånden.

**Ændr et afsnit i `llms.txt`:** rækkefølgen og navnene står i `SECTIONS` i
`scripts/lib/llms-txt.mjs`; et nyt område under `src/content/docs/da/` skal tilføjes dér (eller i
`LEFT_OUT`, hvis det skal udelades), ellers stopper bygget og siger hvilket område. Dagens
AI-nyheder og de juridiske sider er udeladt med vilje (`locate()`),
og filen må højst fylde 100 KB, ellers stopper bygget. Teksten testes i `scripts/site-llms-txt.test.mjs`.

## Regler, der er valgt med vilje

- **`robots.txt` har ingen gruppe til Googlebot eller Bingbot.** En crawler med sin egen
  gruppe læser ikke `*`-gruppen. Med en egen gruppe sprang de derfor `Disallow: /api/` og
  `Disallow: /pagefind/` over. De crawlere, der har en gruppe (AI-søgemaskiner, der er
  tilladt ved navn), gentager de to linjer. `seo:validate` stopper, hvis en af dem mangler,
  også i `*`-gruppen, og hvis `Sitemap:`-linjen mangler.
- **Crawlere, der samler tekst til træning af AI, er spærret; dem, der henter en side for en
  bruger eller en søgning, er tilladt.** Hos Anthropic er `ClaudeBot` træningscrawleren
  (spærret), mens `Claude-User` og `Claude-SearchBot` følger `*`-gruppen. Hos OpenAI er
  `GPTBot` spærret, og `ChatGPT-User` og `OAI-SearchBot` er tilladt.
- **Ingen `Crawl-delay`.** Google læser den ikke.
- **`/_index/` er ikke spærret i `robots.txt`.** Filerne har hovedet `X-Robots-Tag: noindex`,
  og det kan en søgemaskine kun se, hvis den må hente dem (`docs/assistent.md`).
- **Ingen HowTo-data.** Google viser ikke længere HowTo-resultater, og 50 af de 52 sider
  havde ugyldige data. FAQ-data (`FAQPage`) er beholdt.
- **`og:type` er `article` kun på guides og nyhedsudgaver**, altså de sider, der også har
  artikeldata. Forside, oversigter, juridiske sider, kontakt, om os og 404 er `website`.
- **Brødkrumme-data kræver mindst to led.** Forsiden har derfor ingen.
- **En oversigtsside har kort overskrift og en længere søgetitel.** `title` ("Automationer") er
  overskrift, sidste led i brødkrummen og navn i strukturerede data; menunavne står i
  `config/sidebar/`. `seoTitle` ("Automationer til Home Assistant: opskrifter") står i `<title>`, `og:title` og `twitter:title`. Sider uden `seoTitle`
  bruger `title` alle steder. Reglerne for forfattere står i `CONTENT-GUIDE.md`.
- **Faste regler står før regler med `*` eller `:navn` i `_redirects`.** Cloudflare tæller alle
  regler efter den første af dem mod en grænse på 100 (brugt: 8).
- **En produktadresse uden afsluttende skråstreg får ét hop.** Reglerne med `:slug` sender
  `/produkter/shelly` direkte til `/da/produkter/shelly/`.
- **Ingen to regler med `*` eller `:navn` må kunne ramme samme adresse.** Cloudflare lader ikke
  den regel, der står først, vinde: på den levende side vandt `/produkter/*` over
  `/produkter/:slug` (set 2026-11-14). Derfor hedder reglen for alt dybere `/produkter/:slug/*`.
  Testen "no address made from a dynamic rule matches another dynamic rule" laver prøveadresser
  ud fra hver regel og fejler, hvis en af dem også rammer en anden regel.
- **`www.smartbolig.net` sendes til `smartbolig.net` hos Cloudflare, ikke i repoet.** `_redirects`
  kan ikke skelne mellem værter. Reglen hedder "smartbolig.net: www til hoveddomænet" og står
  under Rules → Redirect Rules i zonen; den gælder kun værten `www.smartbolig.net` (301, sti og
  forespørgsel bevares). Før 2026-11-14 svarede `www` med 200 og samme indhold som hoveddomænet.
  Kontrol: `curl -sI https://www.smartbolig.net/da/` skal svare 301 med
  `location: https://smartbolig.net/da/`. Fjernes ved at slette reglen samme sted.

## Tilføj en omdirigering

1. Åbn `public/_redirects`. Skriv reglen som `/gammel-adresse /ny-adresse/ 301`.
2. Har reglen hverken `*` eller `:navn`, skal den stå over den første regel, der har.
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
| `seo:validate`: "expected at most one generator meta" | Både Astro og Starlight skriver feltet. `keepFirstGenerator` i `src/lib/seo/social-meta.ts` skal kun lade ét stå |
| `seo:validate`: en navngiven gruppe i `robots.txt` mangler `Disallow` | Tilføj de to `Disallow`-linjer i gruppen |
| En gammel adresse svarer 404 | Tilføj en regel i `_redirects` (se ovenfor) |
| En gammel adresse svarer 307 og derefter 200 | Linket mangler den afsluttende skråstreg. Ret linket, ikke omdirigeringen |
| En gammel adresse får to hop (301 og så 301 eller 307) | To dynamiske regler rammer adressen, og Cloudflare valgte den anden. Gør reglerne adskilte, se ovenfor |

## Search Console, set 2026-11-14

Rapporten "Indeksering af sider" for `sc-domain:smartbolig.net` viste 257 indekserede sider og
251 ikke indekserede:

| Årsag i rapporten | Sider | Hvad det er |
|---|---|---|
| Alternativ side med korrekt kanonisk tag | 98 | Forventet: sider, der peger på en anden adresse som den rigtige |
| Crawlet, endnu ikke indekseret | 86 | Google har hentet siden, men ikke taget den med. Kan ikke rettes med en indstilling |
| Ikke fundet (fejl 404) | 24 | Gamle adresser. 19 sendes allerede videre med 301; Google har ikke hentet dem igen |
| Side med omdirigering | 23 | Forventet: gamle adresser, der sendes videre |
| Registreret, endnu ikke indekseret | 18 | Google kender adressen, men har ikke hentet den endnu |
| Dublet uden kanonisk side valgt af brugeren | 2 | Ikke undersøgt |

Af de 24 adresser svarede fem stadig 404 på den levende side samme dag (de 19 andre blev
sendt videre til en side, der svarer 200). Tre af de fem har fået en regel i `_redirects`:
`/da/legal/affiliate-disclosure/`, `/da/automations/` og `/da/index.xml`. To er ladt være:
`/search?q={search_term_string}` er en skabelon fra et gammelt søgefelt i de strukturerede
data (siden har ingen søgeadresse, og feltet er fjernet), og `/cdn-cgi/l/email-protection`
tilhører Cloudflare.

Samtidig har resten af de danske sider under de gamle engelske sektionsnavne fået samme regel
som deres engelske tvillinger (`/da/legal/…`, `/da/about/`, `/da/contact/`, `/da/security/`) og
feed-adresserne `/index.xml` og `/en/index.xml`; de svarede også 404, men stod ikke i rapporten.

Samme dag er `sitemap-index.xml` sendt ind igen, og indeksering er anmodet for værktøjssiderne
(`/da/vaerktoejer/` og de fire værktøjer på dansk, og `/en/vaerktoejer/`), som Google ikke
kendte. Det gøres i feltet øverst i Search Console: skriv adressen, vent på svaret, og tryk
"Anmod om indeksering". Google tager omkring ti adresser om dagen.

## Fjern en del

- En omdirigering: slet linjen og de tilhørende linjer i `scripts/site-redirects.test.mjs`.
- Strukturerede data for én sidetype: fjern delen i `schema-graph.ts` og den kontrol i
  `seo-validate.mjs`, der kræver den.
