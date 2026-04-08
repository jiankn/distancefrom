import type { APIRoute } from 'astro';
import { SITE_URL } from '../utils/site';

export const prerender = true;

export const GET: APIRoute = () => {
  const body = `User-agent: *
Allow: /
Sitemap: ${SITE_URL}/sitemap-index.xml
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
};
