// What the visitor's answer in Google's consent message allows. Pure
// functions, so the rules can be tested without a browser.
// The four keys are the names Google's consent mode uses.

const ALL = ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"];
const everything = (allowed) => Object.fromEntries(ALL.map((key) => [key, allowed]));

/**
 * From googlefc.getGoogleConsentModeValues(). `status` is
 * googlefc.ConsentModePurposeStatusEnum. Returns null when consent mode is
 * not set up in AdSense (Privacy & messaging); then the TCF answer is used.
 */
export function fromConsentMode(values, status) {
  if (!values || !status) return null;
  const read = {
    ad_storage: values.adStoragePurposeConsentStatus,
    ad_user_data: values.adUserDataPurposeConsentStatus,
    ad_personalization: values.adPersonalizationPurposeConsentStatus,
    analytics_storage: values.analyticsStoragePurposeConsentStatus,
  };
  const known = [status.GRANTED, status.DENIED, status.NOT_APPLICABLE, status.UNKNOWN];
  if (ALL.some((key) => !known.includes(read[key]))) return null;
  // NOT_APPLICABLE: the visitor is where no consent is required.
  // UNKNOWN (no answer yet, or an error) counts as no.
  return Object.fromEntries(ALL.map((key) => [key, read[key] === status.GRANTED || read[key] === status.NOT_APPLICABLE]));
}

const GOOGLE_VENDOR = 755;
const ANSWERED = ["tcloaded", "useractioncomplete"];

/**
 * From the IAB TCF answer (__tcfapi). Returns null until the visitor has
 * answered. The purposes follow Google's own mapping for the three ad keys;
 * analytics has no TCF purpose of its own, so it needs storage (1) and
 * measuring how content performs (8).
 */
export function fromTcf(data) {
  if (!data) return null;
  if (data.gdprApplies === false) return everything(true);
  if (!ANSWERED.includes(data.eventStatus)) return null;
  const purpose = data.purpose?.consents ?? {};
  const google = data.vendor?.consents?.[GOOGLE_VENDOR] === true;
  const yes = (...numbers) => numbers.every((number) => purpose[number] === true);
  return {
    ad_storage: google && yes(1),
    ad_user_data: google && yes(1, 7),
    ad_personalization: google && yes(1, 3, 4),
    analytics_storage: yes(1, 8),
  };
}

/** The answer in the words consent mode wants. */
export function asConsentMode(decision) {
  return Object.fromEntries(ALL.map((key) => [key, decision[key] ? "granted" : "denied"]));
}

export const NOTHING = everything(false);
