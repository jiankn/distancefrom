import type { APIRoute } from 'astro';
import citiesData from '../data/cities.json';

export const prerender = true;

const SITE = 'https://distancefrom.co';
const cities = Object.keys(citiesData);

// Calculate number of sitemap chunks (10,000 URLs per sitemap)
const CHUNK_SIZE = 10000;
const totalPairs = cities.length * (cities.length - 1) / 2;
const pairChunks = Math.ceil(totalPairs / CHUNK_SIZE);
const cityChunks = Math.ceil(cities.length / CHUNK_SIZE);

export const GET: APIRoute = () => {
  const sitemaps = [
    `<sitemap><loc>${SITE}/sitemap-static.xml</loc></sitemap>`,
    ...Array.from({ length: cityChunks }, (_, i) =>
      `<sitemap><loc>${SITE}/sitemap-cities-${i}.xml</loc></sitemap>`
    ),
    ...Array.from({ length: pairChunks }, (_, i) =>
      `<sitemap><loc>${SITE}/sitemap-distances-${i}.xml</loc></sitemap>`
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.join('\n')}
</sitemapindex>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
};
