import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITE_URL } from './src/consts.ts';

export default defineConfig({
  site: SITE_URL,
  // CV yalnızca İngilizce; eski /cv/ adresi oraya yönlenir.
  redirects: { '/cv': '/en/cv/' },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'tr', locales: { tr: 'tr-TR', en: 'en-GB' } },
    }),
  ],
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
});
