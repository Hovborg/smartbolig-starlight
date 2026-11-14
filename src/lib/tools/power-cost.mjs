// What it costs to keep something switched on. No DOM, so it runs in Node tests.

export const DAYS_PER_MONTH = 30.4; // 365 days / 12 months, rounded
export const DAYS_PER_YEAR = 365;

const atLeastZero = (value) => (Number.isFinite(value) && value > 0 ? value : 0);

/**
 * `watts` is the draw while it is on, `hoursPerDay` how long it is on each day
 * (kept between 0 and 24), `pricePerKwh` the price in kroner. A value that is
 * not a number counts as 0. Returns kWh and kroner per day, month and year.
 */
export function powerCost({ watts, hoursPerDay, pricePerKwh }) {
  const hours = Math.min(24, atLeastZero(hoursPerDay));
  const price = atLeastZero(pricePerKwh);
  const kwhDay = (atLeastZero(watts) / 1000) * hours;
  const kwh = { day: kwhDay, month: kwhDay * DAYS_PER_MONTH, year: kwhDay * DAYS_PER_YEAR };
  return {
    kwh,
    cost: { day: kwh.day * price, month: kwh.month * price, year: kwh.year * price },
  };
}

/** What one hour of being on costs, in kroner. */
export function costPerHour({ watts, pricePerKwh }) {
  return powerCost({ watts, hoursPerDay: 1, pricePerKwh }).cost.day;
}

/**
 * What one hour less a day saves in a year, in kroner. It is 0 when the
 * thing is not on for a whole hour a day: there is no hour to take away.
 */
export function savingPerHourLess({ watts, hoursPerDay, pricePerKwh }) {
  if (!(hoursPerDay >= 1)) return 0;
  return powerCost({ watts, hoursPerDay: 1, pricePerKwh }).cost.year;
}
