// Sidebar section: Værktøjer (interactive tools). A new tool gets one entry
// here; scripts/site-tools.test.mjs fails if a tool page is missing from it.
export default {
  label: "Værktøjer",
  translations: { en: "Tools" },
  items: [
    {
      label: "Alle værktøjer",
      translations: { en: "All tools" },
      link: "/vaerktoejer/",
    },
    {
      label: "Elprisen lige nu",
      translations: { en: "Electricity price now" },
      link: "/vaerktoejer/elpris/",
    },
    {
      label: "Hvad koster det at have apparatet tændt?",
      translations: { en: "Cost of keeping it on" },
      link: "/vaerktoejer/stroemforbrug/",
    },
    {
      label: "Zigbee-kanalvælger",
      translations: { en: "Zigbee channel picker" },
      link: "/vaerktoejer/zigbee-kanal/",
    },
    {
      label: "Batterilevetid",
      translations: { en: "Battery life" },
      link: "/vaerktoejer/batterilevetid/",
    },
    {
      label: "Startsæt-bygger",
      translations: { en: "Starter kit builder" },
      link: "/vaerktoejer/startsaet/",
    },
  ],
};
