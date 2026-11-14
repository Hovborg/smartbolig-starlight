// Wires the battery life tool (BatteryLife.astro) to its calculation.
// Everything happens in the browser; nothing is fetched or stored.

import { batteryCopy } from "./battery-copy.mjs";
import { BATTERY_LIMITS, batteryLife } from "./battery-life.mjs";
import { formatCurrent, formatLife, formatMeaning } from "./battery-view.mjs";
import { part, setInvalid, setText } from "./dom.mjs";
import { formatNumber, parseDecimal } from "./format.mjs";

const FIELDS = Object.keys(BATTERY_LIMITS);
const OUTPUTS = ["life", "average", "days", "months", "years"];

export function startBatteryTool(root) {
  const lang = root.dataset.lang === "en" ? "en" : "da";
  const copy = batteryCopy[lang];
  const $ = (name) => part(root, name);
  const chips = [...root.querySelectorAll(".sb-tool-chip")];

  // A field's number, or null when it is outside its limits; the field then says why.
  function read(key) {
    const { min, max } = BATTERY_LIMITS[key];
    const value = parseDecimal($(key).value);
    const valid = value >= min && value <= max;
    setInvalid($(key), $(`${key}-error`), !valid);
    return valid ? value : null;
  }

  function render() {
    const input = Object.fromEntries(FIELDS.map((key) => [key, read(key)]));
    const missing = Object.values(input).includes(null);
    const tooLong = !missing && input.awakeSeconds > input.intervalMinutes * 60;
    // The awake-time field has two messages: not a number, or longer than the interval.
    setText($("awakeSeconds-error"), tooLong ? copy.seconds.tooLong : copy.seconds.invalid);
    setInvalid($("awakeSeconds"), $("awakeSeconds-error"), tooLong || input.awakeSeconds === null);

    const result = missing || tooLong ? null : batteryLife(input);
    if (!result) {
      for (const name of OUTPUTS) setText($(name), "–");
      setText($("meaning"), missing ? copy.meaning.invalid : tooLong ? copy.meaning.tooLong : copy.meaning.zero);
      return;
    }
    setText($("life"), formatLife(result, lang));
    setText($("average"), formatCurrent(result.averageMilliamps, lang));
    setText($("days"), formatNumber(result.days, lang, result.days < 100 ? 1 : 0));
    setText($("months"), formatNumber(result.months, lang, 1));
    setText($("years"), formatNumber(result.years, lang, 1));
    setText($("meaning"), formatMeaning(result.awakeShare, lang));
  }

  const press = (chosen) => chips.forEach((chip) => chip.setAttribute("aria-pressed", String(chip === chosen)));
  for (const chip of chips) {
    chip.addEventListener("click", () => {
      $("sleepMicroamps").value = chip.dataset.sleep;
      $("awakeMilliamps").value = chip.dataset.awake;
      press(chip);
      render();
    });
  }
  for (const key of FIELDS) {
    $(key).addEventListener("input", () => {
      // A current typed by hand is no longer the datasheet figure.
      if (key === "sleepMicroamps" || key === "awakeMilliamps") press(null);
      render();
    });
  }
  render();
}
