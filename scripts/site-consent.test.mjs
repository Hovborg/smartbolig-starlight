// Consent: nothing from Google Analytics or AdSense is fetched before the
// visitor has said yes in Google's consent message. docs/samtykke.md.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { boot } from "../src/lib/consent/boot.mjs";
import { asConsentMode, fromConsentMode, fromTcf, strictest } from "../src/lib/consent/decision.mjs";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
// The enum as Google's script has it on the live site (read 2026-11-14).
const STATUS = {
  CONSENT_MODE_PURPOSE_STATUS_UNKNOWN: 0,
  CONSENT_MODE_PURPOSE_STATUS_GRANTED: 1,
  CONSENT_MODE_PURPOSE_STATUS_DENIED: 2,
  CONSENT_MODE_PURPOSE_STATUS_NOT_APPLICABLE: 3,
  CONSENT_MODE_PURPOSE_STATUS_NOT_CONFIGURED: 4,
};
const [UNKNOWN, GRANTED, DENIED, NOT_APPLICABLE, NOT_CONFIGURED] = [0, 1, 2, 3, 4];
const KEYS = ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"];
const each = (allowed) => Object.fromEntries(KEYS.map((key) => [key, allowed]));
const values = (ad, user, personal, analytics) => ({
  adStoragePurposeConsentStatus: ad,
  adUserDataPurposeConsentStatus: user,
  adPersonalizationPurposeConsentStatus: personal,
  analyticsStoragePurposeConsentStatus: analytics,
});
const all = (status) => values(status, status, status, status);
const tcf = (purposes, { google = true, eventStatus = "useractioncomplete", gdprApplies = true } = {}) => ({
  gdprApplies,
  eventStatus,
  purpose: { consents: Object.fromEntries(purposes.map((number) => [number, true])) },
  vendor: { consents: { 755: google } },
});
const EVERY_PURPOSE = [1, 3, 4, 7, 8];

/** A page with just enough of the browser for the consent code. */
function page({ readyState = "complete", withTcf = true, tcfAtStart } = {}) {
  const scripts = [];
  const frames = [];
  const timers = [];
  const tcfListeners = [];
  const controls = [{ hidden: true, clicks: [], addEventListener(type, run) { this.clicks.push(run); } }];
  const adPlaces = [{ hidden: true }];
  const pressListeners = {};
  const element = (tag) => ({ tag, style: {}, dataset: {} });
  const doc = {
    readyState,
    head: { append: (node) => scripts.push(node) },
    body: { append: (node) => frames.push(node) },
    createElement: element,
    querySelectorAll: (selector) => ({ "[data-cookie-settings]": controls, "[data-ad-slot-place]": adPlaces })[selector] ?? [],
    addEventListener: (type, run) => (pressListeners[type] = run),
  };
  const win = {
    frames: {},
    reloads: 0,
    location: { reload: () => (win.reloads += 1) },
    listeners: {},
    addEventListener: (type, run) => (win.listeners[type] = run),
    requestIdleCallback: (run) => run(),
    setTimeout: (run) => timers.push(run),
  };
  if (withTcf) {
    win.__tcfapi = (command, version, run) => {
      assert.deepEqual([command, version], ["addEventListener", 2]);
      tcfListeners.push(run);
      // Google calls a new listener at once with what it knows (seen on the live site).
      if (tcfAtStart) run(tcfAtStart, true);
    };
  }
  const fire = (key) => win.googlefc.callbackQueue.filter((entry) => entry[key]).forEach((entry) => entry[key]());
  /** What Google's consent mode says now; nothing is told to the page. */
  const setValues = (given) => {
    win.googlefc.ConsentModePurposeStatusEnum = STATUS;
    win.googlefc.getGoogleConsentModeValues = () => given;
  };
  /** Google's script has loaded: its callbacks run once, in Google's order. */
  const ready = (given = all(NOT_CONFIGURED)) => {
    setValues(given);
    for (const key of ["CONSENT_API_READY", "CONSENT_MODE_DATA_READY", "CONSENT_DATA_READY"]) fire(key);
  };
  const tcfEvent = (data, success = true) => tcfListeners.forEach((run) => run(data, success));
  const runTimers = () => timers.splice(0).forEach((run) => run());
  const fetched = (part) => scripts.filter((script) => script.src.includes(part)).length;
  const sent = (command) => [...win.dataLayer].map((entry) => [...entry]).filter((entry) => entry[0] === command);
  return { win, doc, scripts, frames, controls, adPlaces, pressListeners, tcfListeners, fire, setValues, ready, tcfEvent, runTimers, fetched, sent };
}

