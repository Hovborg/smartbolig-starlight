# SmartBolig.net - Copilot Agent Prompt

Kopier denne tekst og paste den ind i GitHub Copilot Chat i VS Code:

---

## PROMPT START (kopier fra her) 👇

Du er min AI-assistent til at bygge **smartbolig.net** - en dansk smart home dokumentationssite.

## Projekt Status

Vi har netop migreret fra Hugo til **Astro Starlight**. Sitet er LIVE på https://smartbolig.net men der er flere ting der ikke virker korrekt.

## Tech Stack

- **Framework:** Astro 5.x + Starlight 0.37.x
- **Styling:** Tailwind CSS 4.x + Custom CSS (IBRACORP dark theme)
- **Sprog:** Dansk (da) som default, English (en)
- **Hosting:** Cloudflare Pages
- **Repo:** https://github.com/Hovborg/smartbolig-starlight

## Farve Palette (GitHub Dark)

```
Background: #0d1117, #161b22, #1a2332
Text: #e6edf3 (primary), #8b949e (secondary)
Accent Blue: #58a6ff
Accent Green: #3fb950, #238636
Border: #30363d
```

## Hvad der ER lavet ✅

1. Starlight projekt oprettet med dansk/engelsk support
2. IBRACORP-inspireret dark theme i `src/styles/custom.css`
3. Indhold migreret til `src/content/docs/da/` og `src/content/docs/en/`
4. Cloudflare Pages deployment virker
5. Custom domæne smartbolig.net er aktivt
6. Cookiebot + AdSense scripts tilføjet i `astro.config.mjs`
7. Logo SVG filer oprettet i `src/assets/`

## Hvad der SKAL fixes 🔴

1. **Logo vises ikke** - Tjek logo config i `astro.config.mjs`
2. **Hero sektion på forsiden** - `src/content/docs/da/index.mdx` bruger forkert billede
3. **Sidebar struktur** - Verificer alle kategorier vises korrekt
4. **Styling issues** - Nogle CSS regler virker måske ikke
5. **Build warnings** - Kør `npm run build` og fix eventuelle fejl

## Vigtige Filer

- `astro.config.mjs` - Hoved-konfiguration
- `src/styles/custom.css` - Dark theme styling
- `src/content/docs/da/index.mdx` - Dansk forside
- `src/assets/logo-dark.svg` - Logo til dark mode
- `TODO.md` - Komplet opgaveliste

## Kommandoer

```bash
npm run dev      # Start dev server på localhost:4321
npm run build    # Byg til production
npm run preview  # Preview production build
```

## Din opgave

1. Læs først `TODO.md` for komplet liste
2. Start med at køre `npm run dev`
3. Åbn http://localhost:4321/da/ i browser
4. Fix problemerne én ad gangen
5. Test efter hver ændring

Start med at analysere projektet og fortæl mig hvad du finder af problemer. Kør gerne `npm run build` først for at se eventuelle fejl.

## PROMPT SLUT 👆

---

## Sådan bruger du det:

1. Klik på "Generate Agent Instructions" ELLER
2. Skriv/paste prompten ovenfor i chat-feltet
3. Tryk Enter

Copilot vil så analysere dit projekt og hjælpe dig med at fixe problemerne.
