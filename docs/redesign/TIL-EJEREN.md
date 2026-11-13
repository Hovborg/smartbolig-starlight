# Til ejeren

Ting, som kræver dig: en beslutning, et login eller betaling. Alt andet arbejdes der videre med.

Sidst opdateret: 2026-11-13.

## Kræver dit login

1. **Google AdSense og Google Analytics** kunne ikke kontrolleres fra arbejdsmiljøet.
   Indstillingerne skal tjekkes af dig (liste følger i fase 5).
2. **Partner-Ads.** Ikke logget ind. Flere Proshop-links åbner et forkert produkt (liste i
   `docs/redesign/guide-review/produkter.md`); de rigtige links skal hentes i Partner-Ads.

## Kræver din beslutning

3. **Juridiske sider.** Gennemgangen fandt steder, hvor teksten ikke passer med det, siden gør
   (bl.a. Ezoic nævnt uden at være i brug, nyhedsbrev nævnt uden tilmelding, samtykkebanner
   beskrevet anderledes end Googles CMP). Listen står i `docs/redesign/guide-review/oevrige.md`.

## Koster penge, hvis du vil

4. **Bedre nyhedstekster med Claude.** Workflowet kan bruge en Claude-nøgle i stedet for de
   gratis modeller. Ikke nødvendigt for drift.
5. **Cloudflare AI Search** fakturerer fra 2026-12-01 ud over 1.000 forespørgsler pr. måned.
   Assistenten flyttes derfor til et eget indeks (fase 4).

## Kendte grænser

6. **OpenAI-nyheder.** OpenAI's artikelsider svarer 403 til robotter. Kun korte resuméer kan
   hentes, og de er for tynde til faktatjekket. Det omgås ikke.
