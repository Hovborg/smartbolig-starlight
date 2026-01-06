# SmartBolig Brand Assets

Komplet logo-pakke til SmartBolig.net

## Mappestruktur

```
brand/
├── icon/           # Logo ikon (kun chip)
├── logo/           # Logo med tekst
├── animated/       # Animerede versioner
├── favicon/        # Favicons til website
├── profile/        # Profilbilleder (social media)
├── social/         # Open Graph & Twitter cards
└── banner/         # Cover/banner billeder
```

## Icon (kun chip)

| Fil | Størrelse | Brug |
|-----|-----------|------|
| `icon.svg` | Skalerbar | Oprindelig vektor |
| `icon-light-bg.svg` | Skalerbar | Hvid baggrund |
| `icon-64.png` | 64x64 | Små ikoner |
| `icon-128.png` | 128x128 | App ikoner |
| `icon-256.png` | 256x256 | Store ikoner |
| `icon-512.png` | 512x512 | HD ikoner |
| `icon-1024.png` | 1024x1024 | Print/retina |

## Logo med tekst

| Fil | Størrelse | Brug |
|-----|-----------|------|
| `logo-dark.svg` | 400x90 | Mørk baggrund (website) |
| `logo-light.svg` | 400x90 | Lys baggrund |
| `logo-transparent.svg` | 400x90 | Transparent baggrund |
| `logo-dark-400x90.png` | 400x90 | Standard web |
| `logo-dark-800x180.png` | 800x180 | 2x retina |
| `logo-dark-1200x270.png` | 1200x270 | 3x retina |

## Animeret

| Fil | Størrelse | Brug |
|-----|-----------|------|
| `logo-animated-400x90.gif` | 400x90 | Website header |
| `logo-animated-280x63.gif` | 280x63 | Email signatur |
| `logo-animated-200x45.gif` | 200x45 | Kompakt |
| `icon-animated-256.gif` | 256x256 | Profilbillede |
| `icon-animated-128.gif` | 128x128 | Lille profil |
| `icon-animated-64.gif` | 64x64 | Mini |

## Favicon

| Fil | Størrelse | Brug |
|-----|-----------|------|
| `favicon.svg` | Skalerbar | Moderne browsere |
| `favicon-16x16.png` | 16x16 | Browser tab |
| `favicon-32x32.png` | 32x32 | Browser tab (retina) |
| `favicon-48x48.png` | 48x48 | Windows |
| `favicon-180x180.png` | 180x180 | Apple Touch Icon |
| `favicon-192x192.png` | 192x192 | Android Chrome |
| `favicon-512x512.png` | 512x512 | PWA splash |

## Profilbilleder

| Fil | Størrelse | Brug |
|-----|-----------|------|
| `profile-square.svg` | 512x512 | Firkantet original |
| `profile-circle.svg` | 512x512 | Rund original |
| `profile-square-256.png` | 256x256 | Discord, Slack |
| `profile-square-512.png` | 512x512 | LinkedIn, Twitter |
| `profile-circle-256.png` | 256x256 | Google, YouTube |
| `profile-circle-512.png` | 512x512 | Store profiler |
| `profile-animated-256.gif` | 256x256 | Discord, Telegram |

## Social Media

| Fil | Størrelse | Brug |
|-----|-----------|------|
| `og-image.png` | 1200x630 | Facebook, LinkedIn deling |
| `twitter-card.png` | 1200x600 | Twitter/X deling |

## Banners/Covers

| Fil | Størrelse | Platform |
|-----|-----------|----------|
| `youtube-banner.png` | 2560x1440 | YouTube kanal |
| `linkedin-banner.png` | 1584x396 | LinkedIn profil |
| `facebook-cover.png` | 820x312 | Facebook side |

## Farver

| Navn | Hex | Brug |
|------|-----|------|
| Baggrund | `#0d1117` | Mørk baggrund |
| Tekst | `#e6edf3` | Primær tekst |
| Cyan | `#06b6d4` | Accent, links |
| Grøn | `#3fb950` | "Bolig" tekst |
| Grå | `#6e7681` | Sekundær tekst |
| Border | `#30363d` | Kanter |

## Fonte

- **Smart**: system-ui, 600 weight
- **Bolig**: system-ui, 700 weight (bold)
- **.net**: system-ui, 400 weight

## HTML Implementation

### Favicon
```html
<link rel="icon" type="image/svg+xml" href="/brand/favicon/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/brand/favicon/favicon-32x32.png">
<link rel="apple-touch-icon" href="/brand/favicon/favicon-180x180.png">
```

### Open Graph
```html
<meta property="og:image" content="https://smartbolig.net/brand/social/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://smartbolig.net/brand/social/twitter-card.png">
```

---
*Genereret 2026-01-06*