test("the shop-link report and the ad places wait for their own yes", () => {
  const none = page({ withTcf: false });
  boot(none.win, none.doc);
  none.ready(all(DENIED));
  assert.deepEqual(Object.keys(none.pressListeners), []);
  assert.equal(none.adPlaces[0].hidden, true);

  const statistics = page({ withTcf: false });
  boot(statistics.win, statistics.doc);
  statistics.ready(values(DENIED, DENIED, DENIED, GRANTED));
  assert.deepEqual(Object.keys(statistics.pressListeners).sort(), ["auxclick", "click"]);
  assert.equal(statistics.adPlaces[0].hidden, true);
  assert.equal(statistics.win.adsbygoogle, undefined);

  const ads = page({ withTcf: false });
  boot(ads.win, ads.doc);
  ads.ready(values(GRANTED, GRANTED, GRANTED, DENIED));
  assert.deepEqual(Object.keys(ads.pressListeners), []);
  assert.equal(ads.adPlaces[0].hidden, false);
  assert.equal(ads.win.adsbygoogle.length, 1);
});

test("an answer from Google's consent mode becomes yes or no for each purpose", () => {
  assert.deepEqual(fromConsentMode(all(GRANTED), STATUS), each(true));
  assert.deepEqual(fromConsentMode(all(DENIED), STATUS), each(false));
  assert.deepEqual(fromConsentMode(values(DENIED, DENIED, DENIED, GRANTED), STATUS), { ...each(false), analytics_storage: true });
  assert.deepEqual(fromConsentMode(all(NOT_APPLICABLE), STATUS), each(true), "Google does not ask where the visitor is");
  assert.deepEqual(fromConsentMode(all(UNKNOWN), STATUS), each(false), "no answer yet counts as no");
  // The names without the prefix, as Google's reference writes them.
  const short = { UNKNOWN: 0, GRANTED: 1, DENIED: 2, NOT_APPLICABLE: 3, NOT_CONFIGURED: 4 };
  assert.deepEqual(fromConsentMode(all(GRANTED), short), each(true));
});

test("consent mode gives no answer when it is not set up or not understood", () => {
  assert.equal(fromConsentMode(all(NOT_CONFIGURED), STATUS), null);
  assert.equal(fromConsentMode(values(GRANTED, GRANTED, GRANTED, NOT_CONFIGURED), STATUS), null);
  assert.equal(fromConsentMode(undefined, STATUS), null);
  assert.equal(fromConsentMode(all(GRANTED), undefined), null);
  assert.equal(fromConsentMode({}, STATUS), null);
  assert.equal(fromConsentMode({}, {}), null, "missing values and a missing enum must not look alike");
  assert.equal(fromConsentMode(all(undefined), {}), null);
  assert.equal(fromConsentMode(all("1"), STATUS), null, "a value must be a number");
  assert.equal(fromConsentMode(all(9), STATUS), null, "a number the enum does not have");
  assert.equal(fromConsentMode(all("GRANTED"), { UNKNOWN: "UNKNOWN", GRANTED: "GRANTED", DENIED: "DENIED", NOT_APPLICABLE: "NOT_APPLICABLE" }), null);
  assert.equal(fromConsentMode(all(1), { GRANTED: 1, DENIED: 2 }), null, "an enum without all four names");
});

