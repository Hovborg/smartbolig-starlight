# Beslutningslog for redesignet

Nyeste nederst. Hver post: valg, begrundelse, og hvordan det er kontrolleret.

## 2026-11-13

### B1. Starlight beholdes til guides; forside, oversigter og værktøjer bliver egne Astro-sider
- Begrundelse: 320 MDX-sider bruger Starlights komponenter, i18n, sidebar, indholdsfortegnelse og
  Pagefind. Det er velafprøvet og tilgængeligt. Forside, oversigter og værktøjer har brug for frit
  layout, som Starlights sideramme modarbejder.
- Konsekvens: `starlight-theme-galaxy` fjernes. Udseendet styres af egne tokens i `src/design/`.

### B2. Tema følger enheden; mørk er ikke længere tvunget standard
- Tidligere valg: mørk som standard for nye besøgende.
- Nyt valg: `prefers-color-scheme` bestemmer første visning; brugerens valg gemmes.
- Begrundelse: opgaven beder om et lyst, luftigt udtryk med begge temaer.

### B3. 3D bygges som isometrisk SVG ved build; WebGL kun hvor læseren selv styrer
- Begrundelse: three.js vejer ca. 192 kB gzip. Udgangspunktet er Lighthouse 96–100 på mobil.
  Isometrisk SVG koster ingen JavaScript, kan læses af søgemaskiner og virker på alle enheder.
- WebGL (three.js, MIT) indlæses først, når læseren åbner det interaktive hus, og kun på
  enheder der kan køre det. Ellers vises SVG-udgaven.

### B4. Animationer: CSS scroll-animationer og View Transitions; ingen GSAP
- Begrundelse: 0 kB, ingen afhængighed. GSAP's licens er proprietær og kan opsiges.
- `prefers-reduced-motion` respekteres, og der er en synlig pauseknap (WCAG 2.2.2).

### B5. Nyhedsflowet flyttes til GitHub Actions og udgiver selv
- Begrundelse: de tre seneste fejlklasser skyldes alle værten (login, Windows-konto, lokal npm).
- Ejeren har besluttet, at nyheder må udgives uden godkendelse, når kontrollerne er bestået.
- En dag uden godkendt udkast er en vellykket kørsel uden udgivelse.

### B6. Tekstkontrollen gøres træfsikker pr. historie i stedet for pr. udgave
- Målt: af 19 afvisninger indeholdt ca. 12 mindst én reel fejl; 7 var overstrenge eller skyldtes,
  at kontrollen manglede udgivelsesdatoen, som skribenten fik.
- Ændring: hver historie kontrolleres for sig, en fejl giver rettelse af netop den historie, og en
  historie der ikke kan rettes udelades. Kildekrav, kildesikkerhed og dubletkontrol er uændrede.

### B7. Afhængighedskontrol blokerer kun, når afhængigheder ændres
- Begrundelse: en ny advarsel om en uændret pakke stoppede nyhederne i 25 dage. Tekstændringer gør
  ikke en kendt svaghed værre.
- Ændring: fuld `npm audit` er port for ændringer i `package-lock.json` og kører dagligt som
  overvågning. Automatiske opdateringer flettes selv, når CI består.

### B8. Cloudflare AI Search udfases som kilde til assistenten
- Begrundelse: AI Search fakturerer fra 2026-12-01 ud over 1.000 forespørgsler pr. måned.
  Kravet er ingen udgifter.
- Ændring: assistenten søger i et indeks over sidens egne guides, som bygges sammen med siden.

### B9. Åbne pull requests
- #170 og #169: rettelser til Windows-runneren, som pensioneres i fase 1. Lukkes som afløst.
- #166 og #165: to udkast til samme dato (2026-10-02). #166 er den nyeste. Afgøres i fase 1, når
  den nye kvalitetskontrol kan køres på udkastet.
- #147: kladde fra 2026-08-19 med konflikt. Lukkes som forældet.

### B10. Open source vælges efter licens, vægt og vedligehold
- Se `docs/open-source.md` for version og licens for hvert projekt.
- Fravalgt: GSAP (licens), transformers.js og Monaco i browseren (vægt), kopiering fra Home
  Assistants dokumentation (CC BY-NC-SA) og `home-assistant/brands` (ingen licens).

