# Overvågning af den levende side

Sidst opdateret: 2026-11-14.
Kontrolleret ved: `node scripts/monitor/run.mjs` kørt mod `https://smartbolig.net`
(13 kontroller bestod 2026-11-14; den fjortende, `/api/elpris`, kom til sammen med værktøjerne
og er kun afprøvet i testen, til værktøjerne er udgivet) og `npm run site:test` (kontrollerne, genforsøget og rapporten
afprøves mod en falsk `fetch`; workflowens rettigheder og fastlåste handlinger læses af en test).
Ikke kontrolleret: selve workflowen i GitHub Actions. Den har ikke kørt endnu. Start den én
gang med "Run workflow" under fanen Actions, når den er på `main`, og se, at den ender grøn.
Opret-, kommentér- og luk-trinene for sagen er heller ikke set køre.

## Kort

To gange i døgnet (06:23 og 18:23 UTC) henter `.github/workflows/monitor.yml` fjorten adresser
på den levende side og tjekker svarene. Hvis en kontrol fejler, åbner den en GitHub-sag med
etiketten `monitor` (eller skriver en kommentar i den, der allerede er åben). Når alt igen
består, skriver den en kommentar og lukker sagen. Sagen er alarmen; en planlagt kørsel
ender grøn, også når en kontrol fejler. En kørsel, du selv starter, ender rød.

Ingen udenforstående tjeneste, ingen nye hemmeligheder (kun workflowens eget token), ingen pris.
Kontrollerne sender kun GET og stiller ikke chatten et spørgsmål, så der bruges ingen modelkvote.

## Hvor tingene ligger

| Sti | Indhold |
|---|---|
| `.github/workflows/monitor.yml` | Tidspunkter, rettigheder, og trinene der åbner, opdaterer og lukker sagen |
| `scripts/monitor/checks.mjs` | Listen over kontroller: navn, hvad der forventes, hvad der ses |
| `scripts/monitor/run.mjs` | Indgangen: kører kontrollerne, skriver en linje pr. kontrol og rapporten (`--report`). `--base` eller `MONITOR_BASE_URL` vælger adressen |
| `scripts/monitor/http.mjs` | Ét kald med 15 sekunders frist og ét genforsøg efter 5 sekunder ved netværksfejl eller 5xx |
| `scripts/monitor/report.mjs`, `runner.mjs`, `parse.mjs` | Rapporten som Markdown, løberen, og de små læsere af HTML og feeds |
| `scripts/site-monitor.test.mjs` | Testene (falsk `fetch`, ingen netværk). Kører med `npm run site:test` |

## Ændr noget

**Tilføj en kontrol.** Tilføj et `check(navn, forventet, funktion)` i `buildChecks` i
`scripts/monitor/checks.mjs`. Funktionen returnerer `{ ok, seen }`; `seen` er få ord om, hvad der
kom tilbage, aldrig en hel header eller side. Læg en linje til den sunde side og en til den
ødelagte i `scripts/site-monitor.test.mjs` (tallet 14 i testen tæller kontrollerne).

**Ændr tidspunkterne.** Ret de to `cron`-linjer i `monitor.yml` (UTC). Brug minutter som 23, ikke 00,
for GitHubs planlægger er travlest ved hel time. Grænsen for nyhedernes alder (84 timer) er
`MAX_NEWS_AGE_HOURS` i `checks.mjs`.

**Prøv mod en anden adresse.** `node scripts/monitor/run.mjs --base https://eksempel.dk --report rapport.md`.
Kontrollerne for `www`, kanonisk adresse og `robots.txt` peger altid på `https://smartbolig.net`.

## Når noget ser forkert ud

**Der er åbnet en sag med etiketten `monitor`.** Læs tabellen: kolonnen "Seen" siger, hvad der kom
tilbage, og "Expected" hvad der skulle. Åbn adressen i en browser. Ret fejlen på siden, eller
(hvis kontrollen er forældet) i `checks.mjs`. Sagen lukker sig selv ved næste kørsel, hvor alt
består. Du behøver ikke lukke den.

**Falsk alarm.** Et enkelt netværkshik giver ikke en sag: et kald, der fejler på nettet eller
får 5xx, prøves én gang til (4xx prøves ikke igen). Fejler
den samme kontrol uden grund, så er den enten for stram (fx grænsen på 300 sider i sitemappet,
når siden er blevet mindre) eller siden har ændret sig med vilje. Ret kontrollen i samme
ændring som siden.

**"AI news is fresh" fejler.** Kontrollen læser nyhedernes eget feed (`/da/ai/nyheder/rss.xml`).
Dagens nyheder er dateret ved midnat UTC. Er den nyeste over 84 timer gammel, er der ikke
udkommet nyheder i tre dage. Nyhedsflowet åbner selv sagen `ai-news-stalled` kl. 11:37 UTC på
tredjedagen; denne kontrol fejler først kl. 18:23 samme dag. Den er altså sikkerhedsnettet,
hvis nyhedsflowet slet ikke kører (så åbner det heller ikke sin egen sag). Se
`docs/nyhedsflow.md`. `/rss.xml` er guidernes feed; dets datoer følger bygget og siger
intet om nyhederne, så dér tjekkes kun, at feedet har punkter.

**Ingen kørsler.** GitHub slår planlagte workflows fra efter 60 dage uden aktivitet i
repoet. De daglige nyheder committer til `main` hver dag, så det sker ikke så længe de udkommer.
Står workflowen alligevel som slået fra under fanen Actions, så tryk "Enable workflow".

**En kørsel fejler rødt uden en sag.** Så gik noget galt i selve trinnene (ikke i en kontrol).
Åbn kørslen under Actions og læs trinnets log.

## Fjern det igen

Slet `.github/workflows/monitor.yml`, `scripts/monitor/` og `scripts/site-monitor.test.mjs`. Luk en åben sag med etiketten `monitor` og slet etiketten, hvis du vil.
Vil du blot pause det, så brug "Disable workflow" under fanen Actions.
