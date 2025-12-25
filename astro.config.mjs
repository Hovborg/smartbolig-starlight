// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightThemeGalaxy from "starlight-theme-galaxy";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://smartbolig.net",

  integrations: [
    starlight({
      title: "SmartBolig.net",
      // Logo configuration
      logo: {
        light: "./src/assets/logo-header.png",
        dark: "./src/assets/logo-header.png",
        replacesTitle: true,
        alt: "SmartBolig logo",
      },
      // Galaxy theme plugin
      plugins: [starlightThemeGalaxy()],
      // Social links
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/Hovborg/smartbolig-starlight",
        },
      ],
      // Edit link - "Rediger denne side" på GitHub
      editLink: {
        baseUrl: "https://github.com/Hovborg/smartbolig-starlight/edit/main/",
      },
      // Internationalization (Danish default + English)
      defaultLocale: "da",
      locales: {
        da: {
          label: "Dansk",
          lang: "da",
        },
        en: {
          label: "English",
          lang: "en",
        },
      },
      // Sidebar navigation - organized by category
      sidebar: [
        // ===== HOME ASSISTANT =====
        {
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
                  label: "Zigbee2MQTT",
                  link: "/home-assistant/zigbee2mqtt/",
                },
                {
                  label: "Shelly Wall Display",
                  link: "/home-assistant/shelly-wall-display/",
                },
                {
                  label: "Better Thermostat",
                  link: "/home-assistant/better-thermostat/",
                },
              ],
            },
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
                  label: "Vaskemaskine notifikation",
                  translations: { en: "Washing Machine Notification" },
                  link: "/home-assistant/vaskemaskine-notification/",
                },
              ],
            },
          ],
        },
        // ===== ESP32 =====
        {
          label: "ESP32 & ESPHome",
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
                  label: "Temperatur sensor",
                  translations: { en: "Temperature Sensor" },
                  link: "/esp32/temperatur-sensor/",
                },
                {
                  label: "Bevægelsessensor (PIR)",
                  translations: { en: "Motion Sensor (PIR)" },
                  link: "/esp32/bevaegelsessensor/",
                },
                {
                  label: "LD2410 mmWave Presence",
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
                  label: "LED Strip kontrol",
                  translations: { en: "LED Strip Control" },
                  link: "/esp32/led-strip/",
                },
              ],
            },
          ],
        },
        // ===== AUTOMATIONER (hovedkategori) =====
        {
          label: "Automationer",
          translations: { en: "Automations" },
          autogenerate: { directory: "automationer" },
        },
        // ===== PRODUKTER =====
        {
          label: "Produkter",
          translations: { en: "Products" },
          autogenerate: { directory: "produkter" },
        },
        // ===== SIKKERHED =====
        {
          label: "Sikkerhed",
          translations: { en: "Security" },
          autogenerate: { directory: "sikkerhed" },
        },
        // ===== JURIDISK =====
        {
          label: "Juridisk",
          translations: { en: "Legal" },
          collapsed: true,
          items: [
            {
              label: "Privatlivspolitik",
              translations: { en: "Privacy Policy" },
              link: "/juridisk/privatlivspolitik/",
            },
            {
              label: "Cookiepolitik",
              translations: { en: "Cookie Policy" },
              link: "/juridisk/cookiepolitik/",
            },
          ],
        },
      ],
      // Table of contents
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      // Enable search
      pagefind: true,
      // Head tags for SEO and monetization
      head: [
        // Cookiebot
        {
          tag: "script",
          attrs: {
            id: "Cookiebot",
            src: "https://consent.cookiebot.com/uc.js",
            "data-cbid": "97aa135b-54bd-4bf5-8bc5-9994966ebab6",
            "data-blockingmode": "auto",
            type: "text/javascript",
          },
        },
        // Ezoic
        {
          tag: "script",
          attrs: {
            src: "https://cdn.ezoic.net/ezoic/ezoic.js",
            "data-cfasync": "false",
            "data-cookieconsent": "marketing",
          },
        },
        // Google AdSense
        {
          tag: "script",
          attrs: {
            async: true,
            src: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1259715054941263",
            crossorigin: "anonymous",
          },
        },
      ],
      // Disable credits
      credits: false,
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
