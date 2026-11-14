# Til ejeren

Ting, som kræver dig: en beslutning, et login eller betaling. Alt andet arbejdes der videre med.

Sidst opdateret: 2026-11-14.

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

7. **Store opdateringer flettes ikke af sig selv.** Små opdateringer af pakker kommer på
   siden uden dig. Disse bliver liggende som åbne pull requests, til nogen ser på dem: en ny
   hovedversion af en pakke, et nyt midterste tal for `@astrojs/starlight`, `three`, `sharp`
   og `esbuild` (fx 0.41 til 0.42), og opdateringer af GitHub Actions. Siden virker uden dem.
   Den første, du vil se, er Starlight 0.42: den kræver en ændring af mobilmenuen først.
   Fremgangsmåde: `docs/opdateringer.md`.

## Rester fra den gamle nyhedskørsel

8. **Gamle filer fra den tidligere kørsel.** Den efterlod kørselsmapper og en launcher uden
   for repoet. De bruges ikke længere, og opgaven er slået fra. Sig til, hvis de skal slettes.
