// Google's consent message (AdSense -> Privacy & messaging), loaded on its
// own instead of through the AdSense script, so it can ask before anything
// else from Google is fetched. API: developers.google.com/funding-choices/fc-api-docs
import { fromConsentMode, fromTcf, strictest } from "./decision.mjs";

const MESSAGE_URL = "https://fundingchoicesmessages.google.com/i/";
// Google's consent mode values can be a moment behind the TCF answer.
const SETTLE_MS = 1000;
// The TCF event statuses: the message is open, or the visitor has answered (now or on an earlier visit).
const ASKED = ["cmpuishown", "tcloaded", "useractioncomplete"];

/** Google's own signal to its other scripts that the message is on the page. */
function signalPresent(win, doc) {
  if (win.frames.googlefcPresent) return;
  const frame = doc.createElement("iframe");
  frame.name = "googlefcPresent";
  frame.hidden = true;
  frame.style.display = "none";
  doc.body.append(frame);
}

/**
 * onAsked: Google asks the visitor here, so the answer can be changed (the
 * "cookie settings" control has something to open). May be called again.
 * onAnswer(decision): called with every answer, also when it changes later.
 * Where the GDPR applies and no message is published in AdSense for the
 * site, neither is called.
 */
export function loadMessage({ win, doc, publisher, onAsked, onAnswer }) {
  const fc = (win.googlefc = win.googlefc || {});
  fc.callbackQueue = fc.callbackQueue || [];

  // Google has said that its consent values can be read. Before that, a TCF
  // yes alone could fetch a script that consent mode says no to a moment later.
  let ready = false;
  // What the TCF listener said last. It is kept because Google runs the queue
  // callbacks after the listener (seen on the live site), and a purpose needs
  // a yes from both, whichever of the two speaks last.
  let lastTcf = null;
  // Once Google has said that the GDPR applies here, a later event cannot take it back.
  let gdpr = false;
  const read = () => {
    if (!ready) return;
    // Where the page has a TCF API, its word comes first. Consent mode decides
    // alone only where there is none.
    if (lastTcf === null && typeof win.__tcfapi === "function") return;
    const tcf = fromTcf(lastTcf);
    // Where the GDPR applies, the visitor's own answer is the TCF one.
    if (gdpr && !tcf) return;
    const decision = strictest(fromConsentMode(fc.getGoogleConsentModeValues?.(), fc.ConsentModePurposeStatusEnum), tcf);
    if (decision) onAnswer(decision);
  };
  const valuesReady = () => {
    ready = true;
    read();
  };

  // The TCF listener is called now and every time the visitor answers or
  // changes the answer. The callbacks in the queue are only promised once.
  let listening = false;
  const listen = () => {
    if (listening || typeof win.__tcfapi !== "function") return;
    listening = true;
    win.__tcfapi("addEventListener", 2, (data, success) => {
      if (!success || !data) return;
      if (data.gdprApplies === true) gdpr = true;
      else if (gdpr) return;
      // Without a published message Google still calls, with gdprApplies true
      // but no eventStatus (seen on the live site): then nobody was asked.
      if (gdpr && ASKED.includes(data.eventStatus)) onAsked();
      lastTcf = data;
      read();
      if (data.eventStatus === "useractioncomplete") win.setTimeout(read, SETTLE_MS);
    });
  };

  fc.callbackQueue.push({ CONSENT_API_READY: listen });
  fc.callbackQueue.push({ CONSENT_MODE_DATA_READY: valuesReady });
  fc.callbackQueue.push({
    CONSENT_DATA_READY: () => {
      listen();
      valuesReady();
    },
  });

  const script = doc.createElement("script");
  script.async = true;
  script.src = `${MESSAGE_URL}${publisher}?ers=1`;
  doc.head.append(script);
  signalPresent(win, doc);
}

/** Opens the message again, so the visitor can change the answer. */
export function reopenMessage(win) {
  win.googlefc?.showRevocationMessage?.();
}
