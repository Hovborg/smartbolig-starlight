# Status for redesignet

Opdateres ved hver afsluttet delopgave, så arbejdet kan genoptages præcist.
Plan: [PLAN.md](PLAN.md). Valg: [BESLUTNINGER.md](BESLUTNINGER.md). Til ejeren: [TIL-EJEREN.md](TIL-EJEREN.md).

Sidst opdateret: 2026-11-14.

## Færdigt

- Kortlægning: repo, regler, adgange, tidligere forsøg, nyhedsflowets fejlhistorik.
- Før-målinger (Lighthouse, sikkerhedsheadere, sideopgørelse) taget 2026-11-13.
- Research: open source-kandidater, danske søgeemner, indtjeningsmuligheder.
- `scripts/content-inventory.mjs`: opgørelse over alle sider (billeder, titler, links).
- **Fase 1, afhængigheder:** PR #171 flettet og udgivet 2026-11-13.
- **Vej tilbage afprøvet** på produktionssiden 2026-11-13 (`wrangler rollback` frem og tilbage).
- **Fase 1, nyhedsflow:** PR #172 flettet og udgivet 2026-11-14. Relayet er udrullet.
  Første kørsel i GitHub Actions (`dry_run`, 2026-11-14 kl. 00:03 UTC) bestod: 4 historier
  bestod faktatjekket, 0 kasseret, 10 modelkald, alle kontroller grønne, intet udgivet.
- **Fase 3, gennemgang af guides:** PR #173–#177 flettet og udgivet 2026-11-13.
  Logge og åbne punkter: `docs/redesign/guide-review/`.

## I gang

- **Fase 2, design:** grenen `redesign/theme` (worktree `smartbolig-theme`). Indeholder:
  designværdier, egen topbjælke, forside med "et hus gennem et døgn", 404, nyhedsoversigt,
  produktkort, FAQ, kommentarer, sidefod, AI-assistent (opdelt, læsbar tekst), ny brandpakke,
  `docs/designsystem.md`, `docs/oss.md`. `main` er flettet ind.
  Set i browser: 1440 og 375 px, lyst og mørkt (forside, guide, produktside, nyheder, 404, assistent).
  Mangler: uafhængig gennemgang, alle kontroller, PR, udgivelse, kontrol af den levende side.
- **Fase 1, oprydning:** grenen `chore/news-cleanup` fjerner Windows- og Linux-runnerne og deres
  tests (17 filer). Under uafhængig gennemgang.
- **Fase 1, rapport:** PR #179 viser forbrug pr. model og relayets dagstotal i kørslens rapport.

## Næste skridt

1. Flet PR #179. Kør nyhedsworkflowet rigtigt (uden `dry_run`). Skriv det målte forbrug pr. model
   ind i `docs/nyhedsflow.md`.
2. Slå Windows-opgaven "Shark Smartbolig AI News" fra. Flet oprydnings-PR'en.
   Luk PR #170, #169, #147; afgør #166/#165.
3. Udgiv designet (denne gren) efter gennemgang. Mål Lighthouse igen og sammenlign med før-målingen.
4. Fase 3: nye guides og illustrationer. Fase 4: smarte funktioner. Fase 5: SEO, CSP, indtjening.
   Fase 6: Search Console, Bing, Cloudflare, overvågning. Fase 7: dokumentation og docs-test.
5. Følg tre dages nyhedsdrift (kan ikke bekræftes samme dag).

Ting, der kræver ejeren, står i TIL-EJEREN.md.
