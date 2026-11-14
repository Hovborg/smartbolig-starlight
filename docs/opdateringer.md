# Automatiske opdateringer af pakker

Sidst kontrolleret: 2026-11-14.
Kontrolleret ved:

- `.github/dependabot.yml` og `.github/workflows/dependabot-automerge.yml` er læst mod
  GitHubs dokumentation for Dependabot og mod kildekoden til `dependabot/fetch-metadata`
  v3.1.0 på den låste commit (`src/dependabot/update_metadata.ts`).
- Reglen for, hvad der flettes, er afprøvet på 17 eksempler (små og store opdateringer,
  0.x-pakker, tomme og ugyldige data).
- Dependabots advarsler og sikkerhedsrettelser er slået til i repoet og aflæst gennem
  GitHubs API.
- Alle repoets kontroller er kørt på de opdaterede pakker, og hele gennemgangen er set
  efter af en uafhængig model.

Ikke kontrolleret endnu: en rigtig pull request fra Dependabot er ikke gået gennem
auto-fletningen, og trinnet, der starter kontrollerne på `main` bagefter, har ikke kørt.
Se efter i den første uge (afsnittet "Når en pull request bliver liggende").

## Kort

- Dependabot ser efter nye versioner af npm-pakker og af GitHub Actions, første gang når
  opsætningen kommer på `main`, derefter hver mandag. Opsætningen står i
  `.github/dependabot.yml`.
- En ny version tages først, når den er 14 dage gammel. Sikkerhedsrettelser venter ikke:
  dem åbner Dependabot en pull request for, så snart GitHub kender fejlen.
- **Små opdateringer flettes af sig selv**, når kontrollen `deploy` er grøn på netop den
  commit (`.github/workflows/dependabot-automerge.yml`). Lille betyder: en rettelse (patch),
  eller en minor af en pakke, der er nået til version 1.
- **Disse bliver liggende som åbne pull requests**, til et menneske ser på dem:
  - en ny hovedversion (major),
  - en minor af en pakke under version 1 (`@astrojs/starlight`, `three`, `sharp`, `esbuild`):
    før version 1 kan en minor ændre opførsel,
  - opdateringer af GitHub Actions.
- En flettet opdatering kommer på siden ved næste udgivelse: næste ændring på `main`, eller
  næste nyhedskørsel, der udgiver en udgave. Her kører alle kontroller igen først.

## Hvorfor sådan

| Valg | Grund |
|---|---|
| 14 dages ventetid | En kompromitteret udgivelse bliver som regel opdaget og trukket tilbage inden for få dage. |
| Jobbet venter selv på `deploy` | `main` har ingen grenbeskyttelse, fordi nyhedskørslen pusher til `main`. GitHubs egen auto-fletning ville derfor flette med det samme. |
| `pull_request`, ikke `pull_request_target` | Kørslen får ingen af repoets hemmeligheder, og den henter ingen af repoets filer fra pull requesten. Selve workflow-filen kommer fra pull requesten; derfor de to job nedenfor. |
| To job | Den eneste fremmede kode (`dependabot/fetch-metadata`) kører i et job, der kun kan læse pull requesten. Jobbet, der kan flette, bruger ingen fremmed kode. |
| `--match-head-commit` | Kun den commit, kontrollen kørte på, kan blive flettet. |
| Major flettes ikke | En ny hovedversion kan ændre opførsel, som testene ikke fanger. |
| Minor af 0.x-pakker flettes ikke | Starlight 0.42 fjernede den mobilmenu-knap, som sidens stylesheet og assistentknap bygger på. Den slags fanger `deploy` ikke. |
| 0.x-pakkerne står uden for gruppen | I den samlede pull request ville én af dem holde alle de andre opdateringer tilbage hver uge. |
| GitHub Actions flettes ikke | En Action ændrer selve vejen, siden udgives ad, og der er få af dem. Dem ser et menneske på. |
| Kontrollerne startes på `main` efter fletningen | En fletning foretaget af et workflow starter ingen kørsel. Uden en grøn kørsel på `main` ville pakke-kontrollen blive ved med at regne lockfilen for ændret og kunne stoppe nyhedsudgivelsen ved et nyt fund (`scripts/security-audit.mjs`). Kørslen udgiver ikke noget. |

Accepteret risiko:

- Både npm-pakker og Actions kører i job, der har Cloudflare-nøglen. For små
  npm-opdateringer er værnet de 14 dage, lockfilens integritetskontrol (`npm ci`) og
  kontrollerne i `deploy`.
- Lander en automatisk fletning i det halve minut mellem nyhedskørslens push og dens
  udgivelse, udgiver den kørsel ikke noget (`main` er flyttet). Dagens udgave kommer så på
  siden ved næste udgivelse, senest næste dag. Kørslen på `main` efter fletningen udgiver
  med vilje ikke: en kørsel startet i hånden eller af et workflow kan aldrig udgive
  (`scripts/ai-news-workflow.test.mjs`).

## Når en pull request bliver liggende

| Det ser du | Det gør du |
|---|---|
| Titlen nævner én pakke og et nyt første tal (fx 7 til 8) | Læs pakkens ændringsliste, og flet i hånden (se nedenfor). |
| Titlen nævner `@astrojs/starlight`, `three`, `sharp` eller `esbuild`, og det midterste tal er nyt (fx 0.41 til 0.42) | Læs ændringslisten, prøv siden på grenen, og flet i hånden. Starlight 0.42 kræver først en ændring af `src/styles/chrome/header.css` og `src/components/SmartBoligAssistant.astro` (mobilmenu-knappen). |
| Titlen begynder med `chore(ci)` | Det er en GitHub Action. Se, at den nye version stadig er låst til en commit, og flet i hånden. |
| `deploy` er rød | Åbn kørslen, og find det trin, der fejlede. Ret fejlen på en gren, eller luk pull requesten; Dependabot åbner en ny, når der kommer en nyere version. |
| `deploy` var rød, er kørt om og er nu grøn, men intet flettes | Auto-fletningen var allerede færdig. Kør jobbet "Dependabot auto-merge" om på pull requesten (Re-run all jobs). |
| Jobbet "Dependabot auto-merge" er rødt | Læs trinnet "Merge". Oftest er `main` flyttet, så pull requesten skal opdateres: skriv kommentaren `@dependabot rebase`. |
| En ny pakke under version 1 er kommet til | Tilføj den under `exclude-patterns` i `.github/dependabot.yml`. Ellers holder dens minor-opdateringer gruppen tilbage. |

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
- Sikkerhedsrettelserne: GitHub → repoet → Settings → Advanced Security → Dependabot.

Siden kører videre uden det hele. Pakkerne bliver bare ikke opdateret af sig selv.

## En opdatering uden om Dependabot

Bruges, når `npm audit --audit-level=high` melder et fund, og Dependabot ikke har åbnet en
pull request endnu.

1. `npm audit fix`. Fejler den med `ERESOLVE`, så opdatér den pakke, fundet nævner, sammen
   med de pakker, den kræver (fx `npm install astro@<version> @astrojs/markdown-remark@<version>`).
2. Kør kontrollerne fra `AGENTS.md`.
3. Ret versionerne i `docs/oss.md`, og skriv en linje i `CHANGELOG.md`.
