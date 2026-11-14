// Numbers, money and times for the tools, in Danish (da-DK) and English (en-GB).
// Times are always shown in Danish time: the prices belong to Danish clock
// hours, also when the visitor's device is set to another time zone.

export const LOCALES = { da: "da-DK", en: "en-GB" };
export const TIME_ZONE = "Europe/Copenhagen";

const localeOf = (lang) => LOCALES[lang] ?? LOCALES.da;

// Building an Intl formatter is slow, and a chart asks for the same one many
// times, so each one is made once.
const cache = new Map();
function formatter(kind, lang, options) {
  const key = `${kind}|${lang}|${JSON.stringify(options)}`;
  if (!cache.has(key)) {
    const Format = kind === "date" ? Intl.DateTimeFormat : Intl.NumberFormat;
    cache.set(key, new Format(localeOf(lang), options));
  }
  return cache.get(key);
}

/** "1.234,5" in Danish, "1,234.5" in English. */
export function formatNumber(value, lang = "da", digits = 1) {
  return formatter("number", lang, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

/** "123,4 øre/kWh". The unit is Danish money, so it is the same in English. */
export function formatOre(value, lang = "da", digits = 1) {
  return `${formatNumber(value, lang, digits)}\u00a0øre/kWh`;
}

/** "1.234 kr." in Danish, "DKK 1,234" in English. */
export function formatKroner(value, lang = "da", digits = 0) {
  return formatter("number", lang, {
    style: "currency",
    currency: "DKK",
    currencyDisplay: lang === "en" ? "code" : "symbol",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/**
 * An amount in kroner at a precision that still says something: whole kroner
 * from 100, øre from 1 krone, and below 1 krone the amount in øre ("25 øre"),
 * so the cost of a small appliance does not round to nothing.
 */
export function formatMoney(kroner, lang = "da") {
  if (kroner >= 100 || kroner <= 0) return formatKroner(kroner, lang, 0);
  if (kroner >= 1) return formatKroner(kroner, lang, 2);
  const ore = kroner * 100;
  return `${formatNumber(ore, lang, ore >= 10 ? 0 : ore >= 1 ? 1 : 2)}\u00a0øre`;
}

/** A share between 0 and 1 as "31 %" in Danish, "31%" in English. */
export function formatPercent(share, lang = "da") {
  return formatter("number", lang, { style: "percent", maximumFractionDigits: 0 }).format(share);
}

function dateParts(epochSeconds, lang, options) {
  const parts = formatter("date", lang, { timeZone: TIME_ZONE, ...options }).formatToParts(new Date(epochSeconds * 1000));
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

/** "02:15" in Danish time. The same in both languages. */
export function formatTime(epochSeconds) {
  const { hour, minute } = dateParts(epochSeconds, "en", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${hour}:${minute}`;
}

/** The Danish clock hour as a number, 0 to 23. */
export function hourOfDay(epochSeconds) {
  return Number(dateParts(epochSeconds, "en", { hour: "2-digit", hourCycle: "h23" }).hour);
}

/** The Danish calendar day as "2026-11-14": two times on the same day give the same key. */
export function dayKey(epochSeconds) {
  const { year, month, day } = dateParts(epochSeconds, "en", { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${year}-${month}-${day}`;
}

/** "lørdag 14. november" in Danish, "Saturday 14 November" in English. */
export function formatDay(epochSeconds, lang = "da") {
  return formatter("date", lang, { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long" }).format(
    new Date(epochSeconds * 1000),
  );
}

/**
 * Reads a number a visitor typed. Danes write "2,50" and others "2.50"; both
 * are accepted. Anything that is not a plain number gives NaN.
 */
export function parseDecimal(text) {
  const cleaned = String(text ?? "").trim().replace(/\s/g, "").replace(",", ".");
  return /^-?\d+(\.\d+)?$/.test(cleaned) ? Number(cleaned) : Number.NaN;
}

/** Puts values into a sentence: fill("Start kl. {time}.", { time: "02:15" }). */
export function fill(template, values) {
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in values ? String(values[name]) : match));
}
