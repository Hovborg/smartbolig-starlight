# Designsystem

Sidst kontrolleret: 2026-11-14.
Kontrolleret ved: `npm run site:test` (kontrasttesten `scripts/site-design-tokens.test.mjs`
og tematesten i `scripts/site-ui.test.mjs`) og `npm run build`.

Siden har ét sæt designværdier (tokens). Alle komponenter bruger dem. Der står
ingen farvekoder, skrifttyper eller skygger direkte i komponenterne.

## Hvor tingene ligger

| Sti | Indhold |
|---|---|
| `src/styles/tokens/color.css` | Farver til lyst og mørkt tema (`--sb-*`) |
| `src/styles/tokens/scale.css` | Skrift, størrelser, afstand, hjørner, skygger, bevægelse, bredder |
| `src/styles/starlight/bridge.css` | Oversætter tokens til Starlights egne variabler (`--sl-*`) |
| `src/styles/base.css` | Side, baggrund, fokus, overskrifter |
| `src/styles/chrome/` | Topbjælke, sidemenu, indholdsfortegnelse, sidefod-navigation |
| `src/styles/content/` | Brødtekst, tabeller, kodeblokke, bokse, kort, faner |
| `src/styles/print.css` | Print: skjuler menuer, assistent og kommentarer |
| `src/styles/home/` | Forsiden: `layout.css` (ramme, knapper), `hero.css`, `scene.css` (huset), `sections.css`, `motion.css` |
| `src/styles/index.css` | Importerer det hele i rækkefølge. Den eneste fil, Starlight får |
| `config/fonts.mjs` | Skrifttyper (selvhostede) |
| `src/components/chrome/` | Egen topbjælke og temastart |

En komponents egne stilregler ligger i komponentens `<style>` og bruger kun tokens.

Forsiden er undtagelsen: dens stilregler ligger i `src/styles/home/` og hentes af
`src/components/HomeStyles.astro`, fordi overskriften tegnes af `PageTitle.astro`
uden for forsidens egne komponenter. Teksterne står i `src/lib/home-copy/da.ts` og `en.ts`.

Starlight farver alle links i sideindhold. En komponent med egne linkfarver skal
derfor skrive reglen som `:global(.sl-markdown-content) .min-klasse` (i en komponent)
eller `:is(.home-portal, .home-hero) .min-klasse` (på forsiden). Ellers vinder Starlights farve.

## Farver

Hver farve har en rolle. Brug rollen, ikke en bestemt nuance.

| Token | Bruges til |
|---|---|
| `--sb-bg`, `--sb-bg-subtle` | Sidens baggrund og rolige flader |
| `--sb-surface` | Kort og bokse, der ligger oven på baggrunden |
| `--sb-line`, `--sb-line-strong` | Kanter og skillelinjer |
| `--sb-ink-strong`, `--sb-ink`, `--sb-ink-muted`, `--sb-ink-subtle` | Overskrifter, brødtekst, sekundær tekst, hjælpetekst |
| `--sb-accent`, `--sb-accent-strong` | Links, knapper, aktive tilstande |
| `--sb-accent-soft` | Baggrund bag accentfarvet tekst (mærkater, aktiv menu) |
| `--sb-accent-vivid` | Kun grafik og pynt, aldrig tekst |
| `--sb-on-accent` | Tekst på en accentfarvet flade |
| `--sb-warm`, `--sb-sky`, `--sb-violet`, `--sb-danger` (+ `-soft`, `-vivid`) | Advarsel, information, tip, fejl |

Regler:

- Tekst skal have kontrast 4,5:1 mod sin baggrund (overskrifter og brødtekst 7:1).
  `scripts/site-design-tokens.test.mjs` tester parrene i begge temaer.
- `-vivid`-farver er til illustrationer og ikoner. De består ikke tekstkravet.
- Gennemsigtige varianter laves med `color-mix(in srgb, var(--sb-accent) 12%, transparent)`.
- Lyst og mørkt tema har de samme tokens. En komponent skal aldrig spørge, hvilket
  tema der er aktivt.

## Tema

Mørkt tema er standard for alle besøgende, uanset enhedens indstilling. Lyst tema
vælges med temavælgeren i topbjælken, og valget gemmes i browseren.
`src/components/chrome/ThemeProvider.astro` sætter `data-theme` på `<html>`, før
siden tegnes, og holder browserens temafarve (`theme-color`) i takt. Siderne
leveres med `data-theme="dark"`, så mørkt også gælder uden JavaScript.
Begge temaer skal fortsat virke fuldt ud: byg og kontrollér altid i begge.

Print bruger altid det lyse tema, fordi papir er hvidt. `ThemeProvider.astro`
skifter til lyst, mens der printes, og tilbage bagefter. De mørke værdier i
`src/styles/tokens/` står inde i `@media not print`, så det også gælder uden
JavaScript. `src/styles/print.css` skjuler topbjælkens knapper, assistenten og
kommentarerne. Kontrolleret 2026-11-14 ved at udskrive en guide til PDF fra
Chrome: mørk tekst, læsbare kodeblokke, ingen menuer.

## Skrift

