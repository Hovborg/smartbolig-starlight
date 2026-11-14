# Open source, siden bruger

Sidst kontrolleret: 2026-11-14.
Kontrolleret ved: version og licens læst fra hver pakkes `package.json` i
`node_modules`, sammenholdt med `package.json` og `package-lock.json` i roden.

Alle licenser nedenfor tillader kommerciel brug på en side med annoncer.
Versionerne er låst i `package-lock.json`. Nye pakker skal igennem samme
kontrol, før de tages i brug (se nederst).

## Pakker, siden selv vælger

| Pakke | Version | Licens | Bruges til | Kilde |
|---|---|---|---|---|
| `astro` | 7.4.7 | MIT | Bygger siden | github.com/withastro/astro |
| `@astrojs/starlight` | 0.41.7 | MIT | Guides: sidemenu, søgning, sprog | github.com/withastro/starlight |
| `@astrojs/markdown-remark` | 7.3.0 | MIT | Markdown til HTML | github.com/withastro/astro |
| `@astrojs/rss` | 4.0.19 | MIT | RSS-feed for nyheder | github.com/withastro/astro |
| `remark-gfm` | 4.0.1 | MIT | Tabeller og fodnoter i Markdown | github.com/remarkjs/remark-gfm |
| `github-slugger` | 2.0.0 | ISC | Ankre til overskrifter | github.com/Flet/github-slugger |
| `sharp` | 0.35.5 | Apache-2.0 | Billeder ved build (ikke i browseren) | github.com/lovell/sharp |
| `@fontsource-variable/figtree` | 5.3.0 | OFL-1.1 | Skrift til brødtekst | github.com/fontsource/font-files |
| `@fontsource-variable/bricolage-grotesque` | 5.3.0 | OFL-1.1 | Skrift til overskrifter | github.com/fontsource/font-files |
| `three` | 0.187.0 | MIT | 3D-huset på forsiden. Hentes først, når huset skal vises levende | github.com/mrdoob/three.js |
| `esbuild` (kun udvikling) | 0.28.2 | MIT | Pakker 3D-huset, når stillbilledet tegnes (`npm run house:posters`) | github.com/evanw/esbuild |
| `wrangler` (kun udvikling) | 4.159.0 | MIT eller Apache-2.0 | Udgivelse til Cloudflare | github.com/cloudflare/workers-sdk |
| `fontkitten` (kun udvikling) | 1.0.3 | MIT | Tegner ordmærket som kurver i `npm run brand:build` | github.com/delucis/fontkitten |

## Pakker, der følger med Starlight

| Pakke | Version | Licens | Bruges til |
|---|---|---|---|
| `pagefind` | 1.5.2 | MIT | Søgning uden server |
| `astro-expressive-code` | 0.44.3 | MIT | Kodeblokke |
| `@astrojs/mdx` | 7.0.8 | MIT | MDX-sider |
| `@astrojs/sitemap` | 3.7.3 | MIT | Sitemap |

## Kode, der hentes udefra i browseren

Dette er ikke pakker i repoet, men scripts fra andre. De er nævnt her, fordi de
kører på siden, og fordi CSP'en i `public/_headers` skal tillade dem.

| Tjeneste | Hvad | Hvornår |
|---|---|---|
| Giscus (MIT, giscus.app) | Kommentarer via GitHub Discussions | Når kommentarfeltet vises |
| Google AdSense | Annoncer | Scriptet hentes på alle sider. Cookies og personlige annoncer først efter samtykke (Consent Mode starter som "denied") |
| Google Analytics 4 | Besøgsmåling | Scriptet hentes på alle sider. Cookies og måling med id først efter samtykke |

## Skrifterne

Figtree og Bricolage Grotesque er udgivet under SIL Open Font License 1.1.
Licensen tillader brug på kommercielle sider og indlejring i billeder (logo og
delebillede). Filerne ligger på eget domæne; der hentes intet fra en skrift-CDN.

## Sådan tilføjer du en pakke

1. Find den på GitHub. Læs licensen: den skal tillade kommerciel brug (MIT, ISC,
   BSD, Apache-2.0, OFL for skrifter). GPL, AGPL og "non-commercial" bruges ikke.
2. Se, om den vedligeholdes: en udgivelse inden for det seneste år og besvarede fejlmeldinger.
3. Læs koden, du tager i brug, og hvad pakken selv trækker ind (`npm ls <pakke>`).
4. Installér med fast version: `npm install --save-exact <pakke>@<version>`.
5. Kør `npm audit --audit-level=high` og `npm run site:test`.
6. Tilføj en række i tabellen ovenfor i samme commit.

## Sådan fjerner du en pakke

`npm uninstall <pakke>`, fjern rækken her, og kør `npm run site:test` og `npm run build`.
