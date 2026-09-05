# Homepage design verification — 2026-09-05

Base: `4193c0a4661bd61e74689b2153a593b9a6044bf0`. Branch: `feat/homepage-design-20260905`.

The Danish and English homepages use a larger existing home photograph, green accents, sans-serif headings, five topic links with decorative icons, an illustrated featured guide and responsive news cards. Light and dark themes share the same hierarchy. The content, destination links and section order are preserved; the only new copy is the photo caption and three short topic labels in each language.

The change adds no dependencies, remote assets, fonts, client-side JavaScript or Worker logic. The hero retains its AVIF/WebP source set, dimensions, eager loading and high fetch priority. Below-the-fold news images remain lazy-loaded. Shell adjustments require `body:has(.home-portal)` so article pages keep their existing layout.

## Local evidence

- `npm run site:test`: 108 passed, zero failed.
- `npm run ai-news:test`: 76 passed, eight platform-specific skips on Windows, zero failed.
- `python -m unittest discover -s scripts -p "test_*.py"`: three passed.
- `python scripts/content-audit.py`: `TOTAL ISSUES: 0`.
- `npm run ai-news:validate`: 62 bilingual issues validated.
- `npm audit --audit-level=high`: `found 0 vulnerabilities`.
- `npm run build`: 313 pages built; Pagefind indexed 313 pages.
- `npm run seo:validate`: 312 sitemap pages passed.
- `npm run worker:build` and `npx wrangler deploy --dry-run`: succeeded, 1,617 assets.
- `git diff --check`: passed.

Isolated Chrome checks exercised both locales and both themes at 360, 390, 768, 1024 and 1440 pixels: all 20 layout combinations passed without horizontal overflow, offscreen heading/body-text boxes or page errors. Images loaded, topic links retained the correct locale, and the inherited markdown list indentation and heading decoration were absent. The primary CTA navigated to the correct start guide in both languages; search returned results; the chat panel opened and closed; normal article navigation retained a single heading and no homepage portal. These checks did not invoke the AI model.

Screenshots and machine-readable browser results are kept as local review artifacts. GitHub CI, independent review and any production verification are checked separately against the actual final commit before a publication claim.
