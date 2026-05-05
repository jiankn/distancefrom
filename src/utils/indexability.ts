import type { City, PlaceType } from '../data/types';
import { haversine } from './haversine';
import { canonicalPairKey } from './slug';
import { getCanonicalCitySlug, getCanonicalCitySlugs } from './city-identity';

type CityRecord = Record<string, City>;
type RouteDataRecord = Record<string, unknown>;

const SPECIAL_TYPES = new Set<PlaceType>(['national-park', 'resort', 'island', 'landmark']);
const MIN_CITY_POPULATION = 100_000;
const MIN_SMALL_HUB_POPULATION = 25_000;
const MIN_SMALL_HUB_NEARBY = 6;
const MIN_SMALL_HUB_DESCRIPTION = 40;
const MIN_DOMESTIC_DISTANCE_MILES = 400;
const MIN_CROSS_BORDER_DISTANCE_MILES = 350;
const MIN_MEGA_CITY_POPULATION = 1_000_000;
const MIN_MAJOR_CITY_POPULATION = 500_000;
const MIN_CROSS_BORDER_CITY_POPULATION = 250_000;
const MIN_DOMESTIC_CITY_POPULATION = 50_000;
const MIN_SPECIAL_ROUTE_DISTANCE_MILES = 300;

const routePairCache = new WeakMap<object, Set<string>>();

function isSpecialDestination(city: City): boolean {
  return Boolean(city.type && SPECIAL_TYPES.has(city.type));
}

function descriptionLength(city: City): number {
  return city.description?.trim().length ?? 0;
}

function nearbyCanonicalSlugs(slug: string, cities: CityRecord): Set<string> {
  return new Set((cities[slug]?.nearby ?? []).map((candidate) => getCanonicalCitySlug(candidate, cities)));
}

function buildRoutePairSet(routeData: RouteDataRecord, cities: CityRecord): Set<string> {
  const cached = routePairCache.get(routeData);
  if (cached) {
    return cached;
  }

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

  routePairCache.set(routeData, pairs);
  return pairs;
}

export function isIndexableCitySlug(slug: string, cities: CityRecord): boolean {
  const canonicalSlug = getCanonicalCitySlug(slug, cities);
  const city = cities[canonicalSlug];
  if (!city) {
    return false;
  }

  const population = city.population ?? 0;
  const nearbyCount = city.nearby?.length ?? 0;

  return (
    population >= MIN_CITY_POPULATION ||
    isSpecialDestination(city) ||
    (
      population >= MIN_SMALL_HUB_POPULATION &&
      nearbyCount >= MIN_SMALL_HUB_NEARBY &&
      descriptionLength(city) >= MIN_SMALL_HUB_DESCRIPTION
    )
  );
}

export function getIndexableCitySlugs(cities: CityRecord): string[] {
  return getCanonicalCitySlugs(cities).filter((slug) => isIndexableCitySlug(slug, cities));
}

export function isNearbyPair(slugA: string, slugB: string, cities: CityRecord): boolean {
  const canonicalA = getCanonicalCitySlug(slugA, cities);
  const canonicalB = getCanonicalCitySlug(slugB, cities);
  if (!cities[canonicalA] || !cities[canonicalB]) {
    return false;
  }

  return nearbyCanonicalSlugs(canonicalA, cities).has(canonicalB) || nearbyCanonicalSlugs(canonicalB, cities).has(canonicalA);
}

export interface DistanceIndexabilityInput {
  slugA: string;
  slugB: string;
  cities: CityRecord;
  hasRouteData: boolean;
  distanceMiles?: number;
}

export function isIndexableDistancePair(input: DistanceIndexabilityInput): boolean {
  const slugA = getCanonicalCitySlug(input.slugA, input.cities);
  const slugB = getCanonicalCitySlug(input.slugB, input.cities);
  const cityA = input.cities[slugA];
  const cityB = input.cities[slugB];

  if (!cityA || !cityB || slugA === slugB) {
    return false;
  }

  if (!isIndexableCitySlug(slugA, input.cities) || !isIndexableCitySlug(slugB, input.cities)) {
    return false;
  }

  const distanceMiles = input.distanceMiles ?? haversine(cityA.lat, cityA.lng, cityB.lat, cityB.lng).miles;
  const sameCountry = cityA.country === cityB.country;
  const populationA = cityA.population ?? 0;
  const populationB = cityB.population ?? 0;
  const hasSpecialDestination = isSpecialDestination(cityA) || isSpecialDestination(cityB);

  return (
    isNearbyPair(slugA, slugB, input.cities) ||
    (
      sameCountry &&
      distanceMiles <= MIN_DOMESTIC_DISTANCE_MILES &&
      (populationA >= MIN_DOMESTIC_CITY_POPULATION || populationB >= MIN_DOMESTIC_CITY_POPULATION)
    ) ||
    (
      sameCountry &&
      populationA >= MIN_MAJOR_CITY_POPULATION &&
      populationB >= MIN_MAJOR_CITY_POPULATION
    ) ||
    (
      input.hasRouteData &&
      !sameCountry &&
      distanceMiles <= MIN_CROSS_BORDER_DISTANCE_MILES &&
      populationA >= MIN_CROSS_BORDER_CITY_POPULATION &&
      populationB >= MIN_CROSS_BORDER_CITY_POPULATION
    ) ||
    (
      input.hasRouteData &&
      hasSpecialDestination &&
      distanceMiles <= MIN_SPECIAL_ROUTE_DISTANCE_MILES
    ) ||
    (
      input.hasRouteData &&
      populationA >= MIN_MEGA_CITY_POPULATION &&
      populationB >= MIN_MEGA_CITY_POPULATION &&
      distanceMiles <= 1200
    )
  );
}

