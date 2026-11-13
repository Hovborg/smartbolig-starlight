// Self-hosted fonts. The files come from the pinned @fontsource-variable
// packages (SIL OFL 1.1) and are served from this site; no font CDN is called.
// The first variant of each family is the Latin file, which Head.astro
// preloads. Details: docs/designsystem.md.
import { fontProviders } from "astro/config";

// Unicode ranges as published by Fontsource for these subsets.
const LATIN = [
  "U+0000-00FF", "U+0131", "U+0152-0153", "U+02BB-02BC", "U+02C6", "U+02DA", "U+02DC", "U+0304", "U+0308",
  "U+0329", "U+2000-206F", "U+20AC", "U+2122", "U+2191", "U+2193", "U+2212", "U+2215", "U+FEFF", "U+FFFD",
];
const LATIN_EXT = [
  "U+0100-02BA", "U+02BD-02C5", "U+02C7-02CC", "U+02CE-02D7", "U+02DD-02FF", "U+0304", "U+0308", "U+0329",
  "U+1D00-1DBF", "U+1E00-1E9F", "U+1EF2-1EFF", "U+2020", "U+20A0-20AB", "U+20AD-20C0", "U+2113",
  "U+2C60-2C7F", "U+A720-A7FF",
];

const systemSans = ["ui-sans-serif", "system-ui", "sans-serif"];

function family({ name, cssVariable, pkg, file, weight }) {
  const variant = (subset, unicodeRange) => ({
    weight,
    style: "normal",
    src: [`${pkg}/files/${file}-${subset}-wght-normal.woff2`],
    unicodeRange,
  });
  return {
    provider: fontProviders.local(),
    name,
    cssVariable,
    fallbacks: systemSans,
    options: { variants: [variant("latin", LATIN), variant("latin-ext", LATIN_EXT)] },
  };
}

export const fonts = [
  family({ name: "Figtree", cssVariable: "--font-body", pkg: "@fontsource-variable/figtree", file: "figtree", weight: "300 900" }),
  family({
    name: "Bricolage Grotesque",
    cssVariable: "--font-display",
    pkg: "@fontsource-variable/bricolage-grotesque",
    file: "bricolage-grotesque",
    weight: "200 800",
  }),
];
