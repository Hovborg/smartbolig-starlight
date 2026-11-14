// How long a battery lasts for a device that sleeps and wakes up now and then.
// No DOM, so it runs in Node tests.

import { DAYS_PER_MONTH, DAYS_PER_YEAR } from "./power-cost.mjs";

/** The limits the tool accepts; the page tells the visitor when a field is outside them. */
export const BATTERY_LIMITS = {
  capacityMah: { min: 0.1, max: 1_000_000 },
  sleepMicroamps: { min: 0, max: 1_000_000 },
  awakeMilliamps: { min: 0, max: 10_000 },
  awakeSeconds: { min: 0, max: 86_400 },
  intervalMinutes: { min: 0.1, max: 10_080 }, // one week
  usablePercent: { min: 1, max: 100 },
};

const inRange = (value, { min, max }) => Number.isFinite(value) && value >= min && value <= max;

/** Is the awake time longer than the interval? Compared in whole milliseconds, so "equal" survives rounding errors. */
export function awakeTooLong(input) {
  return Math.round(input.awakeSeconds * 1000) > Math.round(input.intervalMinutes * 60_000);
}

/** True when every field is a number inside its limits and the device is awake no longer than the interval. */
export function isValid(input) {
  return Object.keys(BATTERY_LIMITS).every((key) => inRange(input?.[key], BATTERY_LIMITS[key])) && !awakeTooLong(input);
}

/**
 * Average current and life. Returns null when the input is not valid or the
 * device uses no current at all (then there is nothing to divide by).
 * `averageMilliamps` is the average current; `hours` the life; `awakeShare`
 * is the share of the energy used while awake, between 0 and 1.
 */
export function batteryLife(input) {
  if (!isValid(input)) return null;
  const period = input.intervalMinutes * 60;
  const awake = input.awakeMilliamps * input.awakeSeconds;
  // Never below zero: awake for the whole interval can differ from it by a rounding error.
  const asleep = (input.sleepMicroamps / 1000) * Math.max(0, period - input.awakeSeconds);
  const averageMilliamps = (awake + asleep) / period;
  if (!(averageMilliamps > 0)) return null;
  const hours = (input.capacityMah * (input.usablePercent / 100)) / averageMilliamps;
  const days = hours / 24;
  return {
    averageMilliamps,
    hours,
    days,
    months: days / DAYS_PER_MONTH,
    years: days / DAYS_PER_YEAR,
    awakeShare: awake / (awake + asleep),
  };
}
