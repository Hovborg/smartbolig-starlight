# Det omkring siden: domæne, Cloudflare, søgemaskiner og konti

Sidst opdateret: 2026-11-14.
Sidst kontrolleret: 2026-11-14.
Kontrolleret ved: zonens indstillinger og DNS-poster læst gennem Cloudflares API; repoets
indstillinger læst med `gh repo view`; `curl -sI` mod `www.smartbolig.net`, `http://smartbolig.net`
og `https://smartbolig.net`; Search Console og Bing Webmaster Tools set i browseren.
Ikke kontrolleret: AdSense, Google Analytics og Partner-Ads bag login (se
`docs/redesign/TIL-EJEREN.md`).

Dette dokument dækker det, der ikke ligger i repoet, men som siden afhænger af. Det, der
ligger i repoet, står i sit eget dokument:

| Emne | Dokument |
|---|---|
| Udgivelse, kontroller, vej tilbage | `AGENTS.md`, `README.md` |
| Sikkerhedshoveder, CSP, repoets indstillinger på GitHub | `docs/sikkerhed.md` |
| Omdirigeringer, sitemap, `robots.txt`, strukturerede data, Search Console-rapporten | `docs/seo.md` |
| Samtykke, Google Analytics og AdSense i koden | `docs/samtykke.md`, `docs/indtjening.md` |
| Sidevagten | `docs/overvaagning.md` |
| Automatiske opdateringer | `docs/opdateringer.md` |
| Nyhedsflowet og dets hemmeligheder | `docs/nyhedsflow.md` |

## Kort

- Siden er en Cloudflare Worker med statiske filer på `smartbolig.net`. `www` og `http` sendes
  videre til `https://smartbolig.net` med 301.
- DNS ligger hos Cloudflare. Mail til domænet går til Google Workspace.
- Google Search Console og Bing Webmaster Tools kender siden og har dens sitemap. Hver
  udgivelse fortæller IndexNow, hvilke sider der er ændret.
- Alt her er gratis. Intet af det kræver daglig pasning.

## Cloudflare-zonen

Zonen `smartbolig.net` har også andre underdomæner, som ikke hører til denne side. En
zoneindstilling gælder dem alle. Ændr derfor kun en zoneindstilling, når den er sikker for alt
på zonen, og rør aldrig de andre underdomæners DNS-poster herfra.

Aflæst 2026-11-14:

| Indstilling | Værdi | Betydning |
|---|---|---|
| Mindste TLS-version | 1.2 | Ændret fra 1.0 samme dag. Vej tilbage: sæt den til 1.0 under SSL/TLS → Edge Certificates |
| SSL-tilstand | Full (strict) | |
| Always Use HTTPS | til | `http://` sendes videre med 301 |
| TLS 1.3 | til, med 0-RTT | |
| HTTP/3 | til | |
| Brotli | til | |
| Early Hints | til | |
| HSTS i zonen | fra | Workeren sender selv `Strict-Transport-Security` (`public/_headers`) |
| Rocket Loader, minify | fra | Skal blive fra: de ændrer sidens scripts, og den strenge CSP ville afvise dem |
| E-mail-tilsløring | til | Giver adressen `/cdn-cgi/l/email-protection`, som Search Console melder som 404. Det er Cloudflares, ikke sidens |
| Always Online, udviklingstilstand | fra | |

Workerens egne indstillinger (ruter, bindinger, hastighedsgrænsen for assistenten) står i
`wrangler.jsonc` og udgives med koden.

## DNS og mail

Aflæst 2026-11-14 (kun de poster, siden bruger):

| Post | Indhold | Bemærkning |
|---|---|---|
| `smartbolig.net` og `www` | Cloudflare, gennem proxy | Workeren svarer på `smartbolig.net`; `www` sendes videre |
| MX | Google Workspace (fem poster) | |
| TXT, SPF | `v=spf1 include:_spf.google.com ~all` | Kun Google må sende mail fra domænet |
| TXT, `_dmarc` | `p=none` med rapporter til ejeren | Overvåger kun. Bør blive `quarantine`, når DKIM er sat op |
| DKIM | findes ikke (`google._domainkey` har ingen post) | Kræver ejerens login i Google Admin, se `TIL-EJEREN.md` |
| TXT, `google-site-verification` | to poster | Ejerskab for Google Search Console. Slet dem ikke |
| CNAME, `0bdcfcae392931c5e40b0021384901be` | `verify.bing.com`, uden proxy | Ejerskab for Bing Webmaster Tools. Slet den ikke |
| TXT, `ezoic-domain-verification` | en gammel post | Ezoic bruges ikke længere. Kan slettes af ejeren |

