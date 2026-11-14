// Google's consent message (AdSense -> Privacy & messaging), loaded on its
// own instead of through the AdSense script, so it can ask before anything
// else from Google is fetched. API: developers.google.com/funding-choices/fc-api-docs
import { fromConsentMode, fromTcf, strictest } from "./decision.mjs";

const MESSAGE_URL = "https://fundingchoicesmessages.google.com/i/";
// Google's consent mode values can be a moment behind the TCF answer.
const SETTLE_MS = 1000;

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
 * Nothing is called when no message is published in AdSense for the site.
 */
export function loadMessage({ win, doc, publisher, onAsked, onAnswer }) {
  const fc = (win.googlefc = win.googlefc || {});
  fc.callbackQueue = fc.callbackQueue || [];

  const read = (tcData) => {
    const decision = strictest(fromConsentMode(fc.getGoogleConsentModeValues?.(), fc.ConsentModePurposeStatusEnum), fromTcf(tcData));
    if (decision) onAnswer(decision);
  };

  // The TCF listener is called now and every time the visitor answers or
  // changes the answer. The callbacks in the queue are only promised once.
  let listening = false;
  const listen = () => {
    if (listening || typeof win.__tcfapi !== "function") return;
    listening = true;
    win.__tcfapi("addEventListener", 2, (data, success) => {
      if (!success || !data) return;
      if (data.gdprApplies === true) onAsked();
      read(data);
      if (data.eventStatus === "useractioncomplete") win.setTimeout(() => read(data), SETTLE_MS);
    });
  };

  fc.callbackQueue.push({ CONSENT_API_READY: listen });
  fc.callbackQueue.push({ CONSENT_MODE_DATA_READY: () => read(null) });
  fc.callbackQueue.push({
    CONSENT_DATA_READY: () => {
      listen();
      read(null);
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
