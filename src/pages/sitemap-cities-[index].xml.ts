import type { APIRoute, GetStaticPaths } from 'astro';
import citiesData from '../data/cities.json';
import { getIndexableCitySlugs } from '../utils/indexability';
import { SITE_URL } from '../utils/site';

export const prerender = true;

const CHUNK = 10000;
const slugs = getIndexableCitySlugs(citiesData as Record<string, any>);
const chunks = Math.ceil(slugs.length / CHUNK);

export const getStaticPaths: GetStaticPaths = () =>
  Array.from({ length: chunks }, (_, i) => ({ params: { index: String(i) } }));

export const GET: APIRoute = ({ params }) => {
  const i = Number(params.index);
  const slice = slugs.slice(i * CHUNK, (i + 1) * CHUNK);
  const urls = slice.map(s =>
    `<url><loc>${SITE_URL}/city/${s}/</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