test("a TCF answer needs the visitor's choice, storage consent and Google as vendor", () => {
  assert.equal(fromTcf(tcf(EVERY_PURPOSE, { eventStatus: "cmpuishown" })), null, "the message is still open");
  assert.equal(fromTcf(undefined), null);
  assert.equal(fromTcf({}), null);
  assert.deepEqual(fromTcf({ gdprApplies: false }), each(true));
  assert.equal(fromTcf({ gdprApplies: undefined }), null, "only Google's own no means that it does not ask");
  assert.deepEqual(fromTcf({ eventStatus: "tcloaded" }), each(false), "an answer without purposes is a no");
  assert.deepEqual(fromTcf(tcf(EVERY_PURPOSE)), each(true));
  assert.deepEqual(fromTcf(tcf([])), each(false));
  assert.deepEqual(fromTcf(tcf([1, 8], { google: false })), { ...each(false), analytics_storage: true });
  assert.deepEqual(fromTcf(tcf(EVERY_PURPOSE, { google: false })), { ...each(false), analytics_storage: true }, "no ads without Google as vendor");
  assert.deepEqual(fromTcf(tcf([3, 4, 7, 8])), each(false), "nothing without storage (purpose 1)");
  assert.deepEqual(fromTcf(tcf([1, 3, 4, 8])), { ...each(true), ad_user_data: false }, "purpose 7");
  assert.deepEqual(fromTcf(tcf([1, 3, 7, 8])), { ...each(true), ad_personalization: false }, "purpose 4");
  assert.deepEqual(fromTcf(tcf([1, 4, 7, 8])), { ...each(true), ad_personalization: false }, "purpose 3");
  assert.deepEqual(fromTcf(tcf([1, 3, 4, 7])), { ...each(true), analytics_storage: false }, "purpose 8");
  assert.equal(fromTcf(tcf([1, 7, 8], { eventStatus: "tcloaded" })).ad_personalization, false);
  assert.deepEqual(asConsentMode({ ad_storage: true, ad_user_data: false, ad_personalization: false, analytics_storage: true }), {
    ad_storage: "granted", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "granted",
  });
});

test("where both sources answer, a purpose needs a yes from both", () => {
  assert.equal(strictest(null, null), null);
  assert.deepEqual(strictest(each(true), null), each(true));
  assert.deepEqual(strictest(null, each(false)), each(false));
  assert.deepEqual(strictest(each(true), { ...each(true), ad_storage: false }), { ...each(true), ad_storage: false });
  assert.deepEqual(strictest({ ...each(false), analytics_storage: true }, each(true)), { ...each(false), analytics_storage: true });
});

test("before the visitor answers, only Google's consent message is fetched", () => {
  const { win, doc, scripts, frames, sent } = page();
  boot(win, doc);

  assert.deepEqual(scripts.map((script) => script.src), ["https://fundingchoicesmessages.google.com/i/pub-1259715054941263?ers=1"]);
  assert.deepEqual(frames.map((frame) => frame.name), ["googlefcPresent"], "Google's signal that the message is on the page");
  const [[, kind, defaults]] = sent("consent");
  assert.equal(kind, "default");
  for (const key of KEYS) assert.equal(defaults[key], "denied");
  assert.equal(sent("config").length, 0);
  assert.equal(sent("js").length, 0);
});

test("the consent message waits for the page to load", () => {
  const { win, doc, scripts } = page({ readyState: "loading" });
  boot(win, doc);
  assert.equal(scripts.length, 0);
  win.listeners.load();
  assert.equal(scripts.length, 1);
});

test("a yes fetches Analytics and AdSense once, a no fetches neither", () => {
  const yes = page();
  boot(yes.win, yes.doc);
  yes.ready(all(GRANTED));
  yes.fire("CONSENT_MODE_DATA_READY");
  yes.tcfEvent(tcf(EVERY_PURPOSE, { eventStatus: "tcloaded" }));
  assert.equal(yes.fetched("googletagmanager.com/gtag/js?id=G-H52D2TJGV0"), 1);
  assert.equal(yes.fetched("adsbygoogle.js?client=ca-pub-1259715054941263"), 1);
  assert.equal(yes.sent("config").length, 1);
  assert.equal(yes.sent("consent").at(-1)[2].analytics_storage, "granted");
  // The yes is told to Google before its scripts are asked for anything.
  const order = [...yes.win.dataLayer].map((entry) => [...entry].slice(0, 2).join(" "));
  assert.ok(order.indexOf("consent update") > -1 && order.indexOf("consent update") < order.findIndex((entry) => entry.startsWith("js")));
  assert.ok(order.findIndex((entry) => entry.startsWith("js")) < order.findIndex((entry) => entry.startsWith("config")));
  // gtag.js only understands the `arguments` object itself.
  assert.equal(Object.prototype.toString.call(yes.win.dataLayer[0]), "[object Arguments]");

  const no = page({ tcfAtStart: tcf([], { eventStatus: "tcloaded" }) });
  boot(no.win, no.doc);
  no.ready(all(DENIED));
  assert.equal(no.scripts.length, 1, "only the consent message");
  assert.equal(no.sent("config").length, 0);
  assert.equal(no.sent("consent").at(-1)[1], "update");

  const statistics = page({ tcfAtStart: tcf([1, 8], { google: false, eventStatus: "tcloaded" }) });
  boot(statistics.win, statistics.doc);
  statistics.ready(values(DENIED, DENIED, DENIED, GRANTED));
  assert.equal(statistics.fetched("gtag/js"), 1);
  assert.equal(statistics.fetched("adsbygoogle"), 0);
});

