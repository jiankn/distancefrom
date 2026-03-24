import type { APIRoute } from 'astro';

export const prerender = true;

const SITE = 'https://distancefrom.co';
const pages = ['/', '/about/', '/privacy/'];

export const GET: APIRoute = () => {
  const urls = pages.map(p =>
    `<url><loc>${SITE}${p}</loc><changefreq>monthly</changefreq><priority>${p === '/' ? '1.0' : '0.3'}</priority></url>`
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
