import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://workouse.com',
  output: 'hybrid',
  adapter: cloudflare({
    imageService: 'passthrough'
  }),
  vite: {
    ssr: {
      external: ['node:buffer', '@cloudflare/puppeteer'],
    },
  },
  integrations: [
    tailwind(),
    sitemap({
      filter: (page) => !page.includes('/admin'),
    }),
  ],
});

