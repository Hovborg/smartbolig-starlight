// Site URL and scalar Starlight options: title, logo, theme CSS, code blocks, locales, social links.
export const siteUrl = "https://smartbolig.net";

export const starlightOptions = {
  title: "SmartBolig.net",
  // Logo configuration - animated chip logo with glow
  logo: {
    light: "./src/assets/logo-light.svg",
    dark: "./src/assets/logo-dark.svg",
    replacesTitle: true,
    alt: "SmartBolig logo",
  },
  // Galaxy visual system is wired explicitly so our accessible theme
  // switch can replace the package override without plugin warnings.
  customCss: ["starlight-theme-galaxy/styles/index.css"],
  expressiveCode: {
    themes: ["github-dark-high-contrast", "light-plus"],
    frames: { extractFileNameFromCode: false },
    styleOverrides: {
      borderRadius: "0.4rem",
      borderColor: "var(--fb-code-block-bg-color)",
      codeBackground: "var(--fb-code-block-bg-color)",
      frames: {
        shadowColor: "var(--sl-shadow-sm)",
        editorActiveTabIndicatorTopColor: "unset",
        editorActiveTabIndicatorBottomColor: "var(--sl-color-gray-3)",
        editorTabBarBorderBottomColor: "var(--fb-code-block-bg-color)",
        frameBoxShadowCssValue: "unset",
      },
    },
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
