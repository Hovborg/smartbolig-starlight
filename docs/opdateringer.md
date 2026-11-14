# Automatiske opdateringer af pakker

Sidst kontrolleret: 2026-11-14.
Kontrolleret ved: `.github/dependabot.yml` og `.github/workflows/dependabot-automerge.yml`
læst mod GitHubs dokumentation for Dependabot og mod `dependabot/fetch-metadata` v3.1.0
(`action.yml` og README på den låste commit). Alle repoets kontroller er kørt på de
opdaterede pakker.
Ikke kontrolleret endnu: en rigtig pull request fra Dependabot er ikke gået gennem
auto-fletningen. Den første kommer mandagen efter udgivelsen.

## Kort

- Dependabot ser hver mandag efter nye versioner af npm-pakker og af GitHub Actions.
  Opsætningen står i `.github/dependabot.yml`.
- En ny version tages først, når den er 14 dage gammel. Sikkerhedsrettelser venter ikke.
- Små opdateringer af npm-pakker (minor og patch) samles i én pull request. Den flettes af
  sig selv, når kontrollen `deploy` er grøn på netop den commit
  (`.github/workflows/dependabot-automerge.yml`).
- Store opdateringer (major) og opdateringer af GitHub Actions bliver liggende som åbne pull
  requests. Dem ser et menneske på.
- En flettet opdatering kommer på siden ved næste udgivelse, senest med næste daglige
  nyhedskørsel. Her kører alle kontroller igen, før noget udgives.

## Hvorfor sådan

| Valg | Grund |
|---|---|
| 14 dages ventetid | En kompromitteret udgivelse bliver som regel opdaget og trukket tilbage inden for få dage. |
| Jobbet venter selv på `deploy` | `main` har ingen grenbeskyttelse, fordi nyhedskørslen pusher til `main`. GitHubs egen auto-fletning ville derfor flette med det samme. |
| `pull_request`, ikke `pull_request_target` | Kørslen får ingen af repoets hemmeligheder. Der hentes eller køres ingen kode fra pull requesten. |
| `--match-head-commit` | Kun den commit, kontrollen kørte på, kan blive flettet. |
| Major flettes ikke | En ny hovedversion kan ændre opførsel, som testene ikke fanger. |
| GitHub Actions flettes ikke | De kører med adgang til Cloudflare-nøglen, så en ændring skal ses af et menneske. |

## Når en pull request bliver liggende

| Det ser du | Det gør du |
|---|---|
| Titlen nævner én pakke og et nyt første tal (fx 7 til 8) | Læs pakkens ændringsliste, og flet i hånden (se nedenfor). |
| Titlen begynder med `chore(ci)` | Det er en GitHub Action. Se, at den nye version stadig er låst til en commit, og flet i hånden. |
| `deploy` er rød | Åbn kørslen, og find det trin, der fejlede. Ret fejlen på en gren, eller luk pull requesten; Dependabot åbner en ny, når der kommer en nyere version. |
| Jobbet "Dependabot auto-merge" er rødt | Læs trinnet "Merge". Oftest er `main` flyttet, så pull requesten skal opdateres: skriv kommentaren `@dependabot rebase`. |

## Sådan fletter du en åben opdatering i hånden

1. Hent grenen: `gh pr checkout <nummer>`.
2. Kør `npm ci`.
3. Kør kontrollerne fra `AGENTS.md` (afsnittet "Before publishing").
4. Flet: `gh pr merge <nummer> --squash`.
5. Se, at kørslen "Deploy to Cloudflare Workers" på `main` bliver grøn, og åbn siden.

## Sådan slår du det fra

- Kun auto-fletningen: slet `.github/workflows/dependabot-automerge.yml`. Dependabot åbner
  stadig pull requests.
- Alt: slet også `.github/dependabot.yml`.

Siden kører videre uden begge dele. Pakkerne bliver bare ikke opdateret af sig selv.

## En opdatering uden om Dependabot

Bruges, når `npm audit --audit-level=high` melder et fund, og Dependabot ikke har åbnet en
pull request endnu.

1. `npm audit fix`. Fejler den med `ERESOLVE`, så opdatér den pakke, fundet nævner, sammen
   med de pakker, den kræver (fx `npm install astro@<version> @astrojs/markdown-remark@<version>`).
2. Kør kontrollerne fra `AGENTS.md`.
3. Ret versionerne i `docs/oss.md`, og skriv en linje i `CHANGELOG.md`.
