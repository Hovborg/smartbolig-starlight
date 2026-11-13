// Starlight sidebar: ordered list of the top-level sections, one file each.
import homeAssistant from "./home-assistant/index.mjs";
import esp32 from "./esp32.mjs";
import automationer from "./automationer.mjs";
import ai from "./ai.mjs";
import produkter from "./produkter.mjs";
import sikkerhed from "./sikkerhed.mjs";
import juridisk from "./juridisk.mjs";

export const sidebar = [
  homeAssistant,
  esp32,
  automationer,
  ai,
  produkter,
  sikkerhed,
  juridisk,
];