test("a visitor who withdraws a yes gets the page again without the scripts", () => {
  // Google's callbacks run once; the change arrives as a TCF event only.
  const { win, doc, ready, setValues, tcfEvent, fetched } = page({ tcfAtStart: tcf(EVERY_PURPOSE, { eventStatus: "tcloaded" }) });
  boot(win, doc);
  ready(all(GRANTED));
  assert.equal(fetched("gtag/js"), 1);
  assert.equal(win.reloads, 0);
  setValues(all(DENIED));
  tcfEvent(tcf([]));
  assert.equal(win.reloads, 1);

  // Google's consent mode values have not caught up: the TCF no decides.
  const stale = page({ tcfAtStart: tcf(EVERY_PURPOSE, { eventStatus: "tcloaded" }) });
  boot(stale.win, stale.doc);
  stale.ready(all(GRANTED));
  stale.tcfEvent(tcf([]));
  assert.equal(stale.win.reloads, 1);

  // Statistics stay allowed, ads are withdrawn.
  const adsOnly = page({ tcfAtStart: tcf(EVERY_PURPOSE, { eventStatus: "tcloaded" }) });
  boot(adsOnly.win, adsOnly.doc);
  adsOnly.ready(all(GRANTED));
  adsOnly.setValues(values(DENIED, DENIED, DENIED, GRANTED));
  adsOnly.tcfEvent(tcf([1, 8], { google: false }));
  assert.equal(adsOnly.win.reloads, 1);

  const never = page();
  boot(never.win, never.doc);
  never.ready(all(DENIED));
  never.tcfEvent(tcf([]));
  assert.equal(never.win.reloads, 0, "nothing was fetched, so there is nothing to take off the page");
});

test("without consent mode in AdSense the TCF answer decides", () => {
  const { win, doc, ready, tcfEvent, fetched, tcfListeners } = page();
  boot(win, doc);
  ready(all(NOT_CONFIGURED));
  assert.equal(tcfListeners.length, 1, "one listener, however many of Google's callbacks ran");
  assert.equal(fetched("gtag/js"), 0);
  tcfEvent(tcf(EVERY_PURPOSE, { eventStatus: "cmpuishown" }));
  assert.equal(fetched("gtag/js"), 0);
  tcfEvent(tcf(EVERY_PURPOSE), false);
  assert.equal(fetched("gtag/js"), 0, "an event Google marks as failed is not an answer");
  tcfEvent(tcf([1, 8], { google: false }));
  assert.equal(fetched("gtag/js"), 1);
  assert.equal(fetched("adsbygoogle"), 0);

  // The listener is also set up when only CONSENT_DATA_READY runs.
  const late = page();
  boot(late.win, late.doc);
  late.setValues(all(NOT_CONFIGURED));
  late.fire("CONSENT_DATA_READY");
  late.tcfEvent(tcf(EVERY_PURPOSE));
  assert.equal(late.fetched("adsbygoogle"), 1);
});

test("a yes is read again a moment later, when consent mode has caught up", () => {
  const { win, doc, ready, setValues, tcfEvent, runTimers, fetched } = page();
  boot(win, doc);
  ready(all(UNKNOWN));
  tcfEvent(tcf(EVERY_PURPOSE));
  assert.equal(fetched("gtag/js"), 0, "consent mode still says that there is no answer");
  setValues(all(GRANTED));
  runTimers();
  assert.equal(fetched("gtag/js"), 1);
  assert.equal(fetched("adsbygoogle"), 1);
  assert.equal(win.reloads, 0);
});

