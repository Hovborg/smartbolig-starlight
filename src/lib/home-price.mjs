// The live electricity price on the homepage (components/home/HomeTools.astro).
// Fetches the site's own /api/elpris and writes the price of this quarter,
// today's hours and the cheapest three hours in a row. Stores nothing. If the
// prices cannot be fetched, the card keeps the text it was built with.

import { el, part, setText, svgEl } from "./tools/dom.mjs";
import { dayKey, fill, formatNumber } from "./tools/format.mjs";
import { priceCopy } from "./tools/price-copy.mjs";
import { fetchPrices, REFRESH_SECONDS } from "./tools/price-data.mjs";
import { sparkBars, sparkTicks } from "./tools/price-spark.mjs";
import { priceView } from "./tools/price-view.mjs";
import { STEP_SECONDS } from "./tools/price-window.mjs";

const RUN_HOURS = 3;

/** Starts the card. Returns a function that stops its timer and its request. */
export function startHomePrice(root, { clock: deviceClock = () => Date.now() / 1000 } = {}) {
  const lang = root.dataset.lang === "en" ? "en" : "da";
  const copy = priceCopy[lang];
  const $ = (name) => part(root, name);
  const state = { data: null, loadedAt: 0, request: null, timer: null };
  // The device clock, put right when it is far from the server's (price-data.mjs).
  const clock = () => deviceClock() + (state.data?.clockOffset ?? 0);

  function render() {
    const now = clock();
    // The card draws today's hours, so the level is compared with today.
    const view = priceView({ points: state.data.points, area: state.data.area, now, runHours: RUN_HOURS, lang, copy, levelOver: "today" });
    const today = view.hours.filter((hour) => dayKey(hour.start) === dayKey(now));
    // Without a price for this quarter there is nothing true to show.
    if (!view.now || today.length === 0) return false;

    setText($("value"), formatNumber(view.now.value, lang, 1));
    setText($("period"), view.now.period);
    setText($("area"), copy.area[state.data.area]);
    $("level").dataset.level = view.now.level;
    setText($("level"), copy.level[view.now.level]);
    setText($("run"), view.windowText);

    const bars = sparkBars(today, { now, window: view.window });
    $("spark").replaceChildren(
      ...bars.map(({ state: kind, ...box }) => svgEl("rect", { ...box, rx: 1.5, class: `home-price__bar home-price__bar--${kind}` })),
    );
    // The cheapest run may lie tomorrow: then no bar is marked, and the key is not shown.
    $("legend-best").hidden = !bars.some((bar) => bar.state === "best");
    const [min, max] = view.stats;
    $("spark").setAttribute("aria-label", fill(root.dataset.sparkLabel, { min: min.value, minAt: min.at, max: max.value, maxAt: max.at }));
    $("ticks").replaceChildren(
      ...sparkTicks(today).map(({ label, at }) => {
        const tick = el("span", {}, label);
        // Set through the style object, which a strict Content-Security-Policy allows.
        tick.style.insetInlineStart = `${at * 100}%`;
        return tick;
      }),
    );
    return true;
  }

  async function load() {
    state.request?.abort();
    const request = (state.request = new AbortController());
    try {
      state.data = await fetchPrices(state.data?.area, request.signal);
      state.loadedAt = clock();
      // The clock may have been put right: the next quarter is counted again.
      atNextQuarter();
    } catch {
      if (request.signal.aborted) return;
    }
    root.dataset.state = state.data && render() ? "ready" : "idle";
  }

  // A new quarter has a new price; prices older than ten minutes are fetched again.
  function refresh() {
    if (document.visibilityState !== "visible") return;
    if (!state.data || clock() - state.loadedAt > REFRESH_SECONDS) load();
    else root.dataset.state = render() ? "ready" : "idle";
  }
  function atNextQuarter() {
    clearTimeout(state.timer);
    state.timer = setTimeout(() => {
      refresh();
      atNextQuarter();
    }, (STEP_SECONDS - (clock() % STEP_SECONDS) + 1) * 1000);
  }

  document.addEventListener("visibilitychange", refresh);
  atNextQuarter();
  load();

  return () => {
    clearTimeout(state.timer);
    state.request?.abort();
    document.removeEventListener("visibilitychange", refresh);
  };
}
