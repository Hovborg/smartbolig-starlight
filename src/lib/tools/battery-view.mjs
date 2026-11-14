// The words the battery life tool shows for a result. No DOM, so the script
// and the tests share it.

import { fill, formatNumber, formatPercent } from "./format.mjs";
import { batteryCopy } from "./battery-copy.mjs";

/** "412 µA" below 1 mA, otherwise "1,2 mA". */
export function formatCurrent(milliamps, lang) {
  if (milliamps < 1) {
    const micro = milliamps * 1000;
    return `${formatNumber(micro, lang, micro < 100 ? 1 : 0)} µA`;
  }
  return `${formatNumber(milliamps, lang, milliamps < 100 ? 1 : 0)} mA`;
}

/** The life in the unit that fits: days under two months, months under two years, then years. */
export function formatLife(result, lang) {
  const copy = batteryCopy[lang].result;
  if (result.years > 100) return copy.over100;
  if (result.months < 2) return `${formatNumber(result.days, lang, result.days < 10 ? 1 : 0)} ${copy.unitDays}`;
  if (result.years < 2) return `${formatNumber(result.months, lang, 1)} ${copy.unitMonths}`;
  return `${formatNumber(result.years, lang, result.years < 10 ? 1 : 0)} ${copy.unitYears}`;
}

/** The sentence that says whether sleep or being awake uses most of the energy. */
export function formatMeaning(awakeShare, lang) {
  const copy = batteryCopy[lang].meaning;
  const values = { awake: formatPercent(awakeShare, lang), sleep: formatPercent(1 - awakeShare, lang) };
  // Compare the shown percentages, so "50 % each" is never called "most".
  if (values.awake === values.sleep) return fill(copy.even, values);
  return fill(awakeShare > 0.5 ? copy.awake : copy.sleep, values);
}
