import { defineMiddleware } from 'astro:middleware';
import { getPrimaryRedirectUrl, shouldRedirectToPrimaryUrl } from './utils/site';

export const onRequest = defineMiddleware((context, next) => {
  const requestUrl = new URL(context.request.url);

  if (shouldRedirectToPrimaryUrl(requestUrl)) {
    return Response.redirect(getPrimaryRedirectUrl(requestUrl), 301);
  }

  return next();
});
