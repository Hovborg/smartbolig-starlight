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
import { rehypePlainHeadings } from "./config/markdown/plain-headings.mjs";
import { remarkPlainLabels } from "./config/markdown/plain-labels.mjs";
import { rehypeTableScroll } from "./config/markdown/table-scroll.mjs";
import { rehypeLeadImage } from "./config/markdown/lead-image.mjs";

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  output: "static",
  fonts,

  // Starlight's MDX pipeline does not enable GFM tables by default.
  // Headings, cards and tabs are shown without a leading emoji, and tables
  // scroll sideways in a wrapper of their own, and the first picture of a guide
  // loads first (config/markdown/).
  markdown: {
    remarkPlugins: [remarkGfm, remarkPlainLabels],
    rehypePlugins: [rehypePlainHeadings, rehypeTableScroll, rehypeLeadImage],
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
