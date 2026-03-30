import type { City } from '../data/types';
import { canonicalPairKey } from './slug';

type CityRecord = Record<string, City>;

interface CityIdentityIndex {
  canonicalSlugBySlug: Record<string, string>;
  canonicalSlugs: string[];
  canonicalNameCounts: Record<string, number>;
  qualifiedLabelCounts: Record<string, number>;
  typedLabelCounts: Record<string, number>;
}

const indexCache = new WeakMap<object, CityIdentityIndex>();

function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

function exactPlaceKey(city: City): string {
  return [
    nameKey(city.name),
    city.state ?? '',
    city.countryName,
    String(city.lat),
    String(city.lng),
  ].join('|');
}

function pickCanonicalSlug(slugs: string[]): string {
  return [...slugs].sort((a, b) => a.length - b.length || a.localeCompare(b))[0];
}

function buildCityIdentityIndex(cities: CityRecord): CityIdentityIndex {
  const cached = indexCache.get(cities);
  if (cached) {
    return cached;
  }

  const exactPlaceGroups: Record<string, string[]> = {};
  for (const slug of Object.keys(cities)) {
    const key = exactPlaceKey(cities[slug]);
    exactPlaceGroups[key] ??= [];
    exactPlaceGroups[key].push(slug);
  }

  const canonicalSlugBySlug: Record<string, string> = {};
  for (const slugs of Object.values(exactPlaceGroups)) {
    const canonicalSlug = pickCanonicalSlug(slugs);
    for (const slug of slugs) {
      canonicalSlugBySlug[slug] = canonicalSlug;
    }
  }

  const canonicalSlugs = Object.keys(cities)
    .filter((slug) => canonicalSlugBySlug[slug] === slug)
    .sort((a, b) => a.localeCompare(b));

  const canonicalNameCounts: Record<string, number> = {};
  for (const slug of canonicalSlugs) {
    const key = nameKey(cities[slug].name);
    canonicalNameCounts[key] = (canonicalNameCounts[key] ?? 0) + 1;
  }

  const qualifiedLabelCounts: Record<string, number> = {};
  const typedLabelCounts: Record<string, number> = {};
  for (const slug of canonicalSlugs) {
    const city = cities[slug];
    const qualifiedLabelKey = nameKey(`${city.name}, ${cityQualifier(city)}`);
    qualifiedLabelCounts[qualifiedLabelKey] = (qualifiedLabelCounts[qualifiedLabelKey] ?? 0) + 1;

    const typedLabelKey = nameKey(`${city.name}, ${cityQualifier(city)} (${cityTypeLabel(city.type)})`);
    typedLabelCounts[typedLabelKey] = (typedLabelCounts[typedLabelKey] ?? 0) + 1;
  }

  const index = {
    canonicalSlugBySlug,
    canonicalSlugs,
    canonicalNameCounts,
    qualifiedLabelCounts,
    typedLabelCounts,
  };
  indexCache.set(cities, index);
  return index;
}

function cityQualifier(city: City): string {
  if (city.state) {
    return city.countryName === 'United States' ? city.state : `${city.state}, ${city.countryName}`;
  }
  return city.countryName;
}

function cityTypeLabel(type: City['type']): string {
  return type
    .split('-')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

export function getCanonicalCitySlug(slug: string, cities: CityRecord): string {
  const index = buildCityIdentityIndex(cities);
  return index.canonicalSlugBySlug[slug] ?? slug;
}

export function getCanonicalCitySlugs(cities: CityRecord): string[] {
  return buildCityIdentityIndex(cities).canonicalSlugs;
}

export function getCanonicalCities(cities: CityRecord): CityRecord {
  return Object.fromEntries(getCanonicalCitySlugs(cities).map((slug) => [slug, cities[slug]]));
}

export function getDisplayCityName(slug: string, city: City, cities: CityRecord, options?: { forceQualifier?: boolean }): string {
  const index = buildCityIdentityIndex(cities);
  const needsQualifier = options?.forceQualifier || (index.canonicalNameCounts[nameKey(city.name)] ?? 0) > 1;
  if (!needsQualifier) {
    return city.name;
  }

  const qualifiedLabel = `${city.name}, ${cityQualifier(city)}`;
  if ((index.qualifiedLabelCounts[nameKey(qualifiedLabel)] ?? 0) <= 1) {
    return qualifiedLabel;
  }

  const typedLabel = `${qualifiedLabel} (${cityTypeLabel(city.type)})`;
  if ((index.typedLabelCounts[nameKey(typedLabel)] ?? 0) <= 1) {
    return typedLabel;
  }

  return `${typedLabel} [${slug}]`;
}

export function getIndexableDistancePairs(routeData: Record<string, unknown>, cities: CityRecord): string[] {
  const pairs = new Set<string>();

  for (const rawPair of Object.keys(routeData)) {
    const [rawA, rawB] = rawPair.split('-to-');
    if (!rawA || !rawB) {
      continue;
    }

    const slugA = getCanonicalCitySlug(rawA, cities);
    const slugB = getCanonicalCitySlug(rawB, cities);
    if (!cities[slugA] || !cities[slugB] || slugA === slugB) {
      continue;
    }

    pairs.add(canonicalPairKey(slugA, slugB));
  }

  return [...pairs].sort((a, b) => a.localeCompare(b));
}
