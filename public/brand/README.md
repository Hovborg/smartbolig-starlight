# SmartBolig.net brandfiler

Sidst opdateret: 2026-11-14.

Alle filer er genereret af `scripts/brand-assets.mjs` ud fra det samme husmærke,
som topbjælken tegner i `src/components/SiteTitle.astro`. Ret ikke filerne i hånden.

## Filer

| Fil | Størrelse | Bruges til |
|---|---|---|
| `/favicon.svg` | skalerbar | Faneblad i moderne browsere |
| `/favicon.ico` | 32x32 | Ældre browsere og værktøjer |
| `/apple-touch-icon.png` | 180x180 | iOS-hjemmeskærm, uden gennemsigtige hjørner |
| `icon/icon-192.png`, `icon/icon-512.png` | 192, 512 | App-ikoner |
| `icon/icon-maskable-512.png` | 512x512 | Maskérbart app-ikon, huset ligger i sikkerhedszonen |
| `logo/logo-dark-1200x270.png` | 1200x270 | Mørk tekst på lys baggrund. Bruges i Organization-JSON-LD |
| `logo/logo-light-1200x270.png` | 1200x270 | Lys tekst på mørk baggrund |
| `logo/logo.svg` | skalerbar | Mærke og navn på gennemsigtig baggrund, til lyse flader |
| `/images/og-image.png` | 1200x630 | Standardbillede ved deling |

"Dark" i `logo-dark-1200x270.png` betyder mørk skrift og lys baggrund, ikke mørkt tema.
Navnet er bevaret, fordi `src/lib/seo/site.ts` og `scripts/seo-validate.mjs` peger på det.

Navnet i billederne er tegnet som former ud fra sidens egen skrifttype, så billederne
ikke afhænger af skrifttyper på maskinen.

## Generér igen

```
npm run brand:build
```

Kør det to gange: den anden kørsel må ikke ændre noget i `git status`. Farverne står i
`scripts/lib/brand/palette.mjs` og følger `src/styles/tokens/color.css`. Siden bygges
uden at køre scriptet; de genererede filer ligger i git.

## Licens

Skrifttypen Bricolage Grotesque (navnet i logoet) er under SIL Open Font License 1.1.
Mærket og navnet er SmartBolig.net's eget.
