# Tidsbegrænset audit-undtagelse for Astros billedcache

**Dato:** 2026-10-03
**Udløber:** 2026-10-17 00:00 UTC
**Advisory:** [GHSA-ch52-4w7c-c8xp](https://github.com/advisories/GHSA-ch52-4w7c-c8xp)

Den planlagte Windows-kørsel 2026-10-03 kl. 07:20 stoppede ved den fulde
`npm audit --audit-level=high`, før artikelgenerering. Audit viser seks høje
poster, men de føres alle tilbage til én advisory for
`http-cache-semantics <=4.2.0`. GitHub angiver endnu ingen rettet version.

## Afgrænsning og konkret kodevej

`package-lock.json` fastholder Astro 7.2.8 og `http-cache-semantics` 4.2.0.
Astro importerer biblioteket i `node_modules/astro/dist/assets/build/remote.js`
for at beregne udløbstid for eksterne billeder. Denne kode bruger `storable()`
og `timeToLive()`. Advisoryens angreb kræver vurdering af en ny anmodnings
`max-stale` i en delt cache, herunder `satisfiesWithoutRevalidation()`.
Astros billedkode kalder ikke denne metode, og den sender ikke en indkommende
brugers request-headers til cachevurderingen. Der er ingen Astro remote image
imports i projektets kildekode.

`astro.config.mjs` låser output til `static`; `wrangler.jsonc` serverer `dist/`
som Cloudflare Worker Static Assets og kører kun `functions/` som Worker-kode.
Ved gennemgangen fandtes biblioteket og den sårbare metode ikke i `dist/`
eller `.worker/index.js`. Det er understøttende evidens for dette build, ikke
en generel påstand om bibliotekets sikkerhed. Miniflare har også en indlejret
4.1.1-kopi i test-/udviklingsværktøjet. Den gennemgåede cachekode fjerner
requestens `cache-control`, afviser `Set-Cookie` og bruger TTL-beregning; den
må ikke bruges som begrundelse for en offentligt tilgængelig udviklingsserver.

## Kontrol i CI og på Shark

`npm run security:audit` udfører fortsat **hele** npm-auditten med eksplicit
inklusion af dev-, optional- og peerDependencies, også når miljøet forsøger
at udelade dem. Kun denne advisory accepteres midlertidigt, og kun hvis:

- Astro er præcis 7.2.8, cachepakken præcis 4.2.0, og de gennemgåede
  Astro-/Wrangler-konfigurationer, Worker-kilder og `package-lock.json`
  stadig har deres forventede SHA-256-hash;
- rapporten kun indeholder den ene underliggende high/critical-advisory og de seks
  forventede afledte high-poster;
- npm afslutter normalt og returnerer gyldig, sammenhængende JSON;
- der fortsat ikke er en markeret rettelse, og datoen er før 17. oktober 2026.

Ukendte advisories, ekstra high/critical-poster, versions- eller
konfigurations-, Worker-kilde- eller lockfilændringer, netværksfejl,
ugyldige rapporter, en tilgængelig rettelse og udløb giver fejlstatus. Undtagelsen logger altid sit advisory-ID
og sin udløbsdato. Den er **ikke** en godkendelse af sårbarheden i andre
services eller projekter.

`node --test scripts/ai-news-audit.test.mjs` dækker kendt advisory, ekstra
advisory i samme pakke og gennem Astro, ukendt high-pakke, versionsdrift,
server-output, rettelse, udløb og fejl fra npm. Kør også den rå
`npm audit --audit-level=high` for at se fundet direkte. Revurder før fristen
eller når en opdateret pakke frigives.
