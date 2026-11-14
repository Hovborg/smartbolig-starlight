// Wires the "what does it cost to keep it on" tool (PowerCost.astro) to its
// calculation. Everything happens in the browser; nothing is fetched or stored.

import { bindRange, part, setText, show } from "./dom.mjs";
import { fill, formatMoney, formatNumber, parseDecimal } from "./format.mjs";
import { powerCopy } from "./power-copy.mjs";
import { costPerHour, powerCost, savingPerHourLess } from "./power-cost.mjs";

const MAX_WATTS = 100_000;
const MAX_PRICE = 100;

export function startPowerTool(root) {
  const lang = root.dataset.lang === "en" ? "en" : "da";
  const copy = powerCopy[lang];
  const $ = (name) => part(root, name);
  const chips = [...root.querySelectorAll(".sb-tool-chip")];
  const hoursText = (hours) => fill(hours === 1 ? copy.hours.one : copy.hours.other, { n: formatNumber(hours, lang, Number.isInteger(hours) ? 0 : 1) });
  const money = (amount) => formatMoney(amount, lang);

  // The number in a field, or null when it cannot be used; the field then says why.
  function read(name, max) {
    const input = $(name);
    const value = parseDecimal(input.value);
    const valid = value >= 0 && value <= max;
    input.setAttribute("aria-invalid", String(!valid));
    show($(`${name}-error`), !valid);
    return valid ? value : null;
  }

  function render() {
    const watts = read("watts", MAX_WATTS);
    const pricePerKwh = read("price", MAX_PRICE);
    const hoursPerDay = Number($("hours").value);
    if (watts === null || pricePerKwh === null) {
      for (const name of ["cost-year", "cost-month", "cost-day", "kwh-year"]) setText($(name), "–");
      setText($("meaning"), copy.meaning.invalid);
      return;
    }
    const input = { watts, hoursPerDay, pricePerKwh };
    const { kwh, cost } = powerCost(input);
    setText($("cost-year"), money(cost.year));
    setText($("cost-month"), money(cost.month));
    setText($("cost-day"), money(cost.day));
    setText($("kwh-year"), `${formatNumber(kwh.year, lang, kwh.year < 100 ? 1 : 0)} kWh`);
    const saving = savingPerHourLess(input);
    const sentences = [fill(copy.meaning.hour, { amount: money(costPerHour(input)) })];
    if (saving > 0) sentences.push(fill(copy.meaning.saving, { amount: money(saving) }));
    setText($("meaning"), sentences.join(" "));
  }

  const press = (chosen) => chips.forEach((chip) => chip.setAttribute("aria-pressed", String(chip === chosen)));
  for (const chip of chips) {
    chip.addEventListener("click", () => {
      $("watts").value = chip.dataset.watts;
      if (chip.dataset.hours) {
        $("hours").value = chip.dataset.hours;
        // Lets the slider repaint its track and say its new value.
        $("hours").dispatchEvent(new Event("input"));
      }
      press(chip);
      render();
    });
  }
  $("watts").addEventListener("input", () => {
    // A number typed by hand is no longer the example.
    press(null);
    render();
  });
  $("price").addEventListener("input", render);
  bindRange($("hours"), {
    describe: hoursText,
    onInput: (hours) => {
      setText($("hours-value"), hoursText(hours));
      render();
    },
  });
}