### B11. Modellerne kører på Cloudflare Workers AI gennem et privat relay
- GitHub Models, som var planen, er lukket af GitHub (2026-07-30). GitHub Actions kan ikke kalde
  Workers AI uden et kontotoken, så en lille Worker (`workers/news-llm/`) står imellem.
- Relayet har nøgle, liste over tilladte modeller, loft pr. minut og et dagsloft.

### B12. Modelvalg efter måling, ikke efter navn
- Skriver: `deepseek-v4.1-flash`, reserve `gemma-4-26b`. Kontrol: `gpt-oss-120b`, reserve
  `nemotron-3-120b`. Målingerne står i `docs/nyhedsflow.md`.
- Skriver og kontrol er to forskellige modeller i standardlisterne. Det er ikke tvunget:
  sættes en liste om, kan rollerne ende på samme model (se `docs/nyhedsflow.md`).

### B13. Hårdt dagsloft på 8.000 neurons
- Fund 2026-11-13: forbrug over 10.000 neurons pr. døgn koster penge hos Cloudflare, og
  modelmålingerne den dag gik over den grænse. Derfor et loft, der ikke kan omgås.
- Ændring: relayet afviser kald, når dagens forbrug når 8.000 (chatten har resten). Kan tælleren
  ikke læses, afvises kaldet. En kørsel stopper selv ved 6.000.

### B14. Kildeteksten skæres fra `<article>`/`<main>`
- Målt: de første ca. 2.500 tegn af den tekst, modellerne fik, var sidens navigation. Det forklarer
  en del af de gamle afvisninger som "ikke dækket af kilden".
- Nye officielle kilder: Google DeepMind, Mistral, Home Assistant-bloggen og Ollama.

### B15. Ét udgivelsesforløb
- Nyhedsworkflowet kalder `deploy.yml` i stedet for at udgive selv. Samme kontroller, ét sted.
- En fejlet dag gør ikke workflowet rødt; kun tre dage uden udgivelse giver en GitHub-sag.

### B16. Afhængigheder: kontrol mod seneste vellykkede udgivelse, og tre døgns karenstid
- Kontrollen sammenligner med det seneste commit, der blev udgivet uden fejl (PR #171).
- Nye pakkeversioner tages først i brug, når de er tre døgn gamle. Astro og Starlight blev derfor
  på de afprøvede versioner.

### B17. Vejen tilbage er afprøvet
- 2026-11-13: `npx wrangler rollback <version>` til forrige version og frem igen på
  produktionssiden; siden svarede 200 begge gange. Fremgangsmåden beskrives i `docs/udgivelse.md`
  (fase 7).

### B18. Arkivværktøjet `ai-news-regenerate.mjs` er fjernet
- Det var et engangsværktøj fra juli 2026 og brugte det gamle tekstmodul.

### B19. Relayets dagsloft: reservation før kaldet, talt ét sted
- Fund i gennemgangen: det gamle loft læste tælleren, kaldte modellen og skrev bagefter. Et afbrudt
  kald og to samtidige kald blev ikke talt, og forbruget byggede på et felt (`usage.neurons`), som
  Cloudflare ikke dokumenterer.
- Valg: regnskabet ligger i ét Durable Object, som behandler én forespørgsel ad gangen. Relayet
  bogfører kaldets højeste mulige pris før modelkaldet og retter til den rigtige pris bagefter.
  Prisen regnes fra de meldte tokens gange Cloudflares pris pr. model (`workers/news-llm/src/prices.js`).
- Fravalgt: KV (ingen atomar læs-og-skriv) og en fast reserve pr. kald (for lav for store kald).
- Durable Objects med SQLite-lager er med i Workers-planen; forbruget her er omkring 100 kald i døgnet.

## 2026-11-14

### B28. Værtskørslerne for nyheden er fjernet
- Fjernet: Windows-opgaven, systemd-timeren og OpenClaw-jobbet med installationsscripts, fejlmelder, forældelsestjek i shell, PR-identitetshjælperen, hjælperen til offentlig kontrol efter udgivelse og deres tests.
- Begrundelse: ét udgivelsesforløb (B5, B15). De tre seneste fejlklasser var alle værtsfejl. Ældre kørsler ved siden af workflowet kan udgive det samme to gange.
- Bevaret: workflowtestene (ét flyttet til `scripts/ai-news-workflow.test.mjs`), `ai-news-staleness.mjs` og alle kontroller, som workflowet bruger.
