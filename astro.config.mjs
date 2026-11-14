// @ts-check
// Thin entry: wires the config modules in config/ together. Add content there, not here.
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import remarkGfm from "remark-gfm";
import { siteUrl, starlightOptions } from "./config/site.mjs";
import { components } from "./config/components.mjs";
import { sidebar } from "./config/sidebar/index.mjs";
import { head } from "./config/head/index.mjs";
import { fonts } from "./config/fonts.mjs";

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  output: "static",
  fonts,

  // Starlight's MDX pipeline does not enable GFM tables by default.
  markdown: {
    remarkPlugins: [remarkGfm],
  },

  integrations: [
    starlight({
      ...starlightOptions,
      components,
      sidebar,
      head,
    }),
  ],
});
