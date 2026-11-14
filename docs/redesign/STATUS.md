# Status for redesignet

Opdateres ved hver afsluttet delopgave, så arbejdet kan genoptages præcist.
Plan: [PLAN.md](PLAN.md). Valg: [BESLUTNINGER.md](BESLUTNINGER.md). Til ejeren: [TIL-EJEREN.md](TIL-EJEREN.md).

Sidst opdateret: 2026-11-14.

## Færdigt

- Kortlægning: repo, regler, adgange, tidligere forsøg, nyhedsflowets fejlhistorik.
- Før-målinger (Lighthouse, sikkerhedsheadere, sideopgørelse) taget 2026-11-13.
- Research: open source-kandidater, danske søgeemner, indtjeningsmuligheder.
- `scripts/content-inventory.mjs`: opgørelse over alle sider (billeder, titler, links).
- **Fase 1, afhængigheder:** PR #171 flettet og udgivet 2026-11-13. Ingen høje eller kritiske
  fund. Kontrollen sammenligner nu med seneste vellykkede udgivelse.
- **Vej tilbage afprøvet** på produktionssiden 2026-11-13 (`wrangler rollback` frem og tilbage).
- **Relay til Workers AI** udrullet med nøgle, modelliste, loft pr. minut og dagsloft.

## I gang

- **Fase 2, brand:** grenen `redesign/brand-kit`. Alle brandfiler (favicon, ikoner, logoer, standard-delingsbillede) genereres af `npm run brand:build`; gamle brandmapper og ubrugte logoer er fjernet. Se `docs/designsystem.md`, afsnittet Logo og brandfiler.
- **Fase 1, nyhedsflow:** grenen `feat/news-actions-v2`. Ny kæde pr. historie, workflow
  `ai-news.yml`, `deploy.yml` kan kaldes, tests grønne lokalt (ai-news, site).
  Uafhængigt gennemgået tre gange (sidste dom 2026-11-14: klar), PR #172.
  Mangler: fletning, første kørsel i GitHub Actions (først `dry_run`).
- **Fase 3, gennemgang af guides:** fire grene `content/review-*` (worktrees
  `smartbolig-guides-*`). Produkter og øvrige mapper er rettet og under uafhængig gennemgang.
  Home Assistant del A og B er i gang. Logge: `docs/redesign/guide-review/`.

## Næste skridt

1. Flet nyheds-PR'en. Kør workflowet med `dry_run`, derefter rigtigt. Skriv det målte forbrug
   ind i `docs/nyhedsflow.md`.
2. Slå den tidligere Windows-opgave fra. Fjern Windows- og Linux-runnerne og deres
   tests i en opfølgende PR. Luk PR #170, #169, #147; afgør #166/#165.
3. Flet guide-grenene én ad gangen efter gennemgang.
4. Fase 2: designsystem på en ny gren fra `main` (opdel `astro.config.mjs`, fjern Galaxy-temaet,
   lyst/mørkt tema, egne sider, illustrationer).
5. Følg tre dages nyhedsdrift (kan ikke bekræftes samme dag).

Ting, der kræver ejeren, står i TIL-EJEREN.md.
