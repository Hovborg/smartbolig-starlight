// Every text in the battery life tool, in Danish and English, and its
// examples. Words in {braces} are filled in by fill() in format.mjs. Both
// languages must have the same keys; scripts/site-tools.test.mjs checks it.

/**
 * Presets fill the two currents only. Each one needs a source the page links.
 * esp32: ESP32 Series Datasheet v5.3, Espressif (read 2026-11-14): "Power
 * consumption in Deep-sleep mode is 10 µA", and Table 5-4, transmit 802.11n
 * MCS7 at +14 dBm, 180 mA typical.
 */
export const BATTERY_PRESETS = [{ id: "esp32", sleepMicroamps: 10, awakeMilliamps: 180 }];

export const BATTERY_SOURCES = {
  esp32: "https://documentation.espressif.com/esp32_datasheet_en.pdf",
};

/** What the tool starts with. They are examples the visitor replaces. */
export const BATTERY_DEFAULTS = {
  capacityMah: 2000,
  sleepMicroamps: 20,
  awakeMilliamps: 80,
  awakeSeconds: 3,
  intervalMinutes: 15,
  usablePercent: 80,
};

export const batteryCopy = {
  da: {
    title: "Batterilevetid",
    capacity: { label: "Batteriets kapacitet", unit: "mAh", hint: "Står på batteriet eller i databladet.", invalid: "Skriv et tal fra 0,1 til 1000000 uden tusindtegn, for eksempel 2500." },
    sleep: { label: "Strøm i søvn", unit: "µA", hint: "Mål den selv, se under værktøjet.", invalid: "Skriv et tal fra 0 til 1000000 uden tusindtegn, for eksempel 10." },
    awake: { label: "Strøm, når den er vågen", unit: "mA", hint: "Gennemsnit over hele opvågningen, ikke kun toppen.", invalid: "Skriv et tal fra 0 til 10000 uden tusindtegn, for eksempel 180." },
    seconds: {
      label: "Vågen pr. opvågning",
      unit: "sek.",
      hint: "Fra den vågner, til den sover igen.",
      invalid: "Skriv et tal fra 0 til 86400 uden tusindtegn, for eksempel 5.",
      tooLong: "Den kan ikke være vågen længere end tiden mellem opvågninger.",
    },
    interval: { label: "Opvågning hver", unit: "min.", hint: "Tiden fra en opvågning til den næste.", invalid: "Skriv et tal fra 0,1 til 10080 uden tusindtegn, for eksempel 30." },
    usable: { label: "Brugbar del af kapaciteten", unit: "%", hint: "Enheden stopper ofte, før batteriet er helt tomt.", invalid: "Skriv et tal fra 1 til 100." },
    presets: {
      label: "Tal fra et datablad",
      hint: "Udfylder strøm i søvn og vågen. Tallene gælder selve chippen; mål det, du bruger.",
      source: "Kilde: Espressifs ESP32-datablad",
      esp32: "ESP32-chip: 10 µA søvn, 180 mA sender",
    },
    result: {
      life: "Batteriet holder cirka",
      average: "Gennemsnitsstrøm",
      days: "Dage",
      months: "Måneder",
      years: "År",
      unitDays: "dage",
      unitMonths: "måneder",
      unitYears: "år",
      over100: "Over 100 år",
    },
    meaning: {
      awake: "Mest strøm går til at være vågen: {awake} af energien, mens søvnen tager {sleep}.",
      sleep: "Mest strøm går til søvnen: {sleep} af energien, mens at være vågen tager {awake}.",
      even: "Vågen tid og søvn bruger lige meget strøm: {awake} hver.",
      invalid: "Ret tallene ovenfor for at se levetiden.",
      zero: "Med de tal bruger enheden ingen strøm, så der er intet at regne på.",
      tooLong: "Ret den vågne tid: den er længere end tiden mellem opvågninger.",
    },
    note: "Sådan regner vi: gennemsnitsstrøm = (vågen strøm × vågen tid + søvnstrøm × søvntid) ÷ tiden mellem opvågninger. Levetid = kapacitet × brugbar del ÷ gennemsnitsstrøm. En måned er 30,4 dage, og et år er 365 dage.",
  },
  en: {
    title: "Battery life",
    capacity: { label: "Battery capacity", unit: "mAh", hint: "It is printed on the battery or in the datasheet.", invalid: "Type a number from 0.1 to 1000000 without a thousands separator, for example 2500." },
    sleep: { label: "Current while asleep", unit: "µA", hint: "Measure it yourself, see below the tool.", invalid: "Type a number from 0 to 1000000 without a thousands separator, for example 10." },
    awake: { label: "Current while awake", unit: "mA", hint: "The average over the whole wake-up, not only the peak.", invalid: "Type a number from 0 to 10000 without a thousands separator, for example 180." },
    seconds: {
      label: "Awake per wake-up",
      unit: "sec.",
      hint: "From waking up to going back to sleep.",
      invalid: "Type a number from 0 to 86400 without a thousands separator, for example 5.",
      tooLong: "It cannot be awake longer than the time between wake-ups.",
    },
    interval: { label: "Wake up every", unit: "min.", hint: "The time from one wake-up to the next.", invalid: "Type a number from 0.1 to 10080 without a thousands separator, for example 30." },
    usable: { label: "Usable share of the capacity", unit: "%", hint: "The device often stops before the battery is completely empty.", invalid: "Type a number from 1 to 100." },
    presets: {
      label: "Figures from a datasheet",
      hint: "Fills in the current asleep and awake. The figures are for the chip itself; measure what you use.",
      source: "Source: Espressif's ESP32 datasheet",
      esp32: "ESP32 chip: 10 µA asleep, 180 mA transmitting",
    },
    result: {
      life: "The battery lasts about",
      average: "Average current",
      days: "Days",
      months: "Months",
      years: "Years",
      unitDays: "days",
      unitMonths: "months",
      unitYears: "years",
      over100: "More than 100 years",
    },
    meaning: {
      awake: "Most of the energy goes to being awake: {awake} of it, while sleep takes {sleep}.",
      sleep: "Most of the energy goes to sleep: {sleep} of it, while being awake takes {awake}.",
      even: "Being awake and sleeping use the same energy: {awake} each.",
      invalid: "Correct the numbers above to see the battery life.",
      zero: "With those numbers the device uses no current, so there is nothing to calculate.",
      tooLong: "Correct the awake time: it is longer than the time between wake-ups.",
    },
    note: "How we calculate: average current = (awake current × awake time + sleep current × sleep time) ÷ the time between wake-ups. Life = capacity × usable share ÷ average current. A month is 30.4 days and a year is 365 days.",
  },
};
