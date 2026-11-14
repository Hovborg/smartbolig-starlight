// Wires the electricity price tool (PowerPrice.astro) to its calculations:
// fetches the prices from the site's own /api/elpris, listens to the
// controls and writes the result into the page. Nothing is stored in the
// browser; scripts/site-tools.test.mjs keeps it that way.

import { bindRange, part, setInvalid, setText, show } from "./dom.mjs";
import { dayKey, fill, formatDay, formatNumber, formatTime, parseDecimal } from "./format.mjs";
import { createPriceChart } from "./price-chart-ui.mjs";
import { priceCopy } from "./price-copy.mjs";
import { fetchPrices, REFRESH_SECONDS } from "./price-data.mjs";
import { drawTable } from "./price-table-dom.mjs";
import { priceView } from "./price-view.mjs";
import { STEP_SECONDS } from "./price-window.mjs";

const MAX_ADD_ON = 1000;

export function startPriceTool(root) {
  const lang = root.dataset.lang === "en" ? "en" : "da";
  const copy = priceCopy[lang];
  const $ = (name) => part(root, name);
  const state = { data: null, loadedAt: 0, vat: true, addOn: 0, runHours: Number($("run").value), request: null };
  // The device clock, put right when it is far from the server's (price-data.mjs).
  const clock = () => Date.now() / 1000 + (state.data?.clockOffset ?? 0);
  const chart = createPriceChart(root, { lang, copy, clock });
  const areaRadios = [...root.querySelectorAll('input[name$="-area"]')];
  const runText = (hours) => fill(hours === 1 ? copy.window.one : copy.window.other, { n: hours });

  function render() {
    if (!state.data) return;
    const now = clock();
    const { vat, addOn, runHours } = state;
    const view = priceView({ points: state.data.points, area: state.data.area, now, vat, addOn, runHours, lang, copy });
    setText($("now-value"), view.now ? formatNumber(view.now.value, lang, 1) : "–");
    setText($("now-period"), view.now ? view.now.period : copy.now.missing);
    show($("level-row"), Boolean(view.now));
    if (view.now) {
      $("level").dataset.level = view.now.level;
      setText($("level-text"), copy.level[view.now.level]);
    }
    // Three figures about today. With no hours of today left they are emptied,
    // so yesterday's figures never stand under "today".
    for (let index = 0; index < 3; index += 1) {
      setText($(`stat-${index}`), view.stats[index]?.value ?? "–");
      setText($(`stat-${index}-at`), view.stats[index]?.at ?? "");
    }
    setText($("window-text"), view.windowText);
    show($("pending"), view.pending);
    // An old copy, shown while Energinet is down, says which day it is from.
    const fetched = Date.parse(state.data.fetched) / 1000;
    const text = dayKey(fetched) === dayKey(now) ? copy.fetched : copy.fetchedDay;
    setText($("fetched"), fill(text, { time: formatTime(fetched), day: formatDay(fetched, lang) }));
    chart.draw(view);
    drawTable($("table"), { view, area: state.data.area, now, lang, copy });
  }

  // Without `area` the endpoint guesses it from where the visitor is.
  async function load(area) {
    state.request?.abort();
    const request = (state.request = new AbortController());
    // A quiet refresh of the prices already shown does not dim them.
    if (!state.data || state.data.area !== area) root.dataset.state = "loading";
    try {
      const data = (state.data = await fetchPrices(area, request.signal));
      state.loadedAt = clock();
      for (const radio of areaRadios) radio.checked = radio.value === data.area;
      setText($("area-hint"), data.areaGuessed ? copy.area.guessed : copy.area.hint);
    } catch {
      if (request.signal.aborted) return;
      // Prices already shown for this area are still right. Otherwise say so calmly.
      if (state.data?.area !== area) state.data = null;
    }
    root.dataset.state = state.data ? "ready" : "error";
    setText($("error-text"), state.data ? "" : copy.error.text);
    render();
  }

  // A new quarter has a new price; prices older than ten minutes are fetched again.
  function refresh() {
    if (!state.data || document.visibilityState !== "visible") return;
    if (clock() - state.loadedAt > REFRESH_SECONDS) load(state.data.area);
    else render();
  }
  function atNextQuarter() {
    setTimeout(() => {
      refresh();
      atNextQuarter();
    }, (STEP_SECONDS - (clock() % STEP_SECONDS) + 1) * 1000);
  }

  for (const radio of areaRadios) radio.addEventListener("change", () => load(radio.value));
  for (const radio of root.querySelectorAll('input[name$="-vat"]')) {
    radio.addEventListener("change", () => {
      state.vat = radio.value === "on";
      render();
    });
  }
  $("addon").addEventListener("input", (event) => {
    const text = event.target.value.trim();
    const value = text === "" ? 0 : parseDecimal(text);
    const valid = value >= 0 && value <= MAX_ADD_ON;
    setInvalid(event.target, $("addon-error"), !valid);
    if (!valid) return;
    state.addOn = value;
    render();
  });
  bindRange($("run"), {
    describe: runText,
    onInput: (hours) => {
      state.runHours = hours;
      setText($("run-value"), runText(hours));
      render();
    },
  });
  $("retry").addEventListener("click", () => load(areaRadios.find((radio) => radio.checked)?.value));
  document.addEventListener("visibilitychange", refresh);
  atNextQuarter();
  load();
}
