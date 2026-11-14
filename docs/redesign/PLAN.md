# Redesign 2026-11: samlet plan

Mål: smartbolig.net i nyt design på begge sprog, med smarte funktioner, daglige
AI-nyheder der udgiver sig selv, og drift uden manuelt arbejde på gratis niveauer.

Status pr. fase står i [STATUS.md](STATUS.md). Valg og begrundelser står i
[BESLUTNINGER.md](BESLUTNINGER.md). Udgangspunktet er målt i
[../measurements/2026-11-13-baseline/README.md](../measurements/2026-11-13-baseline/README.md).
Målingen efter redesignet:
[../measurements/2026-11-14-efter-redesign/README.md](../measurements/2026-11-14-efter-redesign/README.md).

## Udgangspunkt (målt 2026-11-13)

- Lighthouse er allerede høj: mobil 96–100, desktop 89–100 (produktsiden har CLS 0,229 på desktop).
  Redesignet må ikke gøre tallene dårligere.
- Search Console: 392 klik fra Google på ca. tre måneder, 257 indekserede og 251 ikke-indekserede sider.
  Indtjeningen er derfor lille i dag; trafikken skal op, før annoncer og købslinks betyder noget.
- 147 af 194 sider uden for nyhederne har ingen billeder eller illustrationer.
- AI-nyhederne er ikke udkommet siden 2026-09-10. Tre årsager oven på hinanden:
  tekstkontrollen afviste 19 kørsler, afhængighedskontrollen stoppede 25, og siden 2026-10-31
  kan værten ikke læse GitHub-login (fra 2026-11-03 afviser git mappen pga. ny Windows-konto).
- `main` kan ikke udgives: `npm audit` melder tre høje fund (undici, vite, zod).

## Faser

| Fase | Indhold | Færdig når |
|---|---|---|
| 1. Drift i orden | Afhængigheder opdateret, åbne PR'er afklaret, nyhedsflow i GitHub Actions med automatisk udgivelse og mere træfsikker tekstkontrol, Scheduled Task pensioneret | CI grøn på `main`, en nyhed udgivet af workflowet uden manuel hjælp |
| 2. Fundament | Designsystem (tokens, lyst/mørkt), opdelt konfiguration, ny ramme om guides, egne Astro-sider til forside og oversigter, illustrationsmotor, 3D-hus, delingsbilleder | Alle sidetyper i nyt design på preview, Lighthouse ≥ udgangspunkt |
| 3. Indhold | Gennemgang af alle guides (ældste først, begge sprog), illustrationer på alle sider, nye guides, interne links | Ingen side uden billede, indholdskontrol uden fejl |
| 4. Smarte funktioner | AI-assistent med egne kilder, søgning i almindeligt sprog, automationsbygger, elpris- og besparelsesberegner, udstyrsvælger, Zigbee-kompatibilitet, 3D-hus | Hver funktion testet på mobil og med enkel udgave |
| 5. SEO, sikkerhed, indtjening | Product-data, CSP uden `'unsafe-inline'`, annoncepladser, GA4-hændelser, købslinks i guides, prisdata | `seo:validate` grøn, sikkerhedstjek uden åbne fund |
| 6. Omverden og drift | Search Console, Bing/IndexNow, Cloudflare-indstillinger, DNS/mail, YouTube, GitHub-metadata, overvågning, automatiske opdateringer | Sitemap indsendt, overvågning kører selv |
| 7. Overdragelse | Dokumentation afprøvet af en ny underagent, slutmålinger, liste til ejeren | Tre prøveopgaver løst ud fra dokumentationen alene |

## Regler for hver udgivelse

1. Ændringen ligger på en gren og har en PR.
2. PR'ens CI har bestået alle kontroller i `AGENTS.md`.
3. Et uafhængigt review er gennemført, og fund er rettet.
4. Vejen tilbage er kendt: `npx wrangler rollback` til forrige Worker-version (afprøvet i fase 1).
5. Den levende side kontrolleres efter udgivelsen.

## Grænser

- Ingen udgifter og ingen betalte kampagner.
- Kun smartbolig.net; hubben og andre projekter røres ikke.
- Ingen hemmeligheder i kode, logfiler eller dokumentation.
- Fakta kontrolleres mod kilder. Ingen opdigtede produkter, priser eller test.