| Token | Skrifttype | Bruges til |
|---|---|---|
| `--sb-font-display` | Bricolage Grotesque (variabel) | Overskrifter og logo |
| `--sb-font-body` | Figtree (variabel) | Al anden tekst |
| `--sb-font-mono` | Systemets monospace | Kode |

Filerne kommer fra pakkerne `@fontsource-variable/*` (SIL OFL 1.1) og ligger på
siden selv. Der kaldes ingen skrifttype-tjeneste. Kun den latinske fil for hver
skrifttype forindlæses.

Størrelser: `--sb-text-xs` til `--sb-text-h1` og `--sb-text-display` (forsidens
store overskrift). Linjehøjde: `--sb-leading` (brødtekst), `--sb-leading-tight`
(overskrifter).

## Afstand, hjørner, skygger, bevægelse

- Afstand: `--sb-space-1` (4 px) til `--sb-space-9`. Brug trinene; opfind ikke mellemværdier.
- Hjørner: `--sb-radius-sm`, `-md`, `-lg`, `-xl`, `-pill`.
- Skygger: `--sb-shadow-sm`, `-md`, `-lg`. De er svagere i mørkt tema.
- Bevægelse: `--sb-dur-fast`, `--sb-dur`, `--sb-dur-slow` og kurven `--sb-ease`.
- Bredder: `--sb-measure` (tekstspalte), `--sb-page-max` (hele siden).

## Regler for bevægelse og illustrationer

- Al bevægelse ligger inde i `@media (prefers-reduced-motion: no-preference)`.
  Uden den skal siden se færdig ud og virke.
- En animation skal forklare noget (et signal, en rækkefølge, en tilstand). Pynt
  uden indhold udelades.
- Illustrationer er SVG i koden og bruger tokens, så de følger temaet.
- Tung grafik (3D, lærred) indlæses først, når den er synlig, og har et stillbillede
  som reserve.

## Sådan gør du

### Ret en designværdi

1. Find tokenet i `src/styles/tokens/color.css` eller `scale.css`.
2. Ret værdien. For farver: ret både lyst og mørkt tema.
3. Kør `npm run site:test`. Kontrasttesten fejler, hvis en tekstfarve bliver for svag.
4. Kør `npm run dev`, og se siden i begge temaer.

### Tilføj en ny farve eller størrelse

1. Tilføj tokenet begge steder i `color.css` (lyst og mørkt), eller i `scale.css`.
2. Skal det bruges til tekst: tilføj parret i `scripts/site-design-tokens.test.mjs`.
3. Beskriv rollen i tabellen ovenfor.

### Lav en ny komponent

1. Læg den i `src/components/` (i en undermappe, hvis den hører til et område).
2. Skriv stilreglerne i komponentens `<style>` med tokens.
3. Ingen farvekoder, ingen `px`-skriftstørrelser, ingen egne skygger.
4. Tjek den i lyst og mørkt tema, på 375 px og 1440 px bredde, og med tastatur.

### Fjern det igen

Temaet er samlet i `src/styles/`, `src/components/chrome/` og `config/fonts.mjs`.
Sæt `customCss` i `config/site.mjs` til en tom liste, og fjern `Header` og
`ThemeProvider` i `config/components.mjs`, så står Starlights standardudseende tilbage.

## Logo og brandfiler

Logoet er et husmærke (grøn flise, hvid husskitse og en prik) plus navnet i overskriftsskriften.
Topbjælken tegner det som levende SVG og tekst i `src/components/SiteTitle.astro`. Alle statiske
filer genereres ud fra samme mærke.

| Sti | Indhold |
|---|---|
| `scripts/brand-assets.mjs` | Genererer alle brandfiler. Kør `npm run brand:build` |
| `scripts/lib/brand/` | Mærkets geometri (`mark.mjs`), farver (`palette.mjs`), tekst som former (`text.mjs`), kompositioner (`compose.mjs`), ICO (`ico.mjs`) |
| `public/favicon.svg`, `public/favicon.ico`, `public/apple-touch-icon.png` | Ikoner, linket fra `config/head/icons.mjs` og `NotFoundLayout.astro` |
| `public/brand/` | App-ikoner og logofiler. Se `public/brand/README.md` |
| `public/images/og-image.png` | Standardbillede ved deling |

- De genererede filer ligger i git. Siden bygges uden at køre scriptet.
- Ændres mærket, skal `SiteTitle.astro` og `scripts/lib/brand/mark.mjs` ændres sammen.
  `scripts/site-brand.test.mjs` fejler, hvis de to er forskellige.
- Navnet i billederne er tegnet som former fra den selvhostede skrifttypefil, med `fontkitten`
  (MIT, udviklingsafhængighed). Ingen skrifttype skal være installeret på maskinen.
- `/favicon.ico`, `/favicon.svg`, `/images/og-image.png` og
  `/brand/logo/logo-dark-1200x270.png` er adresser, andre tjenester kan bruge. Behold dem.

### Fjern det igen

Slet `scripts/brand-assets.mjs`, `scripts/lib/brand/` og `scripts/site-brand.test.mjs`, fjern
`brand:build` og `fontkitten` fra `package.json` (og kør `npm install --package-lock-only`),
og fjern `config/head/icons.mjs` fra `config/head/index.mjs`. Filerne i `public/` kan blive stående.
