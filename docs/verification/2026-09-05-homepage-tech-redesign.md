# Homepage redesign: the existing Galaxy visual identity

The previous homepage introduced a green palette that did not match the guide
pages. This redesign uses Galaxy's existing background, accent, text and font
variables, and leaves the shared header styling intact.

The hero is rebuilt around a custom inline SVG connected-home illustration:
an isometric house, devices, a local hub and animated signal paths. A native
checkbox pauses its continuous CSS animation. Reduced-motion users receive the
static version. The diagram is explicitly labelled as an illustration, not a
live dashboard, and its SVG is decorative. A photograph provides the connection
to the physical home. The guide feature adds an existing electronics photograph.

Topic navigation uses five larger cards. The three-stage starter route is now
horizontal on desktop and vertical on small screens, followed by the illustrated
guide feature, source/trust links, news cards and the closing CTA. All existing
destinations and the bilingual copy structure are preserved. No new dependencies
or client JavaScript are required.

Verification covers the existing repository tests and publishing checks plus
browser checks of both locales and themes, 320–1440 px layouts, image loading,
native animation pause, reduced motion, keyboard access, search, chat-panel
controls and theme consistency with normal guide pages. Results are recorded
after executing the checks; this document is not evidence of deployment.

## Executed local checks

- Site tests: 108 passed. News tests: 78 passed, 8 Linux-only skips.
- Python tests: 3 passed. Content audit: zero issues. Dependency audit: zero vulnerabilities.
- News validation: 62 bilingual pairs. Build: 313 pages. SEO: 312 sitemap pages passed.
- Worker build and Wrangler deployment dry run: passed.
- Isolated Chrome: 20 layouts across both locales/themes and 320, 390, 768,
  1024 and 1440 px. No overflow, broken images or JavaScript errors. Navigation,
  search and chat-panel controls passed in both locales.
- A separate browser check compared actual homepage and guide computed styles:
  body background, header background, font and accent matched in all four
  locale/theme combinations. Animation pause, keyboard resume and dynamic
  reduced-motion changes also passed in all four combinations.
