// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Production domain. For preview builds (e.g. GitHub Pages under /fightflow/)
// set SITE_URL and BASE_PATH in the environment.
const site = process.env.SITE_URL ?? 'https://www.fightflow.at';
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  compressHTML: true,
  build: {
    format: 'directory',
    // The whole stylesheet is small – inlining it removes every render-blocking request.
    inlineStylesheets: 'always',
  },
  i18n: {
    defaultLocale: 'de',
    locales: ['de', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Anton',
      cssVariable: '--font-display',
      fallbacks: ['Impact', 'Arial Narrow', 'sans-serif'],
      display: 'swap',
      options: {
        variants: [{ src: ['./src/assets/fonts/anton-latin-400-normal.woff2'], weight: 400, style: 'normal' }],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Inter',
      cssVariable: '--font-body',
      fallbacks: ['system-ui', 'sans-serif'],
      display: 'swap',
      options: {
        variants: [{ src: ['./src/assets/fonts/inter-latin-wght-normal.woff2'], weight: '100 900', style: 'normal' }],
      },
    },
  ],
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'de', locales: { de: 'de-AT', en: 'en' } },
      filter: (page) => !page.includes('/404'),
    }),
  ],
});
