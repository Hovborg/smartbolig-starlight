# 📋 TODO - SmartBolig Starlight Migration

## 🔴 Kritiske Problemer (FIX FØRST)

- [ ] **Logo vises ikke korrekt** - Tjek `astro.config.mjs` logo path
- [ ] **Hero-billede på forsiden** - Opdater `src/content/docs/da/index.mdx`
- [ ] **Build og deploy** - Kør `npm run build` og tjek for fejl

## 🟡 Skal Verificeres

- [ ] **Sidebar navigation** - Matcher struktur det oprindelige indhold?
- [ ] **Alle links virker** - Test interne links
- [ ] **Sprog-skift** - Test DA ↔ EN fungerer
- [ ] **Søgefunktion** - Test Pagefind søgning
- [ ] **Mobile responsive** - Test på mobil viewport

## 🟢 Styling & Design

- [ ] **IBRACORP dark theme** - Verificer farver matcher
- [ ] **Code blocks** - Test syntax highlighting
- [ ] **Cards hover effect** - Test animationer
- [ ] **Hero gradient** - Tjek det ser rigtigt ud

## 📝 Indhold

- [ ] **Alle 109 DA sider migreret** - Verificer alle findes
- [ ] **Alle 17 EN sider migreret** - Verificer alle findes
- [ ] **Billeder** - Tjek alle billeder loader
- [ ] **Frontmatter** - Tjek title, description på alle sider

## 💰 Monetisering

- [ ] **Cookiebot** - Test consent popup vises
- [ ] **Google AdSense script** - Verificer i browser console
- [ ] **Ezoic** - Skal tilføjes separat?

## 🚀 Deployment

- [ ] **GitHub Secrets** - Tilføj CLOUDFLARE_API_TOKEN + ACCOUNT_ID
- [ ] **Auto-deploy** - Test push → deploy workflow
- [ ] **Custom domain** - Verificer https://smartbolig.net virker

---

## 🛠️ Nyttige Kommandoer

```bash
# Start dev server
npm run dev

# Build site
npm run build

# Preview build
npm run preview

# Deploy manuelt
CLOUDFLARE_API_TOKEN=xxx npx wrangler pages deploy dist --project-name=smartbolig-starlight
```

## 📁 Vigtige Filer

| Fil | Formål |
|-----|--------|
| `astro.config.mjs` | Hoved-konfiguration |
| `src/styles/custom.css` | IBRACORP dark theme |
| `src/content/docs/da/index.mdx` | Dansk forside |
| `src/content/docs/en/index.mdx` | Engelsk forside |
| `src/assets/logo-dark.svg` | Logo (dark mode) |
| `src/assets/logo-light.svg` | Logo (light mode) |

## 🔗 Links

- **Live site:** https://smartbolig.net
- **GitHub repo:** https://github.com/Hovborg/smartbolig-starlight
- **Cloudflare Pages:** https://dash.cloudflare.com → Pages
- **Starlight Docs:** https://starlight.astro.build
