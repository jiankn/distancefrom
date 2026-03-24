/** Find cities near the great-circle path between two points */
import type { City } from '../data/types';

export interface MidwayStop {
  slug: string;
  name: string;
  country: string;
  distanceFromA_km: number;
  distanceFromLine_km: number;
}

const R_KM = 6371;
const toRad = (d: number) => (d * Math.PI) / 180;

/** Distance from point P to the great-circle line A→B (simplified planar approx for < 2000km) */
function pointToLineDistance(
  pLat: number, pLng: number,
  aLat: number, aLng: number,
  bLat: number, bLng: number,
): number {
  // Use cross-track distance formula for short-medium distances
  const dAP = haversineDist(aLat, aLng, pLat, pLng);
  const bearingAP = bearingRad(aLat, aLng, pLat, pLng);
  const bearingAB = bearingRad(aLat, aLng, bLat, bLng);
  return Math.abs(Math.asin(Math.sin(dAP / R_KM) * Math.sin(bearingAP - bearingAB)) * R_KM);
}

function haversineDist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearingRad(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return Math.atan2(y, x);
}

/** Along-track distance: how far along A→B is the closest point to P */
function alongTrackDistance(
  aLat: number, aLng: number,
  bLat: number, bLng: number,
  pLat: number, pLng: number,
): number {
  const dAP = haversineDist(aLat, aLng, pLat, pLng);
  const crossTrack = pointToLineDistance(pLat, pLng, aLat, aLng, bLat, bLng);
  return Math.acos(Math.cos(dAP / R_KM) / Math.cos(crossTrack / R_KM)) * R_KM;
}

export function findMidwayStops(
  aSlug: string, aLat: number, aLng: number,
  bSlug: string, bLat: number, bLng: number,
  cities: Record<string, City>,
  maxOffRoute_km = 50,
  limit = 5,
): MidwayStop[] {
  const totalDist = haversineDist(aLat, aLng, bLat, bLng);
  const candidates: MidwayStop[] = [];

  for (const [slug, city] of Object.entries(cities)) {
    if (slug === aSlug || slug === bSlug) continue;
    const distFromLine = pointToLineDistance(city.lat, city.lng, aLat, aLng, bLat, bLng);
    if (distFromLine > maxOffRoute_km) continue;

    const distFromA = haversineDist(aLat, aLng, city.lat, city.lng);
    // Must be between A and B (not behind A or past B)
    if (distFromA < totalDist * 0.1 || distFromA > totalDist * 0.9) continue;

    candidates.push({
      slug,
      name: city.name,
      country: city.country,
      distanceFromA_km: Math.round(distFromA),
      distanceFromLine_km: Math.round(distFromLine),
    });
  }

  // Sort by population (prefer larger cities), then by distance from line
  return candidates
    .sort((a, b) => {
      const popA = cities[a.slug]?.population ?? 0;
      const popB = cities[b.slug]?.population ?? 0;
      return popB - popA;
    })
    .slice(0, limit);
}
