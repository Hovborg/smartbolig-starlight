# Sikkerhed: hoveder, scripts og hemmeligheder

Sidst opdateret: 2026-11-14.
Kontrolleret ved: `npm run site:test` (`scripts/site-csp.test.mjs`), `npm run build` (den
strenge politik skrives i `dist/_headers`; bygningen stopper, hvis linjen er for lang) og den
byggede side i headless Chrome med de byggede hoveder: ingen overtrædelser af hverken den
gældende eller den strenge politik i forløbene uden svar, ja og nej.
Ikke kontrolleret: den strenge politik på den levende side med Googles rigtige scripts og
annoncer. Derfor er den kun rapporterende endnu (se "Den strenge politik").

## Kort

- Alle sikkerhedshoveder står ét sted: `public/_headers`. Cloudflare sætter dem på hvert svar.
- `Content-Security-Policy` (CSP) siger, hvor siden må hente scripts, stilark, billeder og rammer
  fra. Alt andet afvises af browseren.
- Siden har ingen hemmeligheder i repoet. Nøgler ligger som secrets i GitHub Actions og
  Cloudflare; navnene står i `docs/nyhedsflow.md`.
- Pakker opdateres af sig selv, og `npm audit` er en del af kontrollen før hver udgivelse. Se
  `docs/opdateringer.md`.

## Hovederne

| Hoved | Hvad det gør |
|---|---|
| `Content-Security-Policy` | Kun egne filer og de navngivne værter må hentes |
| `Strict-Transport-Security` | Kun HTTPS, også på underdomæner, i et år |
| `X-Frame-Options`, `frame-ancestors 'self'` | Siden kan ikke vises i en ramme på en anden side |
| `X-Content-Type-Options` | Browseren gætter ikke filtyper |
| `Referrer-Policy` | Andre sider får kun domænet at vide, ikke adressen |
| `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy` | Andre sider kan ikke nå sidens vindue eller filer |
| `Permissions-Policy` | Kamera, mikrofon, placering, betaling og USB er slået fra |

## Den strenge politik

Den gældende politik tillader scripts skrevet direkte i siden (`'unsafe-inline'` i
`script-src`). Det er den svageste del af politikken. Vejen væk fra den er i to trin:

1. **Nu:** bygningen laver en strengere politik uden `'unsafe-inline'` for scripts og sender
   den som `Content-Security-Policy-Report-Only`. Browseren følger stadig den gældende politik
   og skriver kun i konsollen, hvad den strenge ville have afvist.
2. **Senere:** når den levende side er set uden overtrædelser med samtykkebesked, Analytics og
   annoncer, sættes `ENFORCE_STRICT_CSP = true` i `scripts/finalize-build.mjs`. Så erstatter
   den strenge politik den gældende.

Sådan virker det:

- De små scripts, Astro ellers skriver ind i siden, bliver til filer (`config/vite.mjs`). Filer
  fra eget domæne er tilladt uden videre.
- De få scripts, der stadig står i siden (pt. 4, fx temavalget før første billede), får hver
  deres hash i politikken. `scripts/lib/csp-inline.mjs` regner dem ud af de byggede sider.
- Strukturerede data (`application/ld+json`) er ikke kode og tæller ikke med.
- Cloudflare ignorerer en linje i `_headers` på over 2.000 tegn. Bygningen stopper, hvis den
  strenge linje bliver længere.

Stilark må stadig skrives i siden (`style-src 'unsafe-inline'`). Astro og Starlight skriver
små stilark direkte i siden, og de skifter med indholdet.

## Hvor tingene ligger

| Sti | Indhold |
|---|---|
| `public/_headers` | Alle hoveder og den gældende politik |
| `scripts/lib/csp-inline.mjs` | Finder hashes og bygger den strenge politik |
| `scripts/finalize-build.mjs` | Skriver den strenge politik i `dist/_headers`. Her står `ENFORCE_STRICT_CSP` |
| `config/vite.mjs` | Små scripts som filer i stedet for i siden |
| `scripts/site-csp.test.mjs` | Tests af hashes, politikken og længdegrænsen |
| `functions/_middleware.js` | Workeren foran `/api/*` |

## Tilføj en vært

En ny tjeneste (et script, en ramme, et kald) virker først, når værten står i `public/_headers`:

1. Find direktivet: `script-src` for scripts, `connect-src` for kald, `frame-src` for rammer,
   `img-src` for billeder.
2. Tilføj værten med `https://` og uden sti. Brug `*.` kun, når tjenesten selv skifter
   underdomæne.
3. Kør `npm run site:test` og `npm run build`.
4. Sætter tjenesten cookies eller får den data om læseren, hører den under samtykket. Se
   `docs/samtykke.md`.

## Når noget ser forkert ud

| Du ser | Årsag og rettelse |
|---|---|
| Konsollen: "Refused to load ... violates the following Content Security Policy directive" | Værten mangler i det nævnte direktiv. Se "Tilføj en vært" |
| Konsollen: samme besked med "[Report Only]" | Kun den strenge politik ville have afvist det. Intet er blokeret. Notér det; det skal løses, før trin 2 |
| Bygningen stopper: "The strict Content-Security-Policy line is ... characters" | For mange scripts i siden eller for mange værter. Flyt et script til en fil, eller fjern en vært, der ikke bruges |
| Bygningen stopper: "script-src with 'unsafe-inline' is missing" | `script-src` i `public/_headers` er ændret. Enten er trin 2 gjort i hånden (så fjern den strenge linje fra bygningen), eller også mangler direktivet |
| Et nyt lille script virker lokalt, men ikke på siden, efter trin 2 | Det står i siden og har ingen hash. Bygningen regner hashes selv; byg igen, og se at tallet i bygningens sidste linjer er steget |

## Hemmeligheder

- Skriv aldrig en nøgle, et token eller en adgangskode i kode, dokumentation, tests, commits
  eller logfiler. Repoet er offentligt.
- Id'erne i `src/lib/consent/ids.mjs` og giscus-id'erne i `src/lib/comments.mjs` er ikke
  hemmelige: enhver browser ser dem.
- Skal en nøgle skiftes, står fremgangsmåden i `docs/nyhedsflow.md`.
