# Billeder i guides

Sidst opdateret: 2026-11-14.
Kontrolleret ved: `npm run site:test`, `npm run build` og `npm run seo:validate` kørt på grenen.
Tekstspaltens bredde og den fil, browseren henter, er målt i headless Chrome på den byggede
Zigbee2MQTT-guide ved 22 vinduesbredder. LD2410-diagrammet er set som billede på den byggede side.
Diagrammerne er set som billede i headless Chrome i 328 og 720 px bredde på mørk og lys
baggrund; tekststørrelse, overlap og plads er målt samme sted.
Ikke kontrolleret: en rigtig telefon, Safari og Firefox. Det, der er tilbage for diagrammerne,
står i `docs/redesign/STATUS.md`.

## Kort

- Et billede, som en guide viser i teksten, ligger i `src/assets/guides/` og skrives med en sti
  relativt til MDX-filen. Hvordan, står i `CONTENT-GUIDE.md` under "Billeder i en guide".
- Bygningen laver hvert fotolignende billede som WebP i seks bredder (640, 750, 828, 1080, 1280
  og kildens egen bredde) med `width` og `height`.
- Browseren får at vide, hvor bred tekstspalten er (`sizes`), og henter den mindste fil, der
  fylder den.
- En tegning (SVG) er én fil og fylder hele spalten.
- Åbner guiden med et billede, hentes det straks med høj prioritet. Ellers gør sidehovedets
  billede det, og tekstens billeder hentes, når læseren når dem.
- Billeder med fast offentlig adresse bliver i `public/images/`: `home/`, `guide/` (sidehovedets
  billeder), `produkter/`, nyhedsbillederne (`ai-news*`), `og-image.png` og `logo-email.png`.

## Hvor tingene ligger

| Sti | Indhold |
|---|---|
| `src/assets/guides/` | Guidernes billeder, i samme undermapper som guiderne |
| `config/images.mjs` | Slår flere bredder til (`layout: "constrained"`) |
| `config/markdown/local-picture.mjs` | Afgør, om et billede er Astros (relativ sti) eller serveres, som det står |
| `config/markdown/body-images.mjs` | Sætter `sizes` på billeder og holder tegninger som én fil. `COLUMN_SIZES` er spaltens bredde |
| `config/markdown/lead-image.mjs` | Giver guidens åbningsbillede høj prioritet |
| `src/styles/content/prose.css` | Billedernes hjørner og skygge; tegninger i fuld spaltebredde |
| `scripts/site-images.test.mjs` | Tests af de tre plugins, af `sizes` mod den målte spalte og af, at ingen guide peger på `/images/guides/` |
| `scripts/lib/seo-guide-pictures.mjs` | Kontrol af det byggede åbningsbillede. Køres af `npm run seo:validate` |
| `scripts/content-audit.py` | Fejler, hvis en relativ billedsti ikke rammer en fil |

## Spaltens bredde

`COLUMN_SIZES` følger sidens layout: menuen står ved siden af teksten fra 50rem, menu og
indholdsfortegnelse fra 72rem, og spalten bliver aldrig bredere end `--sb-measure` (45rem).

Tallene gælder sider med indholdsfortegnelse. En side uden (`tableOfContents: false` eller
`template: splash`) har en bredere spalte fra 72rem, og et billede dér ville blive uskarpt. Ingen
sådan side har billeder i teksten i dag, og testen "a page without a table of contents has no
pictures in its text" fejler, hvis en får det. Skal sådan en side have billeder, får
`COLUMN_SIZES` først en variant til den.

| Vindue | Spalte (målt) | Browseren får at vide | Fil ved almindelig pixeltæthed |
|---|---|---|---|
| 390 px | 358 px | 358 px | 640 px (32 KB) |
| 767 px | 720 px | 720 px | 750 px (40 KB) |
| 820 px | 468 px | 468 px | 640 px (32 KB) |
| 1072 px | 720 px | 720 px | 750 px (40 KB) |
| 1280 px | 640 px | 640 px | 640 px (32 KB) |
| 1360 px | 688 px | 720 px | 750 px (40 KB) |
| 1440 px og bredere | 720 px | 720 px | 750 px (40 KB) |

Filstørrelserne er Zigbee2MQTT-guidens åbningsbillede, som før var en PNG på 2.420 KB. En skærm
med dobbelt eller tredobbelt pixeltæthed henter en bredere fil, højst 133 KB.

