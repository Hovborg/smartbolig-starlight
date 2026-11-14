import { notFoundCopy } from "../../lib/not-found-copy";
import type { PageIndexEntry } from "../../lib/not-found-index";
import { fillLogbook, showRequestedPath, startLastChangedTicker } from "./clock";
import { applyEnglish, detectLang, relativeTimeFor } from "./language";
import { setUpRestartButton } from "./restart";
import { showSuggestions } from "./suggest";

// Entry for the 404 page: language, requested path, live clock, logbook,
// restart joke and "did you mean" suggestions. The page index is embedded at
// build time as a JSON data block (see src/pages/404.astro).
const path = location.pathname;
const lang = detectLang(path);
const t = notFoundCopy[lang];

let pageIndex: PageIndexEntry[] = [];
try {
  pageIndex = JSON.parse(document.getElementById("nf-page-index")?.textContent || "[]");
} catch {
  // Unreadable index: the page still works, it just offers no suggestions.
}

if (lang === "en") applyEnglish();
showRequestedPath(path);
startLastChangedTicker(t, relativeTimeFor(lang));
const logRows = fillLogbook(t);
setUpRestartButton(t, logRows);
showSuggestions(path, lang, pageIndex);
