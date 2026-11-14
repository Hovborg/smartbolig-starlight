// Consent: nothing from Google Analytics or AdSense is fetched before the
// visitor has said yes in Google's consent message. docs/samtykke.md.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { boot } from "../src/lib/consent/boot.mjs";
import { asConsentMode, fromConsentMode, fromTcf } from "../src/lib/consent/decision.mjs";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const STATUS = { UNKNOWN: 0, GRANTED: 1, DENIED: 2, NOT_APPLICABLE: 3, NOT_CONFIGURED: 4 };
const values = (ad, user, personal, analytics) => ({
  adStoragePurposeConsentStatus: ad,
  adUserDataPurposeConsentStatus: user,
  adPersonalizationPurposeConsentStatus: personal,
  analyticsStoragePurposeConsentStatus: analytics,
});
const all = (status) => values(status, status, status, status);

/** A page with just enough of the browser for the consent code. */
function page({ readyState = "complete" } = {}) {
  const scripts = [];
  const controls = [{ hidden: true, clicks: [], addEventListener(type, run) { this.clicks.push(run); } }];
  const element = (tag) => ({ tag, style: {}, dataset: {} });
  const doc = {
    readyState,
    head: { append: (node) => scripts.push(node) },
    body: { append() {} },
    createElement: element,
    querySelectorAll: (selector) => (selector === "[data-cookie-settings]" ? controls : []),
  };
  const win = {
    frames: {},
    reloads: 0,
    location: { reload: () => (win.reloads += 1) },
    listeners: {},
    addEventListener: (type, run) => (win.listeners[type] = run),
    requestIdleCallback: (run) => run(),
  };
  const fire = (key) => win.googlefc.callbackQueue.filter((entry) => entry[key]).forEach((entry) => entry[key]());
  const answer = (given) => {
    win.googlefc.ConsentModePurposeStatusEnum = STATUS;
    win.googlefc.getGoogleConsentModeValues = () => given;
    fire("CONSENT_MODE_DATA_READY");
  };
  const fetched = (part) => scripts.filter((script) => script.src.includes(part)).length;
  const sent = (command) => [...win.dataLayer].map((entry) => [...entry]).filter((entry) => entry[0] === command);
  return { win, doc, scripts, controls, fire, answer, fetched, sent };
}

test("an answer from Google's consent mode becomes yes or no for each purpose", () => {
  assert.deepEqual(fromConsentMode(all(STATUS.GRANTED), STATUS), { ad_storage: true, ad_user_data: true, ad_personalization: true, analytics_storage: true });
  assert.deepEqual(fromConsentMode(all(STATUS.DENIED), STATUS), { ad_storage: false, ad_user_data: false, ad_personalization: false, analytics_storage: false });
  assert.deepEqual(
    fromConsentMode(values(STATUS.DENIED, STATUS.DENIED, STATUS.DENIED, STATUS.GRANTED), STATUS),
    { ad_storage: false, ad_user_data: false, ad_personalization: false, analytics_storage: true },
  );
  assert.equal(fromConsentMode(all(STATUS.NOT_APPLICABLE), STATUS).analytics_storage, true, "no consent is required where the visitor is");
  assert.equal(fromConsentMode(all(STATUS.UNKNOWN), STATUS).analytics_storage, false, "no answer yet counts as no");
});

test("without consent mode in AdSense there is no answer to read from it", () => {
  assert.equal(fromConsentMode(all(STATUS.NOT_CONFIGURED), STATUS), null);
  assert.equal(fromConsentMode(values(STATUS.GRANTED, STATUS.GRANTED, STATUS.GRANTED, STATUS.NOT_CONFIGURED), STATUS), null);
  assert.equal(fromConsentMode(undefined, STATUS), null);
  assert.equal(fromConsentMode(all(STATUS.GRANTED), undefined), null);
  assert.equal(fromConsentMode({}, STATUS), null);
});

test("a TCF answer needs the visitor's choice, storage consent and Google as vendor", () => {
  const tcf = (purposes, google = true, eventStatus = "useractioncomplete") => ({
    gdprApplies: true,
    eventStatus,
    purpose: { consents: Object.fromEntries(purposes.map((number) => [number, true])) },
    vendor: { consents: { 755: google } },
  });
  assert.equal(fromTcf(tcf([1, 3, 4, 7, 8], true, "cmpuishown")), null, "the message is still open");
  assert.equal(fromTcf(undefined), null);
  assert.deepEqual(fromTcf({ gdprApplies: false }), { ad_storage: true, ad_user_data: true, ad_personalization: true, analytics_storage: true });
  assert.deepEqual(fromTcf(tcf([1, 3, 4, 7, 8])), { ad_storage: true, ad_user_data: true, ad_personalization: true, analytics_storage: true });
  assert.deepEqual(fromTcf(tcf([])), { ad_storage: false, ad_user_data: false, ad_personalization: false, analytics_storage: false });
  assert.deepEqual(fromTcf(tcf([1, 8], false)), { ad_storage: false, ad_user_data: false, ad_personalization: false, analytics_storage: true });
  assert.deepEqual(fromTcf(tcf([3, 4, 7, 8])), { ad_storage: false, ad_user_data: false, ad_personalization: false, analytics_storage: false }, "nothing without storage (purpose 1)");
  assert.equal(fromTcf(tcf([1, 7, 8], true, "tcloaded")).ad_personalization, false);
  assert.deepEqual(asConsentMode({ ad_storage: true, ad_user_data: false, ad_personalization: false, analytics_storage: true }), {
    ad_storage: "granted", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "granted",
  });
});

