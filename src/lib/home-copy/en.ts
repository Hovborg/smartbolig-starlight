import type { HomeCopy } from "./types.ts";

export const en: HomeCopy = {
  hero: {
    kicker: "Independent guides · Local control",
    titleLines: ["A smart home", "you run yourself"],
    tagline:
      "Thorough guides to Home Assistant, ESPHome and automations — with local control and privacy in focus.",
    primary: { label: "Start here", href: "/en/start/" },
    secondary: { label: "Go straight to the guide library", href: "/en/home-assistant/" },
    newsLink: { label: "Read AI news", href: "/en/ai/nyheder/" },
    imageAlt:
      "Calm evening light in a modern living room and kitchen where discreet smart home technology blends into the home.",
    imageCaption: "Technology that feels at home.",
    topics: ["Home Assistant", "ESPHome", "Local control"],
    scene: {
      title: "A day in a smart home",
      choose: "Choose a time of day",
      note: "Illustration · Examples of automations you can build yourself",
      modes: [
        { id: "morning", label: "Morning", rule: "The alarm goes off: the lights fade in, and the bathroom is warm." },
        { id: "day", label: "Day", rule: "The solar panels produce: the dishwasher and the car charge while power is cheapest." },
        { id: "evening", label: "Evening", rule: "The sun sets: the lamps turn on, and the blinds close." },
        { id: "night", label: "Night", rule: "Everyone is asleep: the lights go out, the door locks, and the heating turns down." },
      ],
      systems: { light: "Lighting", heat: "Heating", energy: "Energy", security: "Security" },
    },
    motion: {
      start: "Start animations",
      pause: "Pause animations",
      system: "Following your device",
      manual: "Your preference",
      reset: "Use device setting",
    },
  },
  navigator: {
    eyebrow: "Choose your route",
    title: "What should your home be able to do?",
    beginner: {
      question: "New to smart homes?",
      description:
        "Follow the guided start route: six steps from platform to first automation and backup.",
      link: { label: "Follow the start route", href: "/en/start/" },
    },
    rows: [
      {
        title: "Home Assistant",
        description: "Installation, integrations and upkeep of the brain of your smart home.",
        href: "/en/home-assistant/",
      },
      {
        title: "Automations",
        description: "Reliable everyday logic with concrete, tested examples.",
        href: "/en/automationer/",
      },
      {
        title: "ESP32 & ESPHome",
        description: "Build your own local sensors and devices with YAML you can understand.",
        href: "/en/esp32/",
      },
      {
        title: "Products & gear",
        description: "Compatible hardware chosen for function and local control.",
        href: "/en/produkter/",
      },
      {
        title: "Practical AI",
        description: "Tools and workflows for when AI genuinely helps your smart home.",
        href: "/en/ai/",
      },
    ],
  },
  fieldGuide: {
    eyebrow: "The field guide",
    title: "Three stages to a home that runs itself",
    intro:
      "The order matters more than the gear — build the foundation first and avoid starting over.",
    steps: [
      {
        title: "Choose and install the platform",
        description:
          "Find the Home Assistant installation that fits your home and how much you want to maintain.",
      },
      {
        title: "Connect your first devices",
        description:
          "Start with one protocol, make the network stable, and keep naming consistent from day one.",
      },
      {
        title: "Automate — and secure it all",
        description:
          "Build one simple automation you can trust, and put backups in place before the setup grows.",
      },
    ],
    outro: { label: "See the full start route with all six steps", href: "/en/start/" },
  },
  guides: {
    eyebrow: "Featured guides",
    title: "Start with what lasts",
    photoAlt: "Close-up of a circuit board with chips and connections.",
    lead: {
      title: "Getting started with Home Assistant",
      description:
        "The full overview before you choose an installation: hardware, concepts and the choices that are hard to undo later.",
      href: "/en/home-assistant/kom-godt-i-gang/",
      tag: "Foundation",
    },
    more: [
      {
        title: "Your first automation",
        description: "Trigger, condition and action — explained through one simple automation.",
        href: "/en/home-assistant/foerste-automation/",
        tag: "Automation",
      },
      {
        title: "Backup & security",
        description: "Protect the setup before your home depends on it.",
        href: "/en/home-assistant/backup-sikkerhed/",
        tag: "Operations",
      },
      {
        title: "Matter & Thread 2026",
        description: "Commission new devices and understand your Thread network in practice.",
        href: "/en/home-assistant/thread-matter/",
        tag: "Devices",
      },
    ],
  },
  trust: {
    eyebrow: "How we work",
    title: "Credibility you can verify",
    items: [
      {
        title: "Official sources in every guide",
        description:
          "Technical guides link to official documentation so you can verify every step yourself.",
        link: { label: "About SmartBolig.net", href: "/en/om-os/" },
      },
      {
        title: "Local control before cloud",
        description:
          "We prefer solutions that work without internet access whenever practical — your data stays at home.",
        link: { label: "Network security", href: "/en/sikkerhed/" },
      },
      {
        title: "Open about affiliate links",
        description:
          "Product links may be affiliate links. Recommendations come before economics, and the price stays the same for you.",
        link: { label: "Affiliate disclosure", href: "/en/juridisk/affiliate-disclosure/" },
      },
      {
        title: "Errors get fixed",
        description: "If you find something inaccurate, we correct it and date the update.",
        link: { label: "Contact & corrections", href: "/en/kontakt/" },
      },
    ],
  },
  news: {
    eyebrow: "AI news",
    title: "Latest AI news",
  },
  closing: {
    title: "Keep building at your own pace",
    text:
      "The guide library covers installation, devices, automations and reliable operation — and we welcome requests for new guides.",
    primary: { label: "Explore all guides", href: "/en/home-assistant/" },
    secondary: { label: "Suggest a guide", href: "/en/kontakt/" },
  },
};
