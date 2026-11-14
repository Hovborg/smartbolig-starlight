// Starlight head: concatenates the head entry groups in their required order.
import icons from "./icons.mjs";
import socialMeta from "./social-meta.mjs";
import rss from "./rss.mjs";

// Google Analytics and AdSense are not here: they are fetched only after the
// visitor's consent (src/lib/consent/, docs/samtykke.md).
export const head = [
  ...icons,
  ...socialMeta,
  ...rss,
];
