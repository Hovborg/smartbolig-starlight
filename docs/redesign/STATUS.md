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
- **Fase 1, nyhedsflow:** PR #172 og #179 flettet og udgivet 2026-11-14. Relayet er udrullet.
  Prøvekørsel og første rigtige kørsel i GitHub Actions bestod 2026-11-14: dagens udgave blev
  udgivet af kørslen selv (4 historier, 12 modelkald, 3.282 neurons). Målingen står i
  `docs/nyhedsflow.md`. Den tidligere Windows-opgave er slået fra.
- **Fase 3, gennemgang af guides:** PR #173–#177 flettet og udgivet 2026-11-13.
  Logge og åbne punkter: `docs/redesign/guide-review/`.

## I gang

- **Fase 1, oprydning:** grenen `chore/news-cleanup` fjerner Windows- og Linux-runnerne, deres
  tests og ComfyUI-sporet. Uafhængigt gennemgået 2026-11-14.
- **Fase 2, design:** PR #180 (grenen `redesign/theme`). Designværdier, mørkt tema som standard,
  egen topbjælke, forside med "et hus gennem et døgn", 404, nyhedsoversigt, produktkort, FAQ,
  kommentarer, sidefod, AI-assistent, ny brandpakke. Under uafhængig gennemgang.

## Næste skridt

1. Flet oprydnings-PR'en. Luk PR #170, #169, #147, #166 og #165 (forældede).
2. Udgiv designet (PR #180) efter gennemgang. Mål Lighthouse igen og sammenlign med før-målingen.
3. Fase 3: nye guides og illustrationer. Fase 4: smarte funktioner. Fase 5: SEO, CSP, indtjening.
   Fase 6: Search Console, Bing, Cloudflare, uafhængig sidevagt. Fase 7: dokumentation og docs-test.
4. Følg tre dages nyhedsdrift (planlagte kørsler kl. 04:37 og 11:37 UTC; kan ikke bekræftes samme dag).

Ting, der kræver ejeren, står i TIL-EJEREN.md.
