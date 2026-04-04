import type { APIRoute } from 'astro';
import citiesData from '../data/cities.json';
import routeDataJson from '../data/route-data.json';
import { getIndexableCitySlugs, getIndexableDistancePairs } from '../utils/indexability';

export const prerender = true;

const SITE = 'https://distancefrom.co';
const cities = getIndexableCitySlugs(citiesData as Record<string, any>);
const indexablePairs = getIndexableDistancePairs(routeDataJson as Record<string, unknown>, citiesData as Record<string, any>);

// Keep distance sitemap files comfortably small for crawler reliability.
const CHUNK_SIZE = 5000;
const pairChunks = Math.ceil(indexablePairs.length / CHUNK_SIZE);
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
