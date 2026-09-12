// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Astro.url only resolves to this during the static build — without it,
  // canonical URLs, Open Graph tags, and share links would all point at
  // localhost in production.
  site: 'https://agencianuvion.com.br',
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [sitemap()]
});
