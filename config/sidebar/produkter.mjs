// Sidebar section: Produkter.
export default {
  label: "Produkter",
  translations: { en: "Products" },
  items: [
    {
      label: "Oversigt",
      translations: { en: "Overview" },
      link: "/produkter/",
    },
    {
      label: "Alle Anbefalinger",
      translations: { en: "All Recommendations" },
      link: "/produkter/anbefalinger/",
    },
    {
      label: "Smart home i lejebolig",
      translations: { en: "Smart Home in a Rented Flat" },
      link: "/produkter/smart-home-i-lejebolig/",
    },
    // Hardware & Protokoller
    {
      label: "Hardware & Protokoller",
      translations: { en: "Hardware & Protocols" },
      collapsed: false,
      items: [
        {
          label: "Zigbee Koordinatorer",
          translations: { en: "Zigbee Coordinators" },
          link: "/produkter/zigbee-koordinatorer/",
        },
        {
          label: "Zigbee Sensorer",
          translations: { en: "Zigbee Sensors" },
          link: "/produkter/zigbee-sensorer/",
        },
        {
          label: "Shelly Produkter",
          translations: { en: "Shelly Products" },
          link: "/produkter/shelly/",
        },
        {
          label: "WiFi Enheder",
          translations: { en: "WiFi Devices" },
          link: "/produkter/wifi-enheder/",
        },
      ],
    },
    // Belysning & Indretning
    {
      label: "Belysning & Indretning",
      translations: { en: "Lighting & Decor" },
      collapsed: true,
      items: [
        {
          label: "Smart Belysning",
          translations: { en: "Smart Lighting" },
          link: "/produkter/smart-belysning/",
        },
        {
          label: "Smart Gardiner",
          translations: { en: "Smart Blinds" },
          link: "/produkter/smart-gardiner/",
        },
      ],
    },
    // Klima & Energi
    {
      label: "Klima & Energi",
      translations: { en: "Climate & Energy" },
      collapsed: true,
      items: [
        {
          label: "Smart Termostater",
          translations: { en: "Smart Thermostats" },
          link: "/produkter/smart-termostater/",
        },
        {
          label: "Energistyring",
          translations: { en: "Energy Management" },
          link: "/produkter/energistyring/",
        },
        {
          label: "Luftkvalitet",
          translations: { en: "Air Quality" },
          link: "/produkter/smart-luftkvalitet/",
        },
      ],
    },
    // Sikkerhed & Overvågning
    {
      label: "Sikkerhed & Overvågning",
      translations: { en: "Security & Monitoring" },
      collapsed: true,
      items: [
        {
          label: "Smart Alarm",
          translations: { en: "Smart Alarm" },
          link: "/produkter/smart-alarm/",
        },
        {
          label: "Smart Sikkerhed",
          translations: { en: "Smart Security" },
          link: "/produkter/smart-sikkerhed/",
        },
        {
          label: "Vandlækage",
          translations: { en: "Water Leak" },
          link: "/produkter/smart-vand/",
        },
        {
          label: "Tilstedeværelse",
          translations: { en: "Presence Detection" },
          link: "/produkter/tilstedevaerelse/",
        },
      ],
    },
    // Underholdning
    {
      label: "Underholdning",
      translations: { en: "Entertainment" },
      collapsed: true,
      items: [
        {
          label: "Medier & Entertainment",
          translations: { en: "Media & Entertainment" },
          link: "/produkter/medier-entertainment/",
        },
        {
          label: "Stemmestyring",
          translations: { en: "Voice Control" },
          link: "/produkter/smart-stemmestyring/",
        },
      ],
    },
    // Hjem & Have
    {
      label: "Hjem & Have",
      translations: { en: "Home & Garden" },
      collapsed: true,
      items: [
        {
          label: "Smart Garage",
          translations: { en: "Smart Garage" },
          link: "/produkter/smart-garage/",
        },
        {
          label: "Smart Have",
          translations: { en: "Smart Garden" },
          link: "/produkter/smart-haven/",
        },
        {
          label: "Smart Pool",
          translations: { en: "Smart Pool" },
          link: "/produkter/smart-pool/",
        },
        {
          label: "Smart Rengøring",
          translations: { en: "Smart Cleaning" },
          link: "/produkter/smart-rengoering/",
        },
        {
          label: "Smart Køkken",
          translations: { en: "Smart Kitchen" },
          link: "/produkter/smart-koekken/",
        },
      ],
    },
    // Specialiseret
    {
      label: "Specialiseret",
      translations: { en: "Specialized" },
      collapsed: true,
      items: [
        {
          label: "Smart Baby",
          translations: { en: "Smart Baby" },
          link: "/produkter/smart-baby/",
        },
        {
          label: "Smart Kæledyr",
          translations: { en: "Smart Pet" },
          link: "/produkter/smart-kaeledyr/",
        },
        {
          label: "Smart Sundhed",
          translations: { en: "Smart Health" },
          link: "/produkter/smart-sundhed/",
        },
      ],
    },
  ],
};