test("where no message is published in AdSense, nothing is fetched and nothing can be reopened", () => {
  const { win, doc, scripts, controls, ready, tcfEvent } = page();
  boot(win, doc);
  ready(all(NOT_CONFIGURED));
  tcfEvent(null, false);
  assert.equal(scripts.length, 1, "only the consent message");
  assert.equal(controls[0].hidden, true);

  // What Google's script really does on the live site without a message
  // (read 2026-11-14): the listener is called at once, marked as a success,
  // with gdprApplies true and no eventStatus.
  const live = page({ tcfAtStart: { gdprApplies: true, cmpStatus: "loaded" } });
  boot(live.win, live.doc);
  live.ready(all(NOT_CONFIGURED));
  assert.equal(live.scripts.length, 1, "only the consent message");
  assert.equal(live.controls[0].hidden, true, "nobody was asked, so there is nothing to reopen");
  // Consent mode alone is not a yes where the GDPR applies and TCF has no answer.
  const modeOnly = page({ tcfAtStart: { gdprApplies: true, cmpStatus: "loaded" } });
  boot(modeOnly.win, modeOnly.doc);
  modeOnly.ready(all(GRANTED));
  assert.equal(modeOnly.scripts.length, 1);

  const noTcf = page({ withTcf: false });
  boot(noTcf.win, noTcf.doc);
  noTcf.ready(all(NOT_CONFIGURED));
  assert.equal(noTcf.scripts.length, 1);
});

test("a purpose needs a yes from both, whichever of the two Google tells last", () => {
  // Google's order on the live site: the TCF listener first, then the queue callbacks.
  const tcfNo = page({ tcfAtStart: tcf([], { eventStatus: "tcloaded" }) });
  boot(tcfNo.win, tcfNo.doc);
  tcfNo.ready(all(GRANTED));
  assert.equal(tcfNo.scripts.length, 1, "consent mode says yes last, the TCF no still counts");
  assert.equal(tcfNo.win.reloads, 0);

  const modeNo = page({ tcfAtStart: tcf(EVERY_PURPOSE, { eventStatus: "tcloaded" }) });
  boot(modeNo.win, modeNo.doc);
  modeNo.ready(all(DENIED));
  assert.equal(modeNo.scripts.length, 1);
  assert.equal(modeNo.win.reloads, 0, "the two disagreeing must not load the page again and again");

  const bothYes = page({ tcfAtStart: tcf(EVERY_PURPOSE, { eventStatus: "tcloaded" }) });
  boot(bothYes.win, bothYes.doc);
  bothYes.ready(all(GRANTED));
  assert.equal(bothYes.fetched("gtag/js"), 1);
  assert.equal(bothYes.fetched("adsbygoogle"), 1);
  assert.equal(bothYes.win.reloads, 0);
  assert.equal(bothYes.controls[0].hidden, false, "an answer from an earlier visit can be changed");

  // The message is open and unanswered: nothing yet, whatever consent mode says.
  const open = page({ tcfAtStart: tcf([], { eventStatus: "cmpuishown" }) });
  boot(open.win, open.doc);
  open.ready(all(GRANTED));
  assert.equal(open.scripts.length, 1);
  assert.equal(open.controls[0].hidden, false, "Google is asking");
  open.tcfEvent(tcf(EVERY_PURPOSE));
  assert.equal(open.fetched("gtag/js"), 1);

  // Once Google has said that the GDPR applies, a later event cannot turn a no into a yes.
  const flip = page({ tcfAtStart: tcf([], { eventStatus: "tcloaded" }) });
  boot(flip.win, flip.doc);
  flip.ready(all(NOT_CONFIGURED));
  flip.tcfEvent({ gdprApplies: false, eventStatus: "tcloaded" });
  assert.equal(flip.scripts.length, 1);
});

test("a TCF yes waits for Google's own values, so no script is fetched and then taken back", () => {
  const { win, doc, fire, setValues, fetched } = page({ tcfAtStart: tcf(EVERY_PURPOSE, { eventStatus: "tcloaded" }) });
  boot(win, doc);
  fire("CONSENT_API_READY");
  assert.equal(fetched("gtag/js"), 0, "the listener has the yes, but Google's consent mode values cannot be read yet");
  assert.equal(fetched("adsbygoogle"), 0);
  setValues(values(GRANTED, GRANTED, GRANTED, DENIED));
  fire("CONSENT_MODE_DATA_READY");
  assert.equal(fetched("gtag/js"), 0, "consent mode says no to statistics");
  assert.equal(fetched("adsbygoogle"), 1);
  assert.equal(win.reloads, 0);
});

