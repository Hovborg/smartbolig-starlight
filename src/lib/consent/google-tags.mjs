// Google Analytics and AdSense. Neither script is fetched until the visitor
// has said yes (consent mode "basic"): before that, nothing is sent to them.
import { asConsentMode, NOTHING } from "./decision.mjs";

const ANALYTICS_URL = "https://www.googletagmanager.com/gtag/js?id=";
const ADS_URL = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-";

export function createTags({ win, doc, analyticsId, adsPublisher }) {
  const loaded = { analytics: false, ads: false };
  win.dataLayer = win.dataLayer || [];
  // gtag.js reads the `arguments` object itself, so this cannot be an arrow
  // function or push an array.
  win.gtag = function gtag() {
    win.dataLayer.push(arguments);
  };

  const add = (src, { crossOrigin, onError } = {}) => {
    const script = doc.createElement("script");
    script.async = true;
    script.src = src;
    if (crossOrigin) script.crossOrigin = crossOrigin;
    if (onError) script.addEventListener("error", onError, { once: true });
    doc.head.append(script);
  };

  return {
    /** Everything is refused until the visitor answers. */
    start() {
      win.gtag("consent", "default", { ...asConsentMode(NOTHING), security_storage: "granted" });
      win.gtag("set", "ads_data_redaction", true);
    },
    update(decision) {
      win.gtag("consent", "update", asConsentMode(decision));
    },
    /** Both return true the first time, when the script is put on the page. */
    loadAnalytics() {
      if (loaded.analytics) return false;
      loaded.analytics = true;
      win.gtag("js", new Date());
      win.gtag("config", analyticsId);
      add(`${ANALYTICS_URL}${analyticsId}`);
      return true;
    },
    /** onError: the script could not be fetched (a blocker, no network). */
    loadAds(onError) {
      if (loaded.ads) return false;
      loaded.ads = true;
      add(`${ADS_URL}${adsPublisher}`, { crossOrigin: "anonymous", onError });
      return true;
    },
    loaded: () => ({ ...loaded }),
  };
}
