# Samtykke: hvad siden henter før og efter et ja

Sidst opdateret: 2026-11-14.
Kontrolleret ved: `npm run site:test` (reglerne i `scripts/site-consent.test.mjs`) og den byggede
side i headless Chrome med Googles samtykkebesked erstattet af en efterligning, i tre forløb:
intet svar, ja og nej. Set: før et svar hentes kun samtykkebeskeden; efter et ja hentes
`gtag.js` og `adsbygoogle.js`; efter et nej hentes ingen af dem; et tilbagetrukket ja genindlæser
siden; kommentarerne hentes først ved tryk.
Googles rigtige script er hentet alene på den levende side fra en dansk forbindelse
(2026-11-14, headless Chrome og en almindelig browser): dets API svarer, det sætter cookien
`FCCDCF`, og det melder, at **ingen besked er udgivet for smartbolig.net** (ingen dialog,
intet TCF-svar, "consent mode" ikke sat op). Se "Ingen besked udgivet" nedenfor.
Ikke kontrolleret: et rigtigt svar i Googles rigtige besked (kræver, at beskeden er udgivet),
hvad Google svarer uden for EU/EØS, og indstillingerne i AdSense under "Privatliv og beskeder"
(kræver ejerens login, se `docs/redesign/TIL-EJEREN.md`).

## Kort

- Siden spørger med Googles samtykkebesked (den, der er sat op i AdSense under "Privatliv og
  beskeder"). Beskeden hentes, når siden er færdig med at indlæse.
- Før læseren har svaret, hentes intet andet fra Google: hverken Google Analytics (`gtag.js`)
  eller AdSense (`adsbygoogle.js`). Googles navn for den opsætning er "basic consent mode".
- Et ja henter de scripts, læseren sagde ja til. Et nej henter ingen.
- Trækker læseren et ja tilbage, indlæses siden igen uden scriptet. Et script, der først er på
  siden, kan ikke tages af den.
- "Cookieindstillinger" i sidefoden åbner beskeden igen. Knappen vises kun, hvor Google har
  spurgt læseren.
- Google afgør ud fra læserens land, om der spørges (EU/EØS, Storbritannien og Schweiz). Hvor
  Google melder, at der ikke spørges, tæller det som et ja. De juridiske sider siger det.
  Ejeren kan lade beskeden vises i alle lande i AdSense.
- **Ingen besked udgivet:** er der ingen udgivet besked i AdSense for siden, kommer der intet
  svar, og så hentes hverken Analytics eller AdSense for nogen. Siden virker ellers som
  normalt.
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
4. Svaret læses to steder: beskedens egen samtykke-API (`getGoogleConsentModeValues`, kun hvis
   "consent mode" er slået til i AdSense) og TCF (`__tcfapi`): Google skal være godkendt som
   leverandør (nummer 755), og formålene følger Googles egen oversættelse. Svarer begge, kræver
   et formål ja fra begge (`strictest`), så et tilbagetrukket ja aldrig overstemmes af en
   værdi, der ikke er fulgt med endnu.
5. TCF-lytteren kaldes igen, hver gang læseren svarer eller ændrer sit svar. Googles egne
   callbacks (`CONSENT_MODE_DATA_READY` og `CONSENT_DATA_READY`) er kun lovet én gang. Efter
   et svar læses værdierne igen et sekund senere.
6. `decision.mjs` gør svaret til ja eller nej for hver nøgle. `boot.mjs` sender det videre til
   Google (`consent update`) og henter kun de scripts, der er sagt ja til. Et svar, koden ikke
   forstår (manglende værdier, ukendte tal, et andet navn i Googles liste), er ikke et svar:
   så hentes intet.

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
| `scripts/lib/seo-foreign-hosts.mjs` | Kontrol af de byggede sider: ingen side henter selv noget fra en anden vært. Kører i `npm run seo:validate` |

## Ændr noget

- **Nyt script, der sætter cookies eller sender data til en tredjepart:** hent det fra
  `boot.mjs` efter et ja, aldrig fra `config/head/` eller direkte i en side. Skriv det i
  cookiepolitikken på begge sprog, og tilføj værten i `public/_headers` (se
  `docs/sikkerhed.md`). Testen "no page asks Google for anything in its own markup" fejler, hvis
  et Google-script står i sidens egen kode, og `npm run seo:validate` fejler, hvis en bygget
  side selv henter et script, en ramme, et billede, et stylesheet eller et `preconnect` fra en
  anden vært end `smartbolig.net`.
- **Billede eller video fra en anden side i en guide:** gem filen i `src/assets/guides/` (se
  `docs/billeder.md`), eller link til den. En indlejret YouTube-video skal hentes ved tryk
  ligesom kommentarerne.
- **Nyt Analytics- eller AdSense-id:** ret `ids.mjs`.
- **Beskedens tekst, sprog og knapper:** rettes i AdSense under "Privatliv og beskeder", ikke
  her.

## Når noget ser forkert ud

| Du ser | Årsag og rettelse |
|---|---|
| Beskeden kommer ikke for nogen | Ingen besked er udgivet for siden i AdSense ("Privatliv og beskeder"). Tjek i browserens konsol på siden: `googlefc.getConsentStatus()` giver `0`, og `document.querySelector('iframe[name=googlefcInactive]')` findes. Rettes i AdSense, ikke i koden |
| Beskeden kommer ikke hos dig | En annonceblokker eller et DNS-filter spærrer `fundingchoicesmessages.google.com`. Så hentes hverken Analytics eller AdSense, og siden virker uden. Tving beskeden frem med `?fc=alwaysshow&fctype=gdpr` efter adressen (Googles egen testparameter) |
| "Cookieindstillinger" mangler i sidefoden | Google har ikke spurgt læseren: beskeden er ikke udgivet, er spærret, eller læseren er i et land, hvor Google ikke spørger. Knappen er skjult, til der er et svar at ændre |
| Ingen tal i Google Analytics | Kun læsere, der har sagt ja, tælles. Det er meningen. Er tallet nul for alle, er beskeden ikke udgivet (se første række). Sidevisninger uden samtykke ses i Cloudflare Web Analytics |
| Analytics hentes efter et ja, men AdSense ikke (eller omvendt) | Læseren har valgt formål enkeltvis. Det er svaret, ikke en fejl |
| Siden indlæses igen efter et ændret svar | Et ja er trukket tilbage. Det er meningen |
| Konsollen viser en blokeret adresse fra Google | Værten mangler i `public/_headers`. Se `docs/sikkerhed.md` |
| `seo:validate`: "`<img>` fetches from ...; the page itself may only fetch from smartbolig.net" | En side peger på en fil hos en anden vært. Gem filen i repoet, eller hent den først efter læserens tryk eller svar |

## Fjern det igen

1. Annoncer væk: fjern `loadAds` i `boot.mjs` og `google-tags.mjs` samt AdSense-værterne i
   `public/_headers`. Uden annoncer skal siden stadig spørge, så længe Analytics er der.
2. Analytics væk også: fjern kaldet til `boot()` i `Head.astro`, mappen `src/lib/consent/`,
   knappen i `Footer.astro` og `scripts/site-consent.test.mjs`. Ret cookiepolitikken og
   privatlivspolitikken på begge sprog.
