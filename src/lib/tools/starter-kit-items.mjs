// Everything the starter kit builder can show: the questions' values, the
// parts of a kit, the first steps and where each one sends the reader next.
// Data only. The rules that pick from it are in starter-kit.mjs; the texts
// are in starter-kit-copy.mjs under the same ids.
//
// A part is one of three kinds:
//   product: "id"  a product in the register (src/data/products/). `name` is
//                  the model as the register spells it, without the extras.
//   gap: true      something to get that the register has no product for yet.
//   neither        nothing to buy: the reader has it, or it is a pointer.
// `radio` is how the part talks to Home Assistant. `fixed` marks a part of
// the fixed 230 V installation: an authorised electrician fits it, and a
// tenant never gets it. `landlord` marks a part a tenant asks the landlord
// about first. `notes` are lines from NOTES that are shown inside the part.
// `guide` is a page on the site, without the language.

export const GOALS = ["light", "heating", "energy", "security", "climate"];
export const HOMES = ["tenant", "owner"];
export const HAVES = ["nothing", "ha", "bridge"];

/** The blocks of a kit, in the order the page shows them. */
export const BLOCKS = ["brain", "link", ...GOALS, "diy"];

/** What the tool starts with: a kit that fits a tenant and an owner alike. */
export const DEFAULT_ANSWERS = { goals: ["light"], home: "tenant", have: "nothing", diy: false };
/** What a page without JavaScript shows: every goal, nothing owned, no fixed installation. */
export const NOSCRIPT_ANSWERS = { goals: GOALS, home: "tenant", have: "nothing", diy: false };

export const ITEMS = {
  "brain-ha": { block: "brain", gap: true, guide: "home-assistant/hardware-valg" },
  "brain-own": { block: "brain", guide: "home-assistant/backup-sikkerhed" },

  "link-zigbee": { block: "link", product: "sonoff-zigbee-dongle-e", name: "Sonoff Zigbee Dongle-E", notes: ["have-zigbee", "bridge-zigbee"], guide: "produkter/zigbee-koordinatorer" },
  "link-wifi": { block: "link", guide: "produkter/wifi-enheder" },

  "light-bulb": { block: "light", product: "philips-hue-color-a60-e27", name: "Philips Hue Color A60 E27", radio: "zigbee", guide: "produkter/smart-belysning" },
  "light-button": { block: "light", product: "sonoff-snzb-01p", name: "Sonoff SNZB-01P", radio: "zigbee", guide: "produkter/zigbee-sensorer" },
  "light-motion": { block: "light", product: "aqara-motion-sensor-p1", name: "Aqara Motion Sensor P1", radio: "zigbee", guide: "automationer/bevaegelseslys-med-overstyring" },
  "light-dimmer": { block: "light", product: "shelly-dimmer-2", name: "Shelly Dimmer 2", radio: "wifi", fixed: true, guide: "produkter/smart-belysning" },

  "heat-trv": { block: "heating", product: "aqara-e1-trv", name: "Aqara Smart Radiator Thermostat E1", radio: "zigbee", landlord: true, notes: ["landlord"], guide: "produkter/smart-termostater" },
  "heat-sensor": { block: "heating", product: "sonoff-snzb-02p", name: "Sonoff SNZB-02P", radio: "zigbee", guide: "home-assistant/better-thermostat" },
  // Shown instead of heat-sensor when the climate block already has the sensor.
  "heat-sensor-shared": { block: "heating", guide: "home-assistant/better-thermostat" },

  "energy-plug": { block: "energy", product: "shelly-plug-s-gen3", name: "Shelly Plug S Gen3", radio: "wifi", guide: "produkter/energistyring" },
  "energy-han": { block: "energy", gap: true, guide: "home-assistant/elmaaler-han-port" },

  "security-door": { block: "security", product: "sonoff-snzb-04p", name: "Sonoff SNZB-04P", radio: "zigbee", guide: "produkter/zigbee-sensorer" },
  "security-motion": { block: "security", product: "aqara-motion-sensor-p1", name: "Aqara Motion Sensor P1", radio: "zigbee", guide: "produkter/zigbee-sensorer" },
  // Shown instead of security-motion when the light block already has the sensor.
  "security-motion-shared": { block: "security", guide: "produkter/zigbee-sensorer" },

  "climate-sensor": { block: "climate", product: "sonoff-snzb-02p", name: "Sonoff SNZB-02P", radio: "zigbee", guide: "produkter/zigbee-sensorer" },

  "diy-board": { block: "diy", gap: true, radio: "wifi", guide: "esp32/kom-godt-i-gang" },
  "diy-light": { block: "diy", gap: true, guide: "esp32/led-strip" },
  "diy-motion": { block: "diy", gap: true, guide: "esp32/bevaegelsessensor" },
  "diy-climate": { block: "diy", gap: true, guide: "esp32/temperatur-sensor" },
};

/**
 * The first steps, in the order they are done. A kit gets three to five of
 * them. Each has one or more guides; the link texts are in the copy.
 */
export const STEPS = {
  landlord: ["produkter/smart-home-i-lejebolig"],
  install: ["home-assistant/kom-godt-i-gang"],
  backup: ["home-assistant/backup-sikkerhed"],
  zigbee: ["home-assistant/zha-enhedshaandtering", "home-assistant/zigbee2mqtt"],
  device: ["start"],
  "auto-first": ["home-assistant/foerste-automation"],
  "auto-light": ["automationer/bevaegelseslys-med-overstyring"],
  "auto-heating": ["home-assistant/better-thermostat"],
  "auto-energy": ["automationer/billige-timer"],
  "auto-security": ["home-assistant/mobilnotifikationer"],
  "auto-climate": ["home-assistant/fugtighed-alarm-affugter"],
};

/** Lines that depend on the answers and are not a part, with the guide they link to (or none). */
export const NOTES = {
  tenant: "produkter/smart-home-i-lejebolig",
  bridge: null,
  "have-zigbee": null,
  "bridge-zigbee": null,
  landlord: null,
  "no-goal": null,
};

/**
 * Every goal block ends with one line on what it cannot do. Where a guide
 * takes the reader further, the line links to it.
 */
export const LIMITS = {
  light: null,
  heating: null,
  energy: null,
  security: "produkter/smart-alarm",
  climate: "produkter/smart-luftkvalitet",
  diy: "esp32",
};
