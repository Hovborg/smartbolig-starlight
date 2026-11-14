import type { NotFoundCopy } from "../../lib/not-found-copy";
import { clockAt, sinceLoad } from "./clock";
import { set } from "./dom";

/** The joke every Home Assistant user has lived through. */
export function setUpRestartButton(t: NotFoundCopy, logRows: NodeListOf<HTMLLIElement>): void {
  const card = document.getElementById("nf-card");
  const restartButton = document.getElementById("nf-restart") as HTMLButtonElement | null;
  const baseCount = t.logLines.length;
  let restartCount = 0;
  if (!card || !restartButton) return;

  restartButton.addEventListener("click", () => {
    if (restartCount >= t.restartLines.length) return;
    const line = t.restartLines[restartCount];
    restartCount++;

    card.classList.add("is-restarting");
    restartButton.disabled = true;
    set("nf-state", (el) => { el.textContent = t.restartingLabel; });
    set("nf-restart-label", (el) => { el.textContent = t.restartBusy; });

    setTimeout(() => {
      card.classList.remove("is-restarting");
      set("nf-state", (el) => { el.textContent = t.stateLabel; });
      const row = logRows[baseCount + restartCount - 1];
      if (row) {
        row.querySelector(".log-time")!.textContent = clockAt(sinceLoad());
        row.querySelector(".log-text")!.textContent = line;
        row.hidden = false;
      }
      if (restartCount >= t.restartLines.length) {
        restartButton.remove();
      } else {
        restartButton.disabled = false;
        set("nf-restart-label", (el) => { el.textContent = t.restartLabel; });
      }
    }, 1400);
  });
}
