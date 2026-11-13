// Site URL and scalar Starlight options: title, theme CSS, code blocks, locales, social links.
export const siteUrl = "https://smartbolig.net";

export const starlightOptions = {
  title: "SmartBolig.net",
  // The whole theme (tokens, Starlight mapping, parts): src/styles/index.css.
  customCss: ["./src/styles/index.css"],
  // Code blocks use Starlight's own light and dark themes, which follow the
  // site theme and its colours.
  expressiveCode: {
    frames: { extractFileNameFromCode: false },
    styleOverrides: { borderRadius: "0.875rem" },
  },
  // The custom 404 page lives at src/pages/404.astro — disable Starlight's
  // built-in 404 route so the two don't collide (collision becomes a hard
  // error in future Astro versions).
  disable404Route: true,
  // Social links
  social: [
    {
      icon: "github",
      label: "GitHub",
      href: "https://github.com/Hovborg/smartbolig-starlight",
    },
  ],
  // Internationalization (Danish default + English)
  defaultLocale: "da",
  locales: {
    da: {
      label: "Dansk",
      lang: "da",
    },
    en: {
      label: "English",
      lang: "en",
    },
  },
  // Table of contents
  tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
  // Show last updated date on pages (requires git)
  lastUpdated: true,
  // Enable search
  pagefind: true,
  // Disable credits
  credits: false,
};
