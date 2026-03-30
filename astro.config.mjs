// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    configPath: './wrangler.worker.toml',
    platformProxy: {
      enabled: true,
    },
  }),
  site: 'https://distancefrom.co',
});
