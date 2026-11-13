# Til ejeren

Ting, som kræver dig: en beslutning, et login eller betaling. Alt andet arbejdes der videre med.

Sidst opdateret: 2026-11-13.

## Skal du vide

1. **Lille udgift på Cloudflare (ca. 0,12 USD).** Modelmålingerne 13/11 brugte ca. 20.700
   neurons på Workers AI. De første 10.000 pr. døgn er gratis; resten koster 0,011 USD pr. 1.000,
   fordi kontoen er Workers Paid. Det var en fejl: jeg regnede med gratis-kontoens stop.
   Rettet samme dag med et hårdt loft på 8.000 pr. døgn i relayet (afprøvet). Tallet er aflæst
   i Cloudflares statistik og kan være lidt højere, når statistikken er helt opdateret.

## Kræver dit login

2. **Google AdSense og Google Analytics.** Netværkets DNS-filter blokerer domænerne herfra, så
   indstillingerne kan ikke kontrolleres. Enten skal filteret tillade `adsense.google.com` og
   `analytics.google.com` på denne maskine, eller også tjekker du selv (liste følger i fase 5).
3. **Partner-Ads.** Ikke logget ind. Flere Proshop-links åbner et forkert produkt (liste i
   `docs/redesign/guide-review/produkter.md`); de rigtige links skal hentes i Partner-Ads.

## Kræver din beslutning

4. **Juridiske sider.** Gennemgangen fandt steder, hvor teksten ikke passer med det, siden gør
   (bl.a. Ezoic nævnt uden at være i brug, nyhedsbrev nævnt uden tilmelding, samtykkebanner
   beskrevet anderledes end Googles CMP). Listen står i `docs/redesign/guide-review/oevrige.md`.

## Koster penge, hvis du vil

5. **Bedre nyhedstekster med Claude.** Workflowet kan bruge en Claude-nøgle i stedet for de
   gratis modeller. Ikke nødvendigt for drift.
6. **Cloudflare AI Search** fakturerer fra 2026-12-01 ud over 1.000 forespørgsler pr. måned.
   Assistenten flyttes derfor til et eget indeks (fase 4).

## Kendte grænser

7. **OpenAI-nyheder.** OpenAI's artikelsider svarer 403 til robotter. Kun korte resuméer kan
   hentes, og de er for tynde til faktatjekket. Det omgås ikke.
