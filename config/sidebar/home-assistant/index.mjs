// Sidebar section: Home Assistant (top items plus the grouped sub-sections).
import setupGroups from "./setup-groups.mjs";
import operateGroups from "./operate-groups.mjs";

export default {
  label: "Home Assistant",
  items: [
    {
      label: "Oversigt",
      translations: { en: "Overview" },
      link: "/home-assistant/",
    },
    {
      label: "Kom godt i gang",
      translations: { en: "Getting Started" },
      link: "/home-assistant/kom-godt-i-gang/",
    },
    ...setupGroups,
    ...operateGroups,
  ],
};
