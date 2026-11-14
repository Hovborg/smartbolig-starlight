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
- **Fase 1, oprydning:** PR #181 flettet og udgivet 2026-11-14. De gamle kørsler (Windows,
  systemd, OpenClaw) og ComfyUI-sporet er fjernet; GitHub Actions er eneste udgivelsesvej.
  PR #170, #169, #166, #165 og #147 er lukket som forældede.

## I gang

- **Fase 2, design:** PR #180 (grenen `redesign/theme`). Designværdier, mørkt tema som standard,
  egen topbjælke, forside med "et hus gennem et døgn", 404, nyhedsoversigt, produktkort, FAQ,
  kommentarer, sidefod, AI-assistent, ny brandpakke, printregler. To uafhængige gennemgange
  (kode og tilgængelighed) gav ingen blokerende fund; alle kodefund og tilgængelighedspunkt 1-13
  er rettet. `main` er flettet ind 2026-11-14.

## Næste skridt

1. Udgiv designet (PR #180). Kontrollér den levende side i mørkt og lyst ved 375 og 1440 px.
   Mål Lighthouse igen og sammenlign med før-målingen.
2. Fase 3: nye guides og illustrationer. Fase 4: smarte funktioner. Fase 5: SEO, CSP, indtjening.
   Fase 6: Search Console, Bing, Cloudflare, uafhængig sidevagt. Fase 7: dokumentation og docs-test.
3. Følg tre dages nyhedsdrift (planlagte kørsler kl. 04:37 og 11:37 UTC; kan ikke bekræftes samme dag).

## Udskudt fra designgennemgangen

- Nyhedsoversigtens små billeder hentes i 1200 px; en 640 px-udgave med `srcset` hører til fase 5.
- 404-siden forhåndsindlæser ikke skrifterne.
- `--sb-ink-subtle` på sidens baggrundsvask giver 4,48:1 i lyst tema (lige under 4,5:1).
- Ikke set i en browser: reduceret bevægelse, tvungne farver, forsiden ved ca. 800 px.

Ting, der kræver ejeren, står i TIL-EJEREN.md.