Kontrollér en post uden Windows' DNS-cache:
`nslookup -type=TXT _dmarc.smartbolig.net 1.1.1.1`. En helt ny post kan en resolver svare
"findes ikke" på i nogle minutter, hvis den er spurgt lige før posten blev oprettet; spørg da
`dns.google` eller zonens egen navneserver.

## Søgemaskiner

### Google Search Console

- Ejendommen er `sc-domain:smartbolig.net`. `sitemap-index.xml` er sendt ind (sidst 2026-11-14).
- Sitemap-filen skrives af bygget; der er intet at gøre ved en ny side.
- Anmod om indeksering af en vigtig ny side: skriv adressen i feltet øverst, vent på svaret,
  og tryk "Anmod om indeksering". Google tager omkring ti adresser om dagen.
- Hvad rapporten "Indeksering af sider" viste, og hvad der blev gjort ved det: `docs/seo.md`,
  "Search Console, set 2026-11-14".

### Bing Webmaster Tools

- Oprettet 2026-11-14 med ejerens Google-konto (kun navn og mailadresse deles med Microsoft).
- Siden er tilføjet manuelt og bekræftet med CNAME-posten i tabellen ovenfor. Import fra
  Search Console er valgt fra: den giver Bing adgang til alle ejendomme i Search Console.
- `sitemap-index.xml` er sendt ind. IndexNow-siden viste 743 modtagne adresser samme dag.
- Fjern det igen: slet siden i Bing Webmaster Tools, og slet derefter CNAME-posten.

### IndexNow

`deploy.yml` sender efter hver udgivelse en liste til `api.indexnow.org` (trinnet "Ping
IndexNow"): de faste sektionsadresser og de sider, hvis `.mdx`-fil blev ændret i udgivelsen.
Nøglen er hemmeligheden `INDEXNOW_KEY` i repoet, og dens fil ligger på siden som
`https://smartbolig.net/<nøglen>.txt`. Fejler trinnet, fejler udgivelsen ikke. Bing, Yandex og
andre, der bruger IndexNow, får listen; Google bruger den ikke.

## Konti

| Tjeneste | Bruges til | Hvor det er beskrevet |
|---|---|---|
| Cloudflare | Worker, DNS, Workers AI (assistenten og nyhederne) | Dette dokument, `docs/assistent.md`, `docs/nyhedsflow.md` |
| GitHub | Kode, udgivelse, nyhedskørsler, sidevagt, kommentarer (Giscus bruger Discussions) | `docs/sikkerhed.md`, `docs/overvaagning.md` |
| Google Search Console | Indeksering | Ovenfor og `docs/seo.md` |
| Bing Webmaster Tools | Indeksering | Ovenfor |
| Google Analytics | Statistik efter et ja | `docs/samtykke.md` |
| Google AdSense | Samtykkebesked og annoncer efter et ja | `docs/samtykke.md`, `docs/indtjening.md` |
| Partner-Ads | Reklamelinks til butikker | `docs/indtjening.md` |
| Energinet (Energi Data Service) | Elpriser til værktøjerne. Ingen konto: åbne data, CC BY 4.0 | `docs/vaerktoejer.md` |

Ingen adgangskode, nøgle eller token står i repoet. Hemmelighederne til udgivelse og nyheder
ligger som GitHub Actions-hemmeligheder (`docs/sikkerhed.md`, "Hemmeligheder").

## Repoet på GitHub

Aflæst 2026-11-14 med `gh repo view`:

- Offentligt. Beskrivelse, hjemmeside (`https://smartbolig.net`) og otte emneord er sat.
- Issues og Discussions er slået til; wikien er slået fra.
- Ingen licensfil. Koden er altså ikke givet fri til genbrug. Om den skal have en licens, er
  ejerens valg (`TIL-EJEREN.md`).
- `main` må ikke få grenbeskyttelse, der kræver gennemgang: nyhedskørslen skubber til `main`.
  Regelsættet mod tvangsskub og sletning er beskrevet i `docs/sikkerhed.md`.

## Når noget ser forkert ud

| Tegn | Gør dette |
|---|---|
| Siden svarer ikke eller viser fejl efter en udgivelse | `npx wrangler deployments list`, og gå tilbage med `npx wrangler rollback <forrige version> -m "<besked>" -y`. De seneste versioner står i `docs/redesign/STATUS.md` |
| `www.smartbolig.net` viser noget andet end siden | Se DNS-posten for `www` og omdirigeringsreglen i Cloudflare (Rules → Redirect Rules) |
| Search Console melder mange nye 404 | Se `docs/seo.md`, "Tilføj en omdirigering" |
| Bing eller Google mister ejerskabet | En af bekræftelsesposterne i DNS er slettet. Opret den igen fra tjenestens side |
| Mail fra domænet havner i spam | SPF findes; DKIM mangler. Se `TIL-EJEREN.md` |
| Sidevagten har åbnet en sag | `docs/overvaagning.md`, "Når noget ser forkert ud" |
