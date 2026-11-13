// Starlight head: concatenates the head entry groups in their required order.
import socialMeta from "./social-meta.mjs";
import consent from "./consent.mjs";
import analytics from "./analytics.mjs";
import rss from "./rss.mjs";
import ads from "./ads.mjs";

export const head = [
  ...socialMeta,
  ...consent,
  ...analytics,
  ...rss,
  ...ads,
];
