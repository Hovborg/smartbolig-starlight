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
      // Custom components for Schema.org
      components: {
        Head: "./src/components/Head.astro",
      },
      // Social links
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/Hovborg/smartbolig-starlight",
        },
      ],
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
              label: "Om SmartBolig.net",
              translations: { en: "About SmartBolig.net" },
              link: "/om-os/",
            },
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
            {
              label: "Affiliate Disclosure",
              link: "/juridisk/affiliate-disclosure/",
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
        // Schema.org Organization
        {
          tag: "script",
          attrs: {
            type: "application/ld+json",
          },
          content: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "SmartBolig.net",
            "url": "https://smartbolig.net",
            "logo": "https://smartbolig.net/images/og-image.png",
            "description": "Dansk smart home ressourcecenter med guides til Home Assistant, ESP32, Zigbee og mere.",
            "sameAs": ["https://github.com/Hovborg/smartbolig-starlight"]
          }),
        },
        // Schema.org WebSite with SearchAction
        {
          tag: "script",
          attrs: {
            type: "application/ld+json",
          },
          content: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "SmartBolig.net",
            "url": "https://smartbolig.net",
            "inLanguage": ["da", "en"],
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://smartbolig.net/da/?search={search_term_string}",
              "query-input": "required name=search_term_string"
            }
          }),
        },
        // Open Graph / Social sharing
        {
          tag: "meta",
          attrs: {
            property: "og:type",
            content: "website",
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:site_name",
            content: "SmartBolig.net",
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:image",
            content: "https://smartbolig.net/images/og-image.png",
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:image:width",
            content: "1200",
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:image:height",
            content: "630",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "twitter:card",
            content: "summary_large_image",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "twitter:image",
            content: "https://smartbolig.net/images/og-image.png",
          },
        },
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
        // Google Analytics 4 (via Cookiebot consent)
        {
          tag: "script",
          attrs: {
            async: true,
            src: "https://www.googletagmanager.com/gtag/js?id=G-H52D2TJGV0",
            "data-cookieconsent": "statistics",
          },
        },
        {
          tag: "script",
          attrs: {
            "data-cookieconsent": "statistics",
          },
          content: `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-H52D2TJGV0');`,
        },
        // RSS Feed auto-discovery
        {
          tag: "link",
          attrs: {
            rel: "alternate",
            type: "application/rss+xml",
            title: "SmartBolig.net RSS (Dansk)",
            href: "https://smartbolig.net/rss.xml",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "alternate",
            type: "application/rss+xml",
            title: "SmartBolig.net RSS (English)",
            href: "https://smartbolig.net/en/rss.xml",
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
