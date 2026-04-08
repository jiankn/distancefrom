export const SITE_URL = 'https://distancefrom.co';
export const SITE_HOSTNAME = new URL(SITE_URL).hostname;

const WWW_SITE_HOSTNAME = `www.${SITE_HOSTNAME}`;

export function absoluteSiteUrl(pathname = '/'): string {
  return new URL(pathname, SITE_URL).toString();
}

export function shouldRedirectToPrimaryUrl(url: URL): boolean {
  return url.hostname === WWW_SITE_HOSTNAME || (url.hostname === SITE_HOSTNAME && url.protocol !== 'https:');
}

export function getPrimaryRedirectUrl(url: URL): string {
  const redirectUrl = new URL(url.toString());
  redirectUrl.protocol = 'https:';
  redirectUrl.hostname = SITE_HOSTNAME;
  redirectUrl.port = '';
  return redirectUrl.toString();
}
