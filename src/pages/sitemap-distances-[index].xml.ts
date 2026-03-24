import type { APIRoute, GetStaticPaths } from 'astro';
import citiesData from '../data/cities.json';
import { canonicalPairKey } from '../utils/slug';

export const prerender = true;

const SITE = 'https://distancefrom.co';
const CHUNK = 10000;
const slugs = Object.keys(citiesData);

// Generate all canonical pairs
const pairs: string[] = [];
for (let i = 0; i < slugs.length; i++) {
  for (let j = i + 1; j < slugs.length; j++) {
    pairs.push(canonicalPairKey(slugs[i], slugs[j]));
  }
}
const chunks = Math.ceil(pairs.length / CHUNK);

export const getStaticPaths: GetStaticPaths = () =>
  Array.from({ length: chunks }, (_, i) => ({ params: { index: String(i) } }));

export const GET: APIRoute = ({ params }) => {
  const i = Number(params.index);
  const slice = pairs.slice(i * CHUNK, (i + 1) * CHUNK);
  const urls = slice.map(p =>
    `<url><loc>${SITE}/distance/${p}/</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>`
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
