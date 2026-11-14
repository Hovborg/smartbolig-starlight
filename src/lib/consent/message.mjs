// Google's consent message (AdSense -> Privacy & messaging), loaded on its
// own instead of through the AdSense script, so it can ask before anything
// else from Google is fetched. API: developers.google.com/funding-choices/fc-api-docs
import { fromConsentMode, fromTcf } from "./decision.mjs";

const MESSAGE_URL = "https://fundingchoicesmessages.google.com/i/";

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
 * onReady: the message's API can be used (the "cookie settings" link works).
 * onAnswer(decision): called with every answer, also when it changes later.
 */
export function loadMessage({ win, doc, publisher, onReady, onAnswer }) {
  const fc = (win.googlefc = win.googlefc || {});
  fc.callbackQueue = fc.callbackQueue || [];

  let listening = false;
  const read = () => {
    const decision = fromConsentMode(fc.getGoogleConsentModeValues?.(), fc.ConsentModePurposeStatusEnum);
    if (decision) return onAnswer(decision);
    // Consent mode is not switched on in AdSense: read the TCF answer instead.
    if (listening || typeof win.__tcfapi !== "function") return;
    listening = true;
    win.__tcfapi("addEventListener", 2, (data, success) => {
      const answer = success ? fromTcf(data) : null;
      if (answer) onAnswer(answer);
    });
  };

  fc.callbackQueue.push({ CONSENT_API_READY: onReady });
  fc.callbackQueue.push({ CONSENT_MODE_DATA_READY: read });
  fc.callbackQueue.push({ CONSENT_DATA_READY: read });

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