Ændres layoutet (menuens bredde, `--sb-measure`, brudpunkterne), skal `COLUMN_SIZES` følge med.
Testen "the width the browser is told is the text column's at every window width" holder tallene
op mod den målte spalte og fejler, hvis browseren får en bredde at vide, der er mindre end
spalten (uskarpt billede) eller mere end 32 px større (for stor fil). Efter en layoutændring
måles spalten igen, og tabellen i testen opdateres.

## Diagrammer

Et diagram er en SVG-fil i guidens mappe under `src/assets/guides/`. Reglerne gælder nye
diagrammer og rettelser i de gamle.

- **Fakta først.** Hvert ben, hver spænding, port og protokol, hvert produktnavn og tal står ens
  i diagrammet og i guidens tekst og kode. Er de uenige, afgør en primær kilde (producentens
  datablad eller dokumentationen for Home Assistant eller ESPHome). Kan det ikke afgøres, rettes
  der ikke på gæt; det skrives op til ejeren.
- **Læsbart på en telefon.** `viewBox` er 640 enheder bred, og ingen tekst er under 18 enheder.
  Så er teksten ca. 9 px i en spalte på 328 px (vindue på 360 px). Hellere færre ting i
  diagrammet end mindre tekst.
- **Intet oven på tekst.** Ingen tekst overlapper anden tekst, rager ud af sin kasse eller ud af
  `viewBox`, og ingen ledning krydser en etiket eller et ben. Giv en tekst i en kasse mindst 8 %
  luft; andre systemer har bredere skrifter.
- **Egen baggrund.** Diagrammet har sit eget mørke panel (`#1a1a2e`), så det kan læses i både
  mørkt og lyst tema. Tekst på et farvet felt er hvid på mørk farve eller mørk på lys farve.
- **Ét sprog pr. fil.** Den danske fil hedder fx `wiring.svg`, den engelske `wiring-en.svg`, og
  hver guide peger på filen på sit eget sprog. Dansk skrives med æ, ø og å.
- **Tilgængelighed.** SVG-filen har `role="img"`, `lang`, en `<title>` og en `<desc>` på sit eget
  sprog. Alt-teksten i MDX-filen siger, hvad diagrammet viser (hvilket ben går hvor), ikke kun
  "diagram".
- **Teknik.** Kun `viewBox` (ingen `width` og `height`), `font-family="system-ui, sans-serif"`,
  ingen eksterne skrifter, scripts, rasterbilleder eller links til andre værter, og ingen emoji
  (de ser forskellige ud fra system til system).
- **Se det som billede.** Åbn filen i en browser i 328 og 720 px bredde på mørk og lys baggrund,
  før den lægges ind. Tegn selv; kopiér ikke andres diagrammer.

## Når noget ser forkert ud

| Du ser | Årsag og rettelse |
|---|---|
| `site:test`: "put guide pictures in src/assets/guides/" | En guide peger på `/images/...` for et billede i teksten. Flyt filen til `src/assets/guides/`, og skriv stien relativt til MDX-filen |
| `content-audit`: "image missing next to the guide" | Den relative sti rammer ikke en fil. Tæl `../`: en guide i en undermappe har én mere |
| `seo:validate`: "no picture says it is shown in the text column" | `rehypeBodyImages` kører ikke, eller `COLUMN_SIZES` er ændret uden bygning. Se `astro.config.mjs` |
| `seo:validate`: "has 1 WebP width(s) in srcset" | `config/images.mjs` er ikke i brug i `astro.config.mjs` |
| `seo:validate`: "not fetched with high priority" | `rehypeLeadImage` kører ikke, eller Home Assistant-guidens åbningsbillede er flyttet ned i teksten |
| Et diagram er smalt midt i spalten | Reglen for `img[src*=".svg"]` i `prose.css` mangler |
| Et billede er uskarpt på en bred skærm | Kilden er for smal. Læg en kilde på op til 1600 px |

## Fjern det igen

1. Fjern `image` og de to plugins (`rehypeLeadImage`, `rehypeBodyImages`) i `astro.config.mjs`.
2. Slet `config/images.mjs`, `body-images.mjs`, `lead-image.mjs` og `local-picture.mjs` i `config/markdown/`, `scripts/site-images.test.mjs` og
   `scripts/lib/seo-guide-pictures.mjs`, og fjern kaldet i `scripts/seo-validate.mjs`.
3. Billederne virker stadig fra `src/assets/guides/`, men kun i én bredde.
