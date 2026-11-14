# Automatiske opdateringer af pakker

Sidst kontrolleret: 2026-11-14.
Kontrolleret ved:

- `.github/dependabot.yml` og `.github/workflows/dependabot-automerge.yml` er læst mod
  GitHubs dokumentation for Dependabot og mod kildekoden til `dependabot/fetch-metadata`
  v3.1.0 på den låste commit (`src/dependabot/update_metadata.ts`).
- Reglerne for, hvad der flettes, afprøves af `scripts/site-dependabot.test.mjs` (små og
  store opdateringer, 0.x-pakker, tomme og ugyldige data, ændrede filer). Testen kører med
  `npm run site:test` og dermed i `deploy`. Den del, der bruger `jq`, springes over på en
  maskine uden `jq`.
- Dependabots advarsler og sikkerhedsrettelser er slået til i repoet og aflæst gennem
  GitHubs API.
- Alle repoets kontroller er kørt på de opdaterede pakker, og hele gennemgangen er set
  efter af en uafhængig model to gange.
- Repo-indstillingen "Automatically delete head branches" er slået til og aflæst gennem
  GitHubs API.

Ikke kontrolleret endnu: en rigtig pull request fra Dependabot er ikke gået gennem
auto-fletningen, og trinnet, der starter kontrollerne på `main` bagefter, har ikke kørt.
Om Dependabots egen genopbygning af lockfilen holder alle underpakker 14 dage gamle, er
heller ikke kontrolleret. Se efter i den første uge (afsnittet "Når en pull request bliver
liggende").

## Kort

- Dependabot ser efter nye versioner af npm-pakker og af GitHub Actions hver mandag
  kl. 07:00 UTC. Opsætningen står i `.github/dependabot.yml`.
- En ny version tages først, når den er 14 dage gammel. Sikkerhedsrettelser venter ikke:
  dem åbner Dependabot en pull request for, så snart GitHub kender fejlen.
- **Små opdateringer flettes af sig selv**, når kontrollen `deploy` er grøn på netop den
  commit (`.github/workflows/dependabot-automerge.yml`). Lille betyder: en rettelse (patch),
  eller en minor af en pakke, der er nået til version 1. Pull requesten må kun ændre
  `package.json` og `package-lock.json`.
- **Disse bliver liggende som åbne pull requests**, til et menneske ser på dem:
  - en ny hovedversion (major),
  - en minor af en pakke under version 1 (`@astrojs/starlight`, `three`, `sharp`, `esbuild`):
    før version 1 kan en minor ændre opførsel,
  - en rettelse af en pakke under version 0.1 (0.0.x), af samme grund,
  - opdateringer af GitHub Actions.
- **En pakke under version 1 får ingen rettelser, mens en nyere minor venter.** Dependabot
  åbner én pull request pr. pakke, til den nyeste version. Så længe Starlight 0.42 ligger
  åben, kommer rettelserne til 0.41 ikke. Flet derfor den ventende minor i hånden, når du
  har tid (se nedenfor). Sikkerhedsrettelser kommer uanset.
- En flettet opdatering kommer på siden ved næste udgivelse: næste push til `main` fra et
  menneske, eller næste nyhedskørsel, der udgiver en udgave. Her kører alle kontroller igen
  først.

## Hvorfor sådan

| Valg | Grund |
|---|---|
| 14 dages ventetid | En kompromitteret udgivelse bliver som regel opdaget og trukket tilbage inden for få dage. |
| Jobbet venter selv på `deploy` | `main` har ingen grenbeskyttelse, fordi nyhedskørslen pusher til `main`. GitHubs egen auto-fletning ville derfor flette med det samme. |
| `pull_request`, ikke `pull_request_target` | Kørslen får ingen af repoets hemmeligheder, og den henter ingen af repoets filer fra pull requesten. Selve workflow-filen kommer fra pull requesten; derfor de to job nedenfor. |
| To job | Den eneste fremmede kode (`dependabot/fetch-metadata`) kører i et job, der kun kan læse pull requesten. Jobbet, der kan flette, bruger ingen fremmed kode. |
| Grenens navn og de ændrede filer læses fra GitHub | En pull request, der opdaterer `fetch-metadata`, bestemmer også, hvad den svarer. Derfor afgør flettejobbet selv, at grenen er en npm-gren, og at kun de to pakkefiler er ændret. Fra `fetch-metadata` bruges kun, hvor stor opdateringen er. |
| En version, der ikke kan læses, tæller som stor | Ellers ville en rettelse uden versionsnummer slippe forbi reglen om 0.0.x. |
| Grenen slettes af repo-indstillingen, ikke af jobbet | Fejlede sletningen i jobbet, ville trinnet efter fletningen ikke køre. |
| Fast tidspunkt (07:00 UTC) | Nyhedskørslerne går kl. 04:37 og 11:37 UTC, med reserver kl. 08:37 og 14:37. Nærmeste kørsel er 97 minutter efter. En fletning midt i en nyhedsudgivelse ville udskyde dagens udgave. |
| `--match-head-commit` | Kun den commit, kontrollen kørte på, kan blive flettet. |
| Major flettes ikke | En ny hovedversion kan ændre opførsel, som testene ikke fanger. |
| Minor af 0.x-pakker flettes ikke | Starlight 0.42 fjernede den mobilmenu-knap, som sidens stylesheet og assistentknap bygger på. Den slags fanger `deploy` ikke. |
| 0.x-pakkerne står uden for gruppen | I den samlede pull request ville én af dem holde alle de andre opdateringer tilbage hver uge. |
| GitHub Actions flettes ikke | En Action ændrer selve vejen, siden udgives ad, og der er få af dem. Dem ser et menneske på. |
| Kontrollerne startes på `main` efter fletningen | En fletning foretaget af et workflow starter ingen kørsel. Uden en grøn kørsel på `main` ville pakke-kontrollen blive ved med at regne lockfilen for ændret og kunne stoppe nyhedsudgivelsen ved et nyt fund (`scripts/security-audit.mjs`). Kørslen udgiver ikke noget. |
| Kørsler, der kun kontrollerer, har deres egen kø | `deploy.yml` lader én udgivelse køre ad gangen, og en ny ventende kørsel erstatter den, der ventede i forvejen. I samme kø kunne en kontrolkørsel skubbe en ventende udgivelse ud. |

Accepteret risiko:

- Både npm-pakker og Actions kører i job, der har Cloudflare-nøglen. For små
  npm-opdateringer er værnet de 14 dage, lockfilens integritetskontrol (`npm ci`) og
  kontrollerne i `deploy`.
- Lander en automatisk fletning mellem nyhedskørslens push og dens udgivelse, udgiver den
  kørsel ikke noget (`main` er flyttet). Dagens udgave kommer så på siden ved næste
  udgivelse, senest næste dag. Det faste tidspunkt gør det usandsynligt for de ugentlige
  opdateringer; en sikkerhedsrettelse kan komme når som helst. Kørslen på `main` efter
  fletningen udgiver med vilje ikke: en kørsel af `deploy.yml` startet med
  `workflow_dispatch` kan aldrig udgive (`scripts/ai-news-workflow.test.mjs`).

## Når en pull request bliver liggende

| Det ser du | Det gør du |
|---|---|
| Titlen nævner én pakke og et nyt første tal (fx 7 til 8) | Læs pakkens ændringsliste, og flet i hånden (se nedenfor). |
| Titlen nævner `@astrojs/starlight`, `three`, `sharp` eller `esbuild`, og det midterste tal er nyt (fx 0.41 til 0.42) | Læs ændringslisten, prøv siden på grenen, og flet i hånden. Starlight 0.42 kræver først en ændring af `src/styles/chrome/header.css` og `src/components/SmartBoligAssistant.astro` (mobilmenu-knappen). |
| Titlen begynder med `chore(ci)` | Det er en GitHub Action. Se, at den nye version stadig er låst til en commit, og flet i hånden. |
| `deploy` er rød | Åbn kørslen, og find det trin, der fejlede. Ret fejlen på en gren, eller luk pull requesten; Dependabot åbner en ny, når der kommer en nyere version. |
| `deploy` var rød, er kørt om og er nu grøn, men intet flettes | Auto-fletningen var allerede færdig. Kør jobbet "Dependabot auto-merge" om på pull requesten (Re-run all jobs). |
| Jobbet "Dependabot auto-merge" er rødt | Åbn kørslen, og se, hvilket trin der fejlede. "Read Dependabot metadata": kør jobbet om. "Merge": pull requesten kan ikke flettes, oftest på grund af en konflikt; skriv kommentaren `@dependabot rebase`. "Run the gates on main": opdateringen er flettet; start kørslen selv med `gh workflow run deploy.yml --ref main`. Står pull requesten som flettet, selv om "Merge" er rød, gør du det samme. |
| Der ligger en opdatering af en pakke under version 1 åben, og pakken får ingen rettelser | Se "Kort": flet den ventende minor i hånden. |
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
- Sletning af flettede grene: GitHub → repoet → Settings → General → "Automatically delete
  head branches". Uden den bliver Dependabots grene liggende; intet andet ændres.

Siden kører videre uden det hele. Pakkerne bliver bare ikke opdateret af sig selv.

## En opdatering uden om Dependabot

Bruges, når `npm audit --audit-level=high` melder et fund, og Dependabot ikke har åbnet en
pull request endnu.

1. `npm audit fix`. Fejler den med `ERESOLVE`, så opdatér den pakke, fundet nævner, sammen
   med de pakker, den kræver (fx `npm install astro@<version> @astrojs/markdown-remark@<version>`).
2. Kør kontrollerne fra `AGENTS.md`.
3. Ret versionerne i `docs/oss.md`, og skriv en linje i `CHANGELOG.md`.
