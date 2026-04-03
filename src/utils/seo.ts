/** SEO utilities: title, meta, canonical, JSON-LD */
import { canonicalPairKey } from './slug';

const SITE = 'https://distancefrom.co';
const YEAR = new Date().getFullYear();

export function distancePageTitle(cityA: string, cityB: string, miles: number, driveTime: string, typeA?: string, typeB?: string): string {
  const hasNP = typeA === 'national-park' || typeB === 'national-park';
  const keyInfo = hasNP ? 'Route & Best Stops' : `${driveTime} Drive • ${Math.round(miles)} miles`;
  return `${cityA} to ${cityB}: ${keyInfo} • Road Trip Guide (${YEAR})`;
}

export function distancePageDescription(
  cityA: string, cityB: string,
  miles: number, km: number,
  driveTime: string, flightTime: string,
  fuelCost: string,
): string {
  return `Plan your ${cityA} to ${cityB} road trip: ${driveTime} drive • ${Math.round(miles)} miles • Est. fuel ${fuelCost}. Discover hidden gems & where to stop halfway.`;
}

export function canonicalUrl(slugA: string, slugB: string): string {
  const key = canonicalPairKey(slugA, slugB);
  return `${SITE}/distance/${key}/`;
}

export function cityHubUrl(slug: string): string {
  return `${SITE}/city/${slug}/`;
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
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
        { '@type': 'ListItem', position: 2, name: `Distances from ${cityA}`, item: cityHubUrl(slugA) },
        { '@type': 'ListItem', position: 3, name: `${cityA} to ${cityB}` },
      ],
    },
  };
}
