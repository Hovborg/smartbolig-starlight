// Sidebar section: ESP32 & ESPHome.
export default {
  label: "ESP32 og ESPHome",
  translations: { en: "ESP32 & ESPHome" },
  items: [
    {
      label: "Oversigt",
      translations: { en: "Overview" },
      link: "/esp32/",
    },
    {
      label: "Kom godt i gang",
      translations: { en: "Getting Started" },
      link: "/esp32/kom-godt-i-gang/",
    },
    // Sensorer gruppe
    {
      label: "Sensorer",
      translations: { en: "Sensors" },
      collapsed: false,
      items: [
        {
          label: "Temperatursensor",
          translations: { en: "Temperature Sensor" },
          link: "/esp32/temperatur-sensor/",
        },
        {
          label: "Bevægelsessensor (PIR)",
          translations: { en: "Motion Sensor (PIR)" },
          link: "/esp32/bevaegelsessensor/",
        },
        {
          label: "LD2410 mmWave",
          translations: { en: "LD2410 mmWave Presence" },
          link: "/esp32/ld2410-mmwave/",
        },
      ],
    },
    // Projekter gruppe
    {
      label: "Projekter",
      translations: { en: "Projects" },
      collapsed: false,
      items: [
        {
          label: "LED-strip",
          translations: { en: "LED Strip Control" },
          link: "/esp32/led-strip/",
        },
      ],
    },
    // Avanceret
    {
      label: "Avanceret",
      translations: { en: "Advanced" },
      collapsed: true,
      items: [
        {
          label: "ESPHome avanceret",
          translations: { en: "ESPHome Advanced" },
          link: "/esp32/esphome-avanceret/",
        },
        {
          label: "Bluetooth-proxy",
          translations: { en: "Bluetooth Proxy" },
          link: "/esp32/bluetooth-proxy/",
        },
      ],
    },
  ],
};
