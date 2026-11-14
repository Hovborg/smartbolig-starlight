// Reads the site's own search index from the Worker's static files (env.ASSETS).
// The index is built into dist/_index/ by scripts/site-index.mjs.

import { createSiteSearch } from "./search.js";

// The binding only looks at the path; any https origin works.
const ASSET_ORIGIN = "https://smartbolig.net";

// One search per binding, so the index description is read once per isolate
// instead of once per question. A new deployment starts new isolates.
const searches = new WeakMap();

/** search(query, locale, limit) over the index files, or undefined when the Worker has no static files. */
export function siteSearchFromAssets(assets) {
  if (!assets || typeof assets.fetch !== "function") return undefined;
  if (!searches.has(assets)) {
    searches.set(
      assets,
      createSiteSearch({
        readJson: async (path) => {
          const response = await assets.fetch(new Request(new URL(path, ASSET_ORIGIN)));
          if (!response.ok) {
            await response.body?.cancel();
            throw new Error("SiteIndexUnavailable");
          }
          return response.json();
        },
      }),
    );
  }
  return searches.get(assets);
}
