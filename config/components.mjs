// Starlight component overrides.
// Note: the custom 404 page lives at src/pages/404.astro ("NotFound" is
// not a valid Starlight component-override key and would be silently ignored).
export const components = {
  Header: "./src/components/chrome/Header.astro",
  Head: "./src/components/Head.astro",
  Footer: "./src/components/Footer.astro",
  MarkdownContent: "./src/components/MarkdownContent.astro",
  PageTitle: "./src/components/PageTitle.astro",
  SiteTitle: "./src/components/SiteTitle.astro",
  SkipLink: "./src/components/SkipLink.astro",
  ThemeProvider: "./src/components/chrome/ThemeProvider.astro",
  ThemeSelect: "./src/components/ThemeSelect.astro",
};
