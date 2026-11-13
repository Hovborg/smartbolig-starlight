import type { NotFoundCopy } from "../../lib/not-found-copy";
import { set } from "./dom";
import type { RelativeTime } from "./language";

const loadedAt = Date.now();

/** HH:MM:SS for the moment the page loaded, shifted by `offsetMs`. */
export function clockAt(offsetMs?: number): string {
  const d = new Date(loadedAt + (offsetMs || 0));
  const pad = (n: number) => (n < 10 ? "0" + n : String(n));
  return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
}

/** Milliseconds since the page loaded. */
export function sinceLoad(): number {
  return Date.now() - loadedAt;
}

/** Show the path that actually 404'd as an entity attribute. */
export function showRequestedPath(path: string): void {
  let shownPath = path;
  try {
    shownPath = decodeURIComponent(path);
  } catch {
    // Malformed percent-encoding: fall back to the raw pathname.
  }
  if (shownPath.length > 64) shownPath = shownPath.slice(0, 63) + "…";
  // textContent, never innerHTML: the path is visitor-controlled.
  set("nf-path", (el) => { el.textContent = shownPath; });
}

/** last_changed ticks up from page load, like a live entity. */
export function startLastChangedTicker(t: NotFoundCopy, relativeTime: RelativeTime): void {
  const tick = () => {
    const seconds = Math.round(sinceLoad() / 1000);
    let text: string;
    if (seconds < 2) text = t.justNow;
    else if (seconds < 60) text = relativeTime.seconds(seconds);
    else text = relativeTime.minutes(Math.floor(seconds / 60));
    set("nf-changed", (el) => { el.textContent = text; });
  };
  tick();
  setInterval(tick, 1000);
}

/**
 * Logbook. The rows are rendered server-side (Astro scopes <style> with a
 * class JS-created nodes never get); only the timestamps and the
 * Danish/English text are filled in here.
 */
export function fillLogbook(t: NotFoundCopy): NodeListOf<HTMLLIElement> {
  const logRows = document.querySelectorAll<HTMLLIElement>("#nf-log li");
  for (let i = 0; i < t.logLines.length; i++) {
    if (!logRows[i]) continue;
    logRows[i].querySelector(".log-time")!.textContent = clockAt(-3000 + i * 1000);
    logRows[i].querySelector(".log-text")!.textContent = t.logLines[i];
  }
  return logRows;
}
