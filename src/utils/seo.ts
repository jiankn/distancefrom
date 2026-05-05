/** SEO utilities: title, meta, canonical, JSON-LD */
import { canonicalPairKey } from './slug';
import { SITE_URL } from './site';

export function distancePageTitle(cityA: string, cityB: string, miles: number, driveTime: string, typeA?: string, typeB?: string): string {
  const hasNP = typeA === 'national-park' || typeB === 'national-park';
  const keyInfo = hasNP
    ? 'Route & Stop Ideas'
    : driveTime === 'Not drivable'
      ? `${Math.round(miles)} miles`
      : `${driveTime} Drive - ${Math.round(miles)} miles`;
  return `${cityA} to ${cityB}: ${keyInfo} | Distance & Route`;
}

export function distancePageDescription(
  cityA: string, cityB: string,
  miles: number, km: number,
  driveTime: string, flightTime: string,
  fuelCost: string,
): string {
  if (driveTime === 'Not drivable') {
    return `Find the distance from ${cityA} to ${cityB}: ${Math.round(miles)} miles (${Math.round(km)} km). Compare straight-line distance, flight time, and travel context.`;
  }

  return `Plan your ${cityA} to ${cityB} trip: ${driveTime} drive, ${Math.round(miles)} miles, estimated fuel ${fuelCost}. Compare driving, flying, and midway stop options.`;
}

export function canonicalUrl(slugA: string, slugB: string): string {
  const key = canonicalPairKey(slugA, slugB);
  return `${SITE_URL}/distance/${key}/`;
}

export function cityHubUrl(slug: string): string {
  return `${SITE_URL}/city/${slug}/`;
}

export function distanceJsonLd(
  cityA: string, cityB: string,
  slugA: string,
  miles: number, km: number,
  url: string,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Distance from ${cityA} to ${cityB}`,
    description: `The distance from ${cityA} to ${cityB} is ${miles} miles (${km} km).`,
    url,
    mainEntity: {
      '@type': 'Distance',
      name: `${cityA} to ${cityB}`,
      value: `${miles} miles`,
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: `Distances from ${cityA}`, item: cityHubUrl(slugA) },
        { '@type': 'ListItem', position: 3, name: `${cityA} to ${cityB}` },
      ],
    },
  };
}
