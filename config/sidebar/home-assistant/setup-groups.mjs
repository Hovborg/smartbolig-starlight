// Home Assistant sidebar groups: Installation, Integrationer, Protokoller.
export default [
  // Installation gruppe
  {
    label: "Installation",
    translations: { en: "Installation" },
    collapsed: false,
    items: [
      {
        label: "Raspberry Pi",
        link: "/home-assistant/raspberry-pi-installation/",
      },
      {
        label: "Proxmox VM",
        link: "/home-assistant/proxmox-installation/",
      },
      {
        label: "Docker",
        link: "/home-assistant/docker-installation/",
      },
    ],
  },
  // Integrationer gruppe
  {
    label: "Integrationer",
    translations: { en: "Integrations" },
    collapsed: false,
    items: [
      {
        label: "HACS",
        link: "/home-assistant/hacs/",
      },
      {
        label: "Elpris-integration",
        translations: { en: "Electricity Price" },
        link: "/home-assistant/elpris-integration/",
      },
      {
        label: "Zigbee2MQTT",
        link: "/home-assistant/zigbee2mqtt/",
      },
      {
        label: "Zigbee2MQTT Avanceret",
        translations: { en: "Zigbee2MQTT Advanced" },
        link: "/home-assistant/zigbee2mqtt-avanceret/",
      },
      {
        label: "ZHA-enheder",
        translations: { en: "ZHA Devices" },
        link: "/home-assistant/zha-enhedshaandtering/",
      },
      {
        label: "Shelly Wall Display",
        link: "/home-assistant/shelly-wall-display/",
      },
      {
        label: "Better Thermostat",
        link: "/home-assistant/better-thermostat/",
      },
      {
        label: "Lokal stemmestyring",
        translations: { en: "Local Voice Assist" },
        link: "/home-assistant/local-voice-assist/",
      },
      {
        label: "Energy Dashboard",
        link: "/home-assistant/energy-dashboard/",
      },
      {
        label: "Mobilnotifikationer",
        translations: { en: "Mobile Notifications" },
        link: "/home-assistant/mobilnotifikationer/",
      },
      {
        label: "AI Task",
        link: "/home-assistant/ai-task/",
      },
      {
        label: "MCP-server",
        translations: { en: "MCP Server" },
        link: "/home-assistant/mcp-server/",
      },
    ],
  },
  // Protokoller gruppe
  {
    label: "Protokoller",
    translations: { en: "Protocols" },
    collapsed: true,
    items: [
      {
        label: "Z-Wave",
        link: "/home-assistant/z-wave/",
      },
      {
        label: "Thread & Matter",
        link: "/home-assistant/thread-matter/",
      },
      {
        label: "WiFi Enheder",
        translations: { en: "WiFi Devices" },
        link: "/home-assistant/wifi-enheder/",
      },
      {
        label: "Infrarød proxy",
        translations: { en: "Infrared Proxy" },
        link: "/home-assistant/infraroed-proxy/",
      },
      {
        label: "433 MHz RF-proxy",
        translations: { en: "433 MHz RF Proxy" },
        link: "/home-assistant/radiofrekvens-proxy/",
      },
    ],
  },
];
