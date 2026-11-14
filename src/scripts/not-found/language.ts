import { notFoundCopy, type NotFoundCopy, type NotFoundLang } from "../../lib/not-found-copy";
import { set } from "./dom";

/**
 * dist/404.html is served for every unknown path and is built in Danish, so
 * English is swapped in at runtime. A /da/ or /en/ prefix wins; without one
 * (e.g. /typo/) the browser decides, so an English speaker hitting a bare bad
 * URL still gets English.
 */
export function detectLang(path: string): NotFoundLang {
  if (path.indexOf("/en/") === 0) return "en";
  if (path.indexOf("/da/") !== 0) {
    const preferred = (navigator.languages && navigator.languages[0]) || navigator.language || "";
    if (preferred && preferred.slice(0, 2).toLowerCase() !== "da") return "en";
  }
  return "da";
}

export interface RelativeTime {
  seconds: (n: number) => string;
  minutes: (n: number) => string;
}

export function relativeTimeFor(lang: NotFoundLang): RelativeTime {
  return lang === "en"
    ? {
        seconds: (n) => n + " second" + (n === 1 ? "" : "s") + " ago",
        minutes: (n) => n + " minute" + (n === 1 ? "" : "s") + " ago",
      }
    : {
        seconds: (n) => "for " + n + " sekund" + (n === 1 ? "" : "er") + " siden",
        minutes: (n) => "for " + n + " minut" + (n === 1 ? "" : "ter") + " siden",
      };
}

/** Replaces the server-rendered Danish copy with the English copy. */
export function applyEnglish(): void {
  const t: NotFoundCopy = notFoundCopy.en;
  document.documentElement.lang = "en";
  document.title = t.title + " | SmartBolig.net";
  const text = (id: string, value: string) => set(id, (el) => { el.textContent = value; });
  const link = (id: string, href: string, value: string) =>
    set(id, (el) => {
      (el as HTMLAnchorElement).href = href;
      el.textContent = value;
    });

  text("nf-eyebrow", t.eyebrow);
  text("nf-heading", t.heading);
  text("nf-description", t.description);
  text("nf-entity", t.entityId);
  text("nf-card-hint", t.cardHint);
  text("nf-state", t.stateLabel);
  text("nf-history-label", t.historyLabel);
  text("nf-attr-state-value", t.stateLabel);
  text("nf-device-class", t.deviceClassValue);
  text("nf-log-title", t.logTitle);
  text("nf-restart-label", t.restartLabel);
  text("nf-suggest-title", t.suggestTitle);
  link("nf-home", t.homePath, t.homeLink);
  link("nf-start", t.startPath, t.startLink);
  link("nf-ha", t.haPath, t.haLink);
  link("nf-esp", t.espPath, t.espLink);
  text("nf-popular-title", t.popularTitle);
  set("nf-popular-links", (el) => {
    const links = el.querySelectorAll("a");
    t.guides.forEach((guide, index) => {
      if (links[index]) {
        links[index].href = guide.href;
        links[index].textContent = guide.text;
      }
    });
  });
  link("nf-lang-switch", t.langSwitch.href, t.langSwitch.flag + " " + t.langSwitch.text);
}
