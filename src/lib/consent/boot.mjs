// Consent on every page: ask with Google's message, then fetch Google
// Analytics and AdSense only if the visitor said yes. docs/samtykke.md.
import { showAdSlots } from "../ad-slots.mjs";
import { watchAffiliateClicks } from "../affiliate-clicks.mjs";
import { createTags } from "./google-tags.mjs";
import { ADS_PUBLISHER, ANALYTICS_ID } from "./ids.mjs";
import { loadMessage, reopenMessage } from "./message.mjs";

/** The "cookie settings" controls are hidden until Google asks the visitor here. */
function showSettingsControls(win, doc) {
  for (const control of doc.querySelectorAll("[data-cookie-settings]")) {
    if (!control.hidden) continue;
    control.hidden = false;
    control.addEventListener("click", () => reopenMessage(win));
  }
}

export function boot(win = window, doc = document) {
  const tags = createTags({ win, doc, analyticsId: ANALYTICS_ID, adsPublisher: ADS_PUBLISHER });
  tags.start();

  const onAnswer = (decision) => {
    tags.update(decision);
    const loaded = tags.loaded();
    // A script that is already on the page cannot be taken off it. A visitor
    // who withdraws a yes gets the page again, without the script.
    if ((loaded.analytics && !decision.analytics_storage) || (loaded.ads && !decision.ad_storage)) {
      win.location.reload();
      return;
    }
    if (decision.analytics_storage && tags.loadAnalytics()) watchAffiliateClicks(win, doc);
    if (decision.ad_storage && tags.loadAds()) showAdSlots(win, doc);
  };

  // After the page has loaded: the message is a large script, and the page's
  // own content comes first.
  const start = () => loadMessage({ win, doc, publisher: ADS_PUBLISHER, onAsked: () => showSettingsControls(win, doc), onAnswer });
  const whenIdle = () => (win.requestIdleCallback ? win.requestIdleCallback(start, { timeout: 2000 }) : win.setTimeout(start, 200));
  if (doc.readyState === "complete") whenIdle();
  else win.addEventListener("load", whenIdle, { once: true });
}