test("before the visitor answers, only Google's consent message is fetched", () => {
  const { win, doc, scripts, sent } = page();
  boot(win, doc);

  assert.deepEqual(scripts.map((script) => script.src), ["https://fundingchoicesmessages.google.com/i/pub-1259715054941263?ers=1"]);
  const [[, kind, defaults]] = sent("consent");
  assert.equal(kind, "default");
  for (const key of ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"]) assert.equal(defaults[key], "denied");
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
  yes.answer(all(STATUS.GRANTED));
  yes.answer(all(STATUS.GRANTED));
  yes.fire("CONSENT_DATA_READY");
  assert.equal(yes.fetched("googletagmanager.com/gtag/js?id=G-H52D2TJGV0"), 1);
  assert.equal(yes.fetched("adsbygoogle.js?client=ca-pub-1259715054941263"), 1);
  assert.equal(yes.sent("config").length, 1);
  assert.equal(yes.sent("consent").at(-1)[2].analytics_storage, "granted");
  // gtag.js only understands the `arguments` object itself.
  assert.equal(Object.prototype.toString.call(yes.win.dataLayer[0]), "[object Arguments]");

  const no = page();
  boot(no.win, no.doc);
  no.answer(all(STATUS.DENIED));
  assert.equal(no.scripts.length, 1, "only the consent message");
  assert.equal(no.sent("config").length, 0);
  assert.equal(no.sent("consent").at(-1)[1], "update");

  const statistics = page();
  boot(statistics.win, statistics.doc);
  statistics.answer(values(STATUS.DENIED, STATUS.DENIED, STATUS.DENIED, STATUS.GRANTED));
  assert.equal(statistics.fetched("gtag/js"), 1);
  assert.equal(statistics.fetched("adsbygoogle"), 0);
});

test("a visitor who withdraws a yes gets the page again without the scripts", () => {
  const { win, doc, answer } = page();
  boot(win, doc);
  answer(all(STATUS.GRANTED));
  assert.equal(win.reloads, 0);
  answer(all(STATUS.DENIED));
  assert.equal(win.reloads, 1);

  const never = page();
  boot(never.win, never.doc);
  never.answer(all(STATUS.DENIED));
  never.answer(all(STATUS.DENIED));
  assert.equal(never.win.reloads, 0, "nothing was fetched, so there is nothing to take off the page");
});

test("without consent mode in AdSense the TCF answer decides", () => {
  const { win, doc, answer, fetched } = page();
  let listener;
  win.__tcfapi = (command, version, run) => {
    assert.deepEqual([command, version], ["addEventListener", 2]);
    listener = run;
  };
  boot(win, doc);
  answer(all(STATUS.NOT_CONFIGURED));
  assert.equal(fetched("gtag/js"), 0);
  listener({ gdprApplies: true, eventStatus: "cmpuishown" }, true);
  assert.equal(fetched("gtag/js"), 0);
  listener({ gdprApplies: true, eventStatus: "useractioncomplete", purpose: { consents: { 1: true, 8: true } }, vendor: { consents: {} } }, true);
  assert.equal(fetched("gtag/js"), 1);
  assert.equal(fetched("adsbygoogle"), 0);
});

test("the cookie settings control appears when the message can be reopened", () => {
  const { win, doc, controls, fire } = page();
  boot(win, doc);
  assert.equal(controls[0].hidden, true);
  fire("CONSENT_API_READY");
  assert.equal(controls[0].hidden, false);
  let reopened = 0;
  win.googlefc.showRevocationMessage = () => (reopened += 1);
  controls[0].clicks[0]();
  assert.equal(reopened, 1);
});

test("no page asks Google for anything in its own markup", async () => {
  const [head, headList, footer, footerLinks] = await Promise.all([
    read("src/components/Head.astro"),
    read("config/head/index.mjs"),
    read("src/components/Footer.astro"),
    read("src/lib/site-footer.mjs"),
  ]);
  assert.doesNotMatch(headList, /import \w+ from "\.\/(consent|analytics|ads)\.mjs"/);
  assert.doesNotMatch(head + headList, /googletagmanager|googlesyndication|document\.cookie/);
  assert.match(head, /import \{ boot \} from "\.\.\/lib\/consent\/boot\.mjs";/);
  assert.match(footer, /<button type="button" data-cookie-settings hidden>/);
  assert.match(footerLinks, /"\/juridisk\/cookiepolitik\/"/);
});

test("comments are fetched from giscus only when the visitor asks", async () => {
  const [component, library] = await Promise.all([read("src/components/Giscus.astro"), read("src/lib/comments.mjs")]);
  assert.doesNotMatch(component, /giscus\.app\/client\.js|createElement\("script"\)/);
  assert.match(component, /\[data-giscus-show\]"\)\?\.addEventListener\("click"/);
  assert.match(library, /export function loadComments/);
});
