import { defineMiddleware } from 'astro:middleware';
import { getPrimaryRedirectUrl, shouldRedirectToPrimaryUrl } from './utils/site';

const HTML_CACHE_SECONDS = 7 * 24 * 60 * 60;
const HTML_CACHE_STALE_SECONDS = 24 * 60 * 60;
const CACHEABLE_HTML_PATHS = /^\/(?:city|distance)\//;

type CloudflareCacheStorage = CacheStorage & { default?: Cache };

function getEdgeCache(): Cache | undefined {
  if (!('caches' in globalThis)) {
    return undefined;
  }

  return (globalThis.caches as CloudflareCacheStorage).default;
}

function isCacheableHtmlRequest(request: Request, url: URL): boolean {
  return (
    request.method === 'GET' &&
    CACHEABLE_HTML_PATHS.test(url.pathname) &&
    !url.search &&
    !request.headers.has('authorization')
  );
}

function withHtmlCacheHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  const robots = headers.get('X-Robots-Tag') ?? '';
  const maxAge = robots.toLowerCase().includes('noindex') ? 3600 : HTML_CACHE_SECONDS;

  headers.set('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${HTML_CACHE_STALE_SECONDS}`);
  headers.set('Vary', 'Accept-Encoding');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const onRequest = defineMiddleware(async (context, next) => {
  const requestUrl = new URL(context.request.url);

  if (shouldRedirectToPrimaryUrl(requestUrl)) {
    return Response.redirect(getPrimaryRedirectUrl(requestUrl), 301);
  }

  if (!isCacheableHtmlRequest(context.request, requestUrl)) {
    return next();
  }

  const cache = getEdgeCache();
  if (!cache) {
    const response = await next();
    const contentType = response.headers.get('Content-Type') ?? '';
    return response.ok && contentType.includes('text/html') ? withHtmlCacheHeaders(response) : response;
  }

  const cacheKey = new Request(requestUrl.toString(), context.request);
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await next();
  const contentType = response.headers.get('Content-Type') ?? '';
  if (!response.ok || !contentType.includes('text/html')) {
    return response;
  }

  const cacheableResponse = withHtmlCacheHeaders(response);
  const cachePut = cache.put(cacheKey, cacheableResponse.clone()).catch(() => undefined);
  const locals = context.locals as { cfContext?: { ctx?: { waitUntil?: (promise: Promise<unknown>) => void } } };

  if (locals.cfContext?.ctx?.waitUntil) {
    locals.cfContext.ctx.waitUntil(cachePut);
  }

  return cacheableResponse;
});
