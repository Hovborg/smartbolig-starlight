# Samtykke: hvad siden henter før og efter et ja

Sidst opdateret: 2026-11-14.
Kontrolleret ved: `npm run site:test` (reglerne i `scripts/site-consent.test.mjs`) og den byggede
side i headless Chrome med Googles samtykkebesked erstattet af en efterligning, i tre forløb:
intet svar, ja og nej. Set: før et svar hentes kun samtykkebeskeden; efter et ja hentes
`gtag.js` og `adsbygoogle.js`; efter et nej hentes ingen af dem; et tilbagetrukket ja genindlæser
siden; kommentarerne hentes først ved tryk.
Ikke kontrolleret: Googles rigtige besked med et rigtigt svar (kan kun ses på den levende side;
resultatet står i `docs/redesign/STATUS.md`), hvilke cookies beskeden selv sætter, og
indstillingerne i AdSense under "Privatliv og beskeder" (kræver ejerens login, se
`docs/redesign/TIL-EJEREN.md`).

## Kort

- Siden spørger med Googles samtykkebesked (den, der er sat op i AdSense under "Privatliv og
  beskeder"). Beskeden hentes, når siden er færdig med at indlæse.
- Før læseren har svaret, hentes intet andet fra Google: hverken Google Analytics (`gtag.js`)
  eller AdSense (`adsbygoogle.js`). Googles navn for den opsætning er "basic consent mode".
- Et ja henter de scripts, læseren sagde ja til. Et nej henter ingen.
- Trækker læseren et ja tilbage, indlæses siden igen uden scriptet. Et script, der først er på
  siden, kan ikke tages af den.
- "Cookieindstillinger" i sidefoden åbner beskeden igen. Knappen vises først, når beskeden kan
  åbnes.
- Uden for EU/EØS, hvor Google ikke kræver samtykke, tæller det som et ja.
- Kommentarerne under en guide (giscus, GitHub) hentes først, når læseren trykker "Vis
  kommentarer".
- Cloudflare Web Analytics tæller sidevisninger uden cookies og uden samtykke. Den sættes på af
  Cloudflare, ikke af koden her, og er beskrevet i cookiepolitikken.

## Forløbet

1. `src/components/Head.astro` kalder `boot()` på hver side.
2. `google-tags.mjs` sætter alle fire samtykkenøgler til nej (`ad_storage`, `ad_user_data`,
   `ad_personalization`, `analytics_storage`) og slår `ads_data_redaction` til.
3. Når siden er indlæst og browseren har ro, henter `message.mjs` beskeden fra
   `fundingchoicesmessages.google.com`.
4. Svaret læses fra beskedens egen samtykke-API (`getGoogleConsentModeValues`). Er "consent
   mode" ikke slået til i AdSense, læses svaret i stedet fra TCF (`__tcfapi`): Google skal være
   godkendt som leverandør (nummer 755), og formålene følger Googles egen oversættelse.
5. `decision.mjs` gør svaret til ja eller nej for hver nøgle. `boot.mjs` sender det videre til
   Google (`consent update`) og henter kun de scripts, der er sagt ja til.

## Hvor tingene ligger

| Sti | Indhold |
|---|---|
| `src/lib/consent/ids.mjs` | Analytics-id og AdSense-udgiver-id. De er offentlige |
| `src/lib/consent/boot.mjs` | Starter det hele og viser "Cookieindstillinger" |
| `src/lib/consent/message.mjs` | Henter Googles besked, læser svaret, åbner beskeden igen |
| `src/lib/consent/decision.mjs` | Reglerne: hvad et svar giver lov til. Rene funktioner |
| `src/lib/consent/google-tags.mjs` | Henter `gtag.js` og `adsbygoogle.js` efter et ja |
| `src/lib/comments.mjs`, `src/components/Giscus.astro` | Kommentarer, hentet ved tryk |
| `src/components/Footer.astro`, `src/lib/site-footer.mjs` | Knappen "Cookieindstillinger" |
| `src/content/docs/da/juridisk/cookiepolitik.mdx` og `en/` | Det, læseren får at vide. Skal passe med koden |
| `scripts/site-consent.test.mjs` | Tests af reglerne og af, at ingen side selv henter noget fra Google |

## Ændr noget

- **Nyt script, der sætter cookies eller sender data til en tredjepart:** hent det fra
  `boot.mjs` efter et ja, aldrig fra `config/head/` eller direkte i en side. Skriv det i
  cookiepolitikken på begge sprog, og tilføj værten i `public/_headers` (se
  `docs/sikkerhed.md`). Testen "no page asks Google for anything in its own markup" fejler, hvis
  et Google-script står i sidens egen kode.
- **Nyt Analytics- eller AdSense-id:** ret `ids.mjs`.
- **Beskedens tekst, sprog og knapper:** rettes i AdSense under "Privatliv og beskeder", ikke
  her.

## Når noget ser forkert ud

| Du ser | Årsag og rettelse |
|---|---|
| Beskeden kommer ikke | En annonceblokker eller DNS-filter spærrer `fundingchoicesmessages.google.com`. Så hentes hverken Analytics eller AdSense, og siden virker uden. Ellers: se efter fejl i browserens konsol og om beskeden er udgivet i AdSense |
| "Cookieindstillinger" mangler i sidefoden | Beskeden er ikke indlæst (se ovenfor). Knappen er skjult, til den kan bruges |
| Ingen tal i Google Analytics | Kun læsere, der har sagt ja, tælles. Det er meningen. Sidevisninger uden samtykke ses i Cloudflare Web Analytics |
| Analytics hentes efter et ja, men AdSense ikke (eller omvendt) | Læseren har valgt formål enkeltvis. Det er svaret, ikke en fejl |
| Siden indlæses igen efter et ændret svar | Et ja er trukket tilbage. Det er meningen |
| Konsollen viser en blokeret adresse fra Google | Værten mangler i `public/_headers`. Se `docs/sikkerhed.md` |

## Fjern det igen

1. Annoncer væk: fjern `loadAds` i `boot.mjs` og `google-tags.mjs` samt AdSense-værterne i
   `public/_headers`. Uden annoncer skal siden stadig spørge, så længe Analytics er der.
2. Analytics væk også: fjern kaldet til `boot()` i `Head.astro`, mappen `src/lib/consent/`,
   knappen i `Footer.astro` og `scripts/site-consent.test.mjs`. Ret cookiepolitikken og
   privatlivspolitikken på begge sprog.
