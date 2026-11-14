// Every text in the "what does it cost to keep it on" tool, in Danish and
// English, and its examples and start values. Words in {braces} are filled in
// by fill() in format.mjs. Both languages must have the same keys;
// scripts/site-tools.test.mjs checks it.

/** What the tool starts with. The price is an example the visitor replaces. */
export const POWER_DEFAULTS = { watts: 100, hoursPerDay: 5, pricePerKwh: 2.5 };

/**
 * Example chips. They are typical figures, not measurements. `hours` is set
 * for the one that is on the whole day; the others keep the visitor's hours.
 */
export const POWER_PRESETS = [
  { id: "standby", watts: 1 },
  { id: "router", watts: 10, hours: 24 },
  { id: "gaming", watts: 300 },
  { id: "dehumidifier", watts: 250 },
];

export const powerCopy = {
  da: {
    title: "Hvad koster det at have apparatet tændt?",
    watts: {
      label: "Effekt i watt",
      hint: "Står på apparatets mærkeplade. En smart stikkontakt med måler viser det faktiske tal.",
      invalid: "Skriv et tal fra 0 til 100000 uden punktum eller komma som tusindtegn, for eksempel 1500.",
    },
    presets: {
      label: "Typiske eksempler",
      hint: "Eksemplerne er typiske tal, ikke målinger. Routeren sætter også tiden til 24 timer.",
      standby: "Standby-tv 1 W",
      router: "Router 10 W",
      gaming: "Gaming-pc 300 W",
      dehumidifier: "Affugter 250 W",
    },
    hours: { label: "Tændt pr. dag", one: "{n} time", other: "{n} timer" },
    price: {
      label: "Elpris i kr./kWh",
      hintBefore: "Din samlede pris med afgifter, nettarif og moms. 2,50 er et eksempel; ret den til din egen. Spotprisen lige nu står i ",
      hintLink: "elprisværktøjet",
      hintAfter: ".",
      unit: "kr./kWh",
      invalid: "Skriv et tal fra 0 til 100, for eksempel 2,50.",
    },
    result: { year: "Om året", month: "Om måneden", day: "Om dagen", energy: "Strøm om året" },
    meaning: {
      hour: "Hver time, det er tændt, koster {amount}.",
      saving: "En time mindre om dagen sparer {amount} om året.",
      invalid: "Ret tallene ovenfor for at se prisen.",
    },
    note: "Sådan regner vi: watt ÷ 1000 × timer pr. dag × pris pr. kWh. En måned er 30,4 dage, og et år er 365 dage.",
  },
  en: {
    title: "What does it cost to keep it on?",
    watts: {
      label: "Power in watts",
      hint: "It is printed on the appliance's rating plate. A smart plug with a meter shows the real figure.",
      invalid: "Type a number from 0 to 100000 without a thousands separator, for example 1500.",
    },
    presets: {
      label: "Typical examples",
      hint: "The examples are typical figures, not measurements. The router also sets the time to 24 hours.",
      standby: "TV on standby 1 W",
      router: "Router 10 W",
      gaming: "Gaming PC 300 W",
      dehumidifier: "Dehumidifier 250 W",
    },
    hours: { label: "On per day", one: "{n} hour", other: "{n} hours" },
    price: {
      label: "Electricity price in DKK/kWh",
      hintBefore: "Your total price with taxes, grid tariff and VAT. 2.50 is an example; change it to your own. The spot price right now is in ",
      hintLink: "the electricity price tool",
      hintAfter: ".",
      unit: "DKK/kWh",
      invalid: "Type a number from 0 to 100, for example 2.50.",
    },
    result: { year: "Per year", month: "Per month", day: "Per day", energy: "Electricity per year" },
    meaning: {
      hour: "Each hour it is on costs {amount}.",
      saving: "One hour less a day saves {amount} a year.",
      invalid: "Correct the numbers above to see the price.",
    },
    note: "How we calculate: watts ÷ 1000 × hours per day × price per kWh. A month is 30.4 days and a year is 365 days.",
  },
};