export function couldBeIndexableDistancePairWithRouteData(input: Omit<DistanceIndexabilityInput, 'hasRouteData'>): boolean {
  const slugA = getCanonicalCitySlug(input.slugA, input.cities);
  const slugB = getCanonicalCitySlug(input.slugB, input.cities);
  const cityA = input.cities[slugA];
  const cityB = input.cities[slugB];

  if (!cityA || !cityB || slugA === slugB) {
    return false;
  }

  if (!isIndexableCitySlug(slugA, input.cities) || !isIndexableCitySlug(slugB, input.cities)) {
    return false;
  }

  const distanceMiles = input.distanceMiles ?? haversine(cityA.lat, cityA.lng, cityB.lat, cityB.lng).miles;
  const sameCountry = cityA.country === cityB.country;
  const populationA = cityA.population ?? 0;
  const populationB = cityB.population ?? 0;
  const hasSpecialDestination = isSpecialDestination(cityA) || isSpecialDestination(cityB);

  return (
    isIndexableDistancePair({ slugA, slugB, cities: input.cities, hasRouteData: false, distanceMiles }) ||
    (
      !sameCountry &&
      distanceMiles <= MIN_CROSS_BORDER_DISTANCE_MILES &&
      populationA >= MIN_CROSS_BORDER_CITY_POPULATION &&
      populationB >= MIN_CROSS_BORDER_CITY_POPULATION
    ) ||
    (
      hasSpecialDestination &&
      distanceMiles <= MIN_SPECIAL_ROUTE_DISTANCE_MILES
    ) ||
    (
      populationA >= MIN_MEGA_CITY_POPULATION &&
      populationB >= MIN_MEGA_CITY_POPULATION &&
      distanceMiles <= 1200
    )
  );
}

export function getIndexableDistancePriority(input: DistanceIndexabilityInput): string {
  const slugA = getCanonicalCitySlug(input.slugA, input.cities);
  const slugB = getCanonicalCitySlug(input.slugB, input.cities);
  const cityA = input.cities[slugA];
  const cityB = input.cities[slugB];
  const distanceMiles = input.distanceMiles ?? haversine(cityA.lat, cityA.lng, cityB.lat, cityB.lng).miles;
  const sameCountry = cityA.country === cityB.country;
  const populationA = cityA.population ?? 0;
  const populationB = cityB.population ?? 0;

  if (isNearbyPair(slugA, slugB, input.cities)) {
    return '0.9';
  }

  if (
    (sameCountry && distanceMiles <= 200) ||
    (!sameCountry && input.hasRouteData && distanceMiles <= 250)
  ) {
    return '0.8';
  }

  if (
    (sameCountry && populationA >= MIN_MAJOR_CITY_POPULATION && populationB >= MIN_MAJOR_CITY_POPULATION) ||
    (input.hasRouteData && populationA >= MIN_MEGA_CITY_POPULATION && populationB >= MIN_MEGA_CITY_POPULATION)
  ) {
    return '0.7';
  }

  return '0.5';
}

export function getIndexableDistancePairs(routeData: RouteDataRecord, cities: CityRecord): { pair: string; priority: string }[] {
  const routePairs = buildRoutePairSet(routeData, cities);
  const result: { pair: string; priority: string }[] = [];
  const added = new Set<string>();
  const indexableCities = getIndexableCitySlugs(cities);
  const indexableCitySet = new Set(indexableCities);

  const addPair = (slugA: string, slugB: string, hasRouteData: boolean) => {
    const canonicalA = getCanonicalCitySlug(slugA, cities);
    const canonicalB = getCanonicalCitySlug(slugB, cities);
    if (!indexableCitySet.has(canonicalA) || !indexableCitySet.has(canonicalB) || canonicalA === canonicalB) {
      return;
    }

    const pair = canonicalPairKey(canonicalA, canonicalB);
    if (added.has(pair)) {
      return;
    }

    const { miles } = haversine(cities[canonicalA].lat, cities[canonicalA].lng, cities[canonicalB].lat, cities[canonicalB].lng);
    if (!isIndexableDistancePair({ slugA: canonicalA, slugB: canonicalB, cities, hasRouteData, distanceMiles: miles })) {
      return;
    }

    added.add(pair);
    result.push({
      pair,
      priority: getIndexableDistancePriority({ slugA: canonicalA, slugB: canonicalB, cities, hasRouteData, distanceMiles: miles }),
    });
  };

  for (const pair of routePairs) {
    const [slugA, slugB] = pair.split('-to-');
    addPair(slugA, slugB, true);
  }

  for (const slugA of indexableCities) {
    for (const slugB of cities[slugA].nearby ?? []) {
      const canonicalB = getCanonicalCitySlug(slugB, cities);
      const pair = canonicalPairKey(slugA, canonicalB);
      addPair(slugA, canonicalB, routePairs.has(pair));
    }
  }

  const slugsByCountry: Record<string, string[]> = {};
  for (const slug of indexableCities) {
    const country = cities[slug].country;
    slugsByCountry[country] ??= [];
    slugsByCountry[country].push(slug);
  }

  for (const slugs of Object.values(slugsByCountry)) {
    const sorted = [...slugs].sort((a, b) => (cities[b].population ?? 0) - (cities[a].population ?? 0) || a.localeCompare(b));
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const pair = canonicalPairKey(sorted[i], sorted[j]);
        addPair(sorted[i], sorted[j], routePairs.has(pair));
      }
    }
  }

  return result.sort((a, b) => a.pair.localeCompare(b.pair));
}
