import type { APIRoute, GetStaticPaths } from 'astro';
import citiesData from '../data/cities.json';
import routeDataJson from '../data/route-data.json';
import { getIndexableDistancePairs } from '../utils/city-identity';

export const prerender = true;

const SITE = 'https://distancefrom.co';
const CHUNK = 5000;
const pairs = getIndexableDistancePairs(routeDataJson as Record<string, unknown>, citiesData as Record<string, any>);
const chunks = Math.ceil(pairs.length / CHUNK);

export const getStaticPaths: GetStaticPaths = () =>
  Array.from({ length: chunks }, (_, i) => ({ params: { index: String(i) } }));

export const GET: APIRoute = ({ params }) => {
  const i = Number(params.index);
  const slice = pairs.slice(i * CHUNK, (i + 1) * CHUNK);
  const urls = slice.map(p =>
    `<url><loc>${SITE}/distance/${p.pair}/</loc><changefreq>monthly</changefreq><priority>${p.priority}</priority></url>`
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
