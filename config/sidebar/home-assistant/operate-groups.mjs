// Home Assistant sidebar groups: Automationer, Dashboard & UI, System, Reference.
export default [
  // Automationer gruppe
  {
    label: "Automationer",
    translations: { en: "Automations" },
    collapsed: false,
    items: [
      {
        label: "Din første automation",
        translations: { en: "Your First Automation" },
        link: "/home-assistant/foerste-automation/",
      },
      {
        label: "Automationer 2026.7",
        translations: { en: "Automations 2026.7" },
        link: "/home-assistant/automationer-2026-7/",
      },
      {
        label: "Robotstøvsuger efter område",
        translations: { en: "Vacuum by Area" },
        link: "/home-assistant/robotstoevsuger-efter-omraade/",
      },
      {
        label: "Besked fra vaskemaskinen",
        translations: { en: "Washing Machine Notification" },
        link: "/home-assistant/vaskemaskine-notification/",
      },
      {
        label: "Fugtighed og affugter",
        translations: { en: "Humidity & Dehumidifier" },
        link: "/home-assistant/fugtighed-alarm-affugter/",
      },
      {
        label: "Opvarmning af elbil",
        translations: { en: "EV Preheating" },
        link: "/home-assistant/elbil-opvarmning/",
      },
      {
        label: "Node-RED",
        link: "/home-assistant/node-red/",
      },
    ],
  },
  // Dashboard & UI
  {
    label: "Dashboard og brugerflade",
    translations: { en: "Dashboard & UI" },
    collapsed: true,
    items: [
      {
        label: "Dashboard-design",
        translations: { en: "Dashboard Design" },
        link: "/home-assistant/dashboard-design/",
      },
      {
        label: "Det nye Overview",
        translations: { en: "The New Overview" },
        link: "/home-assistant/overview-dashboard-2026/",
      },
      {
        label: "Vælg dashboardkort",
        translations: { en: "Choose Dashboard Cards" },
        link: "/home-assistant/dashboard-kortvaelger/",
      },
    ],
  },
  // System & Vedligeholdelse
  {
    label: "System",
    translations: { en: "System" },
    collapsed: true,
    items: [
      {
        label: "Backup og sikkerhed",
        translations: { en: "Backup & Security" },
        link: "/home-assistant/backup-sikkerhed/",
      },
      {
        label: "Sikre opdateringer",
        translations: { en: "Safe Updates" },
        link: "/home-assistant/sikre-opdateringer-2026/",
      },
      {
        label: "Aktivitet og spor",
        translations: { en: "Activity & Traces" },
        link: "/home-assistant/aktivitet-og-spor/",
      },
      {
        label: "Ydeevne",
        translations: { en: "Performance" },
        link: "/home-assistant/performance/",
      },
      {
        label: "Fejlfinding",
        translations: { en: "Troubleshooting" },
        link: "/home-assistant/fejlfinding/",
      },
    ],
  },
  // Reference
  {
    label: "Reference",
    translations: { en: "Reference" },
    collapsed: true,
    items: [
      {
        label: "Ordliste",
        translations: { en: "Glossary" },
        link: "/home-assistant/glossar/",
      },
    ],
  },
];
