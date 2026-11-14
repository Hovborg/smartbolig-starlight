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
      label: "Alle anbefalinger",
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
      label: "Hardware og protokoller",
      translations: { en: "Hardware & Protocols" },
      collapsed: false,
      items: [
        {
          label: "Zigbee-koordinatorer",
          translations: { en: "Zigbee Coordinators" },
          link: "/produkter/zigbee-koordinatorer/",
        },
        {
          label: "Zigbee-sensorer",
          translations: { en: "Zigbee Sensors" },
          link: "/produkter/zigbee-sensorer/",
        },
        {
          label: "Shelly-produkter",
          translations: { en: "Shelly Products" },
          link: "/produkter/shelly/",
        },
        {
          label: "Wi-Fi-enheder",
          translations: { en: "WiFi Devices" },
          link: "/produkter/wifi-enheder/",
        },
      ],
    },
    // Belysning & Indretning
    {
      label: "Belysning og indretning",
      translations: { en: "Lighting & Decor" },
      collapsed: true,
      items: [
        {
          label: "Smart belysning",
          translations: { en: "Smart Lighting" },
          link: "/produkter/smart-belysning/",
        },
        {
          label: "Smart gardiner",
          translations: { en: "Smart Blinds" },
          link: "/produkter/smart-gardiner/",
        },
      ],
    },
    // Klima & Energi
    {
      label: "Klima og energi",
      translations: { en: "Climate & Energy" },
      collapsed: true,
      items: [
        {
          label: "Smart termostater",
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
      label: "Sikkerhed og overvågning",
      translations: { en: "Security & Monitoring" },
      collapsed: true,
      items: [
        {
          label: "Smart alarm",
          translations: { en: "Smart Alarm" },
          link: "/produkter/smart-alarm/",
        },
        {
          label: "Smart sikkerhed",
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
          label: "Medier og underholdning",
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
      label: "Hjem og have",
      translations: { en: "Home & Garden" },
      collapsed: true,
      items: [
        {
          label: "Smart garage",
          translations: { en: "Smart Garage" },
          link: "/produkter/smart-garage/",
        },
        {
          label: "Smart have",
          translations: { en: "Smart Garden" },
          link: "/produkter/smart-haven/",
        },
        {
          label: "Smart pool",
          translations: { en: "Smart Pool" },
          link: "/produkter/smart-pool/",
        },
        {
          label: "Smart rengøring",
          translations: { en: "Smart Cleaning" },
          link: "/produkter/smart-rengoering/",
        },
        {
          label: "Smart køkken",
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
          label: "Smart baby",
          translations: { en: "Smart Baby" },
          link: "/produkter/smart-baby/",
        },
        {
          label: "Smart kæledyr",
          translations: { en: "Smart Pet" },
          link: "/produkter/smart-kaeledyr/",
        },
        {
          label: "Smart sundhed",
          translations: { en: "Smart Health" },
          link: "/produkter/smart-sundhed/",
        },
      ],
    },
  ],
};
