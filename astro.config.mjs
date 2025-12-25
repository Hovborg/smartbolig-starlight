// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightThemeGalaxy from 'starlight-theme-galaxy';
import tailwindcss from '@tailwindcss/vite';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://smartbolig.net',

  integrations: [
    starlight({
      title: 'SmartBolig.net',
      // Galaxy theme plugin
      plugins: [starlightThemeGalaxy()],
      // Custom CSS for dark mode + Tailwind
      customCss: [
        './src/styles/global.css',
        './src/styles/custom.css',
      ],
      // Social links
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/smartbolig' },
      ],
      // Internationalization (Danish default + English)
      defaultLocale: 'da',
      locales: {
        da: {
          label: 'Dansk',
          lang: 'da',
        },
        en: {
          label: 'English',
          lang: 'en',
        },
      },
      // Sidebar navigation - using autogenerate for simplicity
      sidebar: [
        {
          label: 'Home Assistant',
          translations: { en: 'Home Assistant' },
          autogenerate: { directory: 'da/home-assistant' },
        },
        {
          label: 'ESP32',
          autogenerate: { directory: 'da/esp32' },
        },
        {
          label: 'Automationer',
          translations: { en: 'Automations' },
          autogenerate: { directory: 'da/automationer' },
        },
        {
          label: 'Produkter',
          translations: { en: 'Products' },
          autogenerate: { directory: 'da/produkter' },
        },
        {
          label: 'Sikkerhed',
          translations: { en: 'Security' },
          autogenerate: { directory: 'da/sikkerhed' },
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
          tag: 'script',
          attrs: {
            id: 'Cookiebot',
            src: 'https://consent.cookiebot.com/uc.js',
            'data-cbid': '97aa135b-54bd-4bf5-8bc5-9994966ebab6',
            'data-blockingmode': 'auto',
            type: 'text/javascript',
          },
        },
        // Google AdSense
        {
          tag: 'script',
          attrs: {
            async: true,
            src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1259715054941263',
            crossorigin: 'anonymous',
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

  adapter: cloudflare(),
});