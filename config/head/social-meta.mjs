// Head: Open Graph and Twitter card meta tags.
export default [
  // Open Graph / Social sharing
  {
    tag: "meta",
    attrs: {
      property: "og:type",
      content: "website",
    },
  },
  {
    tag: "meta",
    attrs: {
      property: "og:site_name",
      content: "SmartBolig.net",
    },
  },
  {
    tag: "meta",
    attrs: {
      property: "og:image",
      content: "https://smartbolig.net/images/og-image.png",
    },
  },
  {
    tag: "meta",
    attrs: {
      property: "og:image:width",
      content: "1200",
    },
  },
  {
    tag: "meta",
    attrs: {
      property: "og:image:height",
      content: "630",
    },
  },
  {
    tag: "meta",
    attrs: {
      name: "twitter:card",
      content: "summary_large_image",
    },
  },
  {
    tag: "meta",
    attrs: {
      name: "twitter:image",
      content: "https://smartbolig.net/images/og-image.png",
    },
  },
];
