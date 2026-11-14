// The words the battery life tool shows for a result. No DOM, so the script
// and the tests share it.

import { fill, formatNumber, formatPercent } from "./format.mjs";
import { batteryCopy } from "./battery-copy.mjs";

/** "412 µA" below 1 mA, otherwise "1,2 mA". Below 1 µA enough decimals for two significant digits. */
export function formatCurrent(milliamps, lang) {
  if (milliamps < 1) {
    const micro = milliamps * 1000;
    const small = micro < 1 ? Math.min(6, 1 - Math.floor(Math.log10(micro))) : 1;
    return `${formatNumber(micro, lang, micro < 100 ? small : 0)} µA`;
  }
  return `${formatNumber(milliamps, lang, milliamps < 100 ? 1 : 0)} mA`;
}

/** The life in the unit that fits: hours under a day, days under two months, months under two years, then years. */
export function formatLife(result, lang) {
  const copy = batteryCopy[lang].result;
  if (result.years > 100) return copy.over100;
  const hours = result.days * 24;
  if (hours < 1) return copy.underHour;
  if (result.days < 1) {
    const whole = Math.round(hours);
    return `${whole} ${whole === 1 ? copy.unitHour : copy.unitHours}`;
  }
  if (result.months < 2) return `${formatNumber(result.days, lang, result.days < 10 ? 1 : 0)} ${copy.unitDays}`;
  if (result.years < 2) return `${formatNumber(result.months, lang, 1)} ${copy.unitMonths}`;
  return `${formatNumber(result.years, lang, result.years < 10 ? 1 : 0)} ${copy.unitYears}`;
}

/** The sentence that says whether sleep or being awake uses most of the energy. */
export function formatMeaning(awakeShare, lang) {
  const copy = batteryCopy[lang].meaning;
  // Whole percentages that add up to 100, and "50 % each" is never called "most".
  const awake = Math.round(awakeShare * 100);
  const values = { awake: formatPercent(awake / 100, lang), sleep: formatPercent((100 - awake) / 100, lang) };
  if (awake === 50) return fill(copy.even, values);
  return fill(awake > 50 ? copy.awake : copy.sleep, values);
}
