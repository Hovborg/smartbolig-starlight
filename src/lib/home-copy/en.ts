import type { HomeCopy } from "./types.ts";

export const en: HomeCopy = {
  hero: {
    kicker: "Independent guides · Local control",
    titleLines: ["A smart home", "you run yourself"],
    tagline:
      "Thorough guides to Home Assistant, ESPHome and automations — with local control and privacy in focus.",
    primary: { label: "Start here", href: "/en/start/" },
    secondary: { label: "Go straight to the guide library", href: "/en/home-assistant/" },
    imageAlt:
      "3D model of a smart home in evening light, seen from above: living room, kitchen, bedroom and bathroom, solar panels on the garage and an electric car charging.",
    search: {
      label: "Search the guides",
      placeholder: "What should your home do? Try «lights on motion»",
      askAi: "Ask AI",
      suggestionsLabel: "Popular right now",
      suggestions: [
        { label: "Lights on motion", href: "/en/automationer/bevaegelseslys-med-overstyring/" },
        { label: "Follow the power price", href: "/en/home-assistant/elpris-integration/" },
        { label: "Zigbee without the cloud", href: "/en/home-assistant/zigbee2mqtt/" },
      ],
    },
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
    stage: {
      label: "3D model of a smart home that you can turn",
      hint: "Drag to turn the house",
      rotateLeft: "Turn the house to the left",
      rotateRight: "Turn the house to the right",
      spots: [
        { id: "light", label: "Lighting", href: "#tour-light" },
        { id: "heat", label: "Heating", href: "#tour-heat" },
        { id: "energy", label: "Energy", href: "#tour-energy" },
        { id: "security", label: "Security", href: "#tour-security" },
        { id: "hub", label: "The brain", href: "/en/home-assistant/" },
        { id: "diy", label: "Build your own", href: "/en/esp32/" },
      ],
    },
    tour: {
      eyebrow: "A day in a smart home",
      title: "Scroll down and see what the house does by itself",
      chapters: [
        {
          id: "heat",
          mode: "morning",
          time: "06:30",
          label: "Heating",
          title: "The heat is ready before you get up",
          text: "The bathroom floor is warm, and the radiator in the living room turned up while you slept. For the rest of the day the house lowers the temperature by itself when nobody is home.",
          points: [
            "Floor heating and radiators follow schedule and absence",
            "The heat pump works when power is cheapest",
          ],
          links: [
            { label: "Better Thermostat", href: "/en/home-assistant/better-thermostat/" },
            { label: "Smart thermostats", href: "/en/produkter/smart-termostater/" },
          ],
        },
        {
          id: "energy",
          mode: "day",
          time: "12:00",
          label: "Energy",
          title: "The sun charges the car while you are out",
          text: "The solar panels produce the most around noon. The house sends the power to the car and the washing machine first and waits with the rest until the price is low.",
          points: [
            "Consumption and production on one dashboard",
            "Charging and laundry start by the power price",
          ],
          links: [
            { label: "The Energy dashboard", href: "/en/home-assistant/energy-dashboard/" },
            { label: "Power prices in Home Assistant", href: "/en/home-assistant/elpris-integration/" },
            { label: "Energy management gear", href: "/en/produkter/energistyring/" },
          ],
        },
        {
          id: "light",
          mode: "evening",
          time: "19:30",
          label: "Lighting",
          title: "The light follows you through the evening",
          text: "When the sun sets, the lamps come on dimmed and the blinds roll down. If someone walks into the kitchen, the light turns on there and off again by itself.",
          points: [
            "Motion lighting that the wall switch can still override",
            "Scenes for film, dinner and goodnight",
          ],
          links: [
            { label: "Motion lighting with override", href: "/en/automationer/bevaegelseslys-med-overstyring/" },
            { label: "Smart lighting", href: "/en/produkter/smart-belysning/" },
            { label: "Build an LED strip", href: "/en/esp32/led-strip/" },
          ],
        },
        {
          id: "security",
          mode: "night",
          time: "23:00",
          label: "Security",
          title: "The house locks up and keeps watch at night",
          text: "When everyone is asleep, the door locks, the lights go out and the sensors wake up. If something happens, you get a message on your phone. The automations run locally, even when the internet is down.",
          points: [
            "Door lock, sensors and camera in one place",
            "A message on your phone when something is wrong",
          ],
          links: [
            { label: "Smart security", href: "/en/produkter/smart-sikkerhed/" },
            { label: "Safe remote access", href: "/en/sikkerhed/fjernadgang/" },
            { label: "Mobile notifications", href: "/en/home-assistant/mobilnotifikationer/" },
          ],
        },
      ],
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
        id: "home-assistant",
        title: "Home Assistant",
        description: "Installation, integrations and upkeep of the brain of your smart home.",
        href: "/en/home-assistant/",
      },
      {
        id: "automations",
        title: "Automations",
        description: "Reliable everyday logic with concrete, tested examples.",
        href: "/en/automationer/",
      },
      {
        id: "esp32",
        title: "ESP32 & ESPHome",
        description: "Build your own local sensors and devices with YAML you can understand.",
        href: "/en/esp32/",
      },
      {
        id: "products",
        title: "Products & gear",
        description: "Compatible hardware chosen for function and local control.",
        href: "/en/produkter/",
      },
      {
        id: "ai",
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
  tools: {
    eyebrow: "Tools",
    title: "Run the numbers on your own home",
    intro: "Small calculators with real numbers: the electricity price right now, what your appliances cost to keep on, which Zigbee channel fits, and how long a battery lasts.",
    all: { label: "All tools", href: "/en/vaerktoejer/" },
    price: {
      label: "Electricity price right now",
      unit: "øre/kWh",
      runLabel: "Cheapest 3 hours in a row:",
      legendNow: "now",
      legendBest: "cheapest 3 hours",
      idleTitle: "See the electricity price hour by hour",
      idleText: "The Danish spot price today and tomorrow, and the cheapest hours in a row for the dishes, the laundry and charging.",
      link: { label: "See every hour and change area", href: "/en/vaerktoejer/elpris/" },
      note: "Spot price with VAT, without tax and grid tariff. Source: Energinet, CC BY 4.0.",
      sparkLabel: "The electricity price hour by hour today. Lowest hour: {min} {minAt}. Highest hour: {max} {maxAt}.",
    },
  },
  guides: {
    eyebrow: "Featured guides",
    title: "Start with what lasts",
    photoAlt: "3D model of a smart home in morning light: the lights are on in the bedroom and the kitchen, and the sun is low over the garden.",
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