test("consent mode decides alone only where the page has no TCF API", () => {
  const silent = page();
  boot(silent.win, silent.doc);
  silent.ready(all(GRANTED));
  assert.equal(silent.scripts.length, 1, "there is a TCF API, so its word comes first");
  silent.tcfEvent(tcf(EVERY_PURPOSE, { eventStatus: "tcloaded" }));
  assert.equal(silent.fetched("gtag/js"), 1);

  const noTcf = page({ withTcf: false });
  boot(noTcf.win, noTcf.doc);
  noTcf.ready(all(NOT_APPLICABLE));
  assert.equal(noTcf.fetched("gtag/js"), 1, "Google does not ask here");
  assert.equal(noTcf.fetched("adsbygoogle"), 1);
  assert.equal(noTcf.controls[0].hidden, true);
});

test("the cookie settings control appears where Google asks the visitor", () => {
  const { win, doc, controls, ready, tcfEvent } = page();
  boot(win, doc);
  ready();
  assert.equal(controls[0].hidden, true);
  tcfEvent({ gdprApplies: true, eventStatus: "" });
  assert.equal(controls[0].hidden, true, "a status that is not one of the three is not a question");
  tcfEvent(tcf([], { eventStatus: "cmpuishown" }));
  assert.equal(controls[0].hidden, false, "shown as soon as Google asks");
  tcfEvent(tcf([]));
  assert.equal(controls[0].hidden, false);
  assert.equal(controls[0].clicks.length, 1, "one click handler, however many events");
  let reopened = 0;
  win.googlefc.showRevocationMessage = () => (reopened += 1);
  controls[0].clicks[0]();
  assert.equal(reopened, 1);

  const elsewhere = page();
  boot(elsewhere.win, elsewhere.doc);
  elsewhere.ready();
  elsewhere.tcfEvent({ gdprApplies: false, eventStatus: "tcloaded" });
  assert.equal(elsewhere.controls[0].hidden, true, "there is no answer to change where Google does not ask");
  assert.equal(elsewhere.fetched("gtag/js"), 1);
});

test("no page asks Google for anything in its own markup", async () => {
  const headFiles = (await readdir(new URL("../config/head/", import.meta.url))).filter((name) => name.endsWith(".mjs"));
  const [head, footer, footerLinks, ...headParts] = await Promise.all([
    read("src/components/Head.astro"),
    read("src/components/Footer.astro"),
    read("src/lib/site-footer.mjs"),
    ...headFiles.map((name) => read(`config/head/${name}`)),
  ]);
  assert.ok(headFiles.includes("index.mjs"));
  assert.doesNotMatch(headParts.join("\n"), /import \w+ from "\.\/(consent|analytics|ads)\.mjs"/);
  for (const source of [head, footer, footerLinks, ...headParts]) {
    assert.doesNotMatch(source, /googletagmanager|googlesyndication|google-analytics|doubleclick|fundingchoices|document\.cookie/);
  }
  assert.match(head, /import \{ boot \} from "\.\.\/lib\/consent\/boot\.mjs";/);
  assert.match(footer, /<button type="button" data-cookie-settings hidden>/);
  assert.match(footerLinks, /"\/juridisk\/cookiepolitik\/"/);
});

test("comments are fetched from giscus only when the visitor asks", async () => {
  const [component, library] = await Promise.all([read("src/components/Giscus.astro"), read("src/lib/comments.mjs")]);
  assert.doesNotMatch(component, /giscus\.app\/client\.js|createElement\("script"\)|rel="(preconnect|dns-prefetch|preload)"/);
  assert.match(component, /addEventListener\("click"/);
  assert.match(library, /export function loadComments/);
  // The only call is inside the click handler.
  assert.equal(component.match(/loadComments\(/g).length, 1);
  assert.match(component, /addEventListener\("click", \(\) => \{[\s\S]*?loadComments\(wrapper, \{ onReady: shown, onError: failed \}\);\s*\}\);/);
});
