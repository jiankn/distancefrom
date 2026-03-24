/** Driving distance/time: OSRM data first, Haversine estimate fallback */
import { canonicalPairKey } from './slug';

export interface DriveEstimate {
  distanceKm: number;
  distanceMiles: number;
  durationMin: number;
  formatted: string;
  source: 'osrm' | 'estimated';
  drivable: boolean;
}

const KM_TO_MILES = 0.621371;
const AVG_SPEED_KMH = 80;

// Route data loaded at build time
let routeData: Record<string, { drivingDistanceKm: number; drivingDistanceMiles: number; drivingDurationMin: number }> = {};

export function setRouteData(data: typeof routeData) {
  routeData = data;
}

/** Check if two cities are likely on different continents / across ocean */
function isCrossOcean(lat1: number, lng1: number, lat2: number, lng2: number): boolean {
  // Simple heuristic: if longitude difference > 40° and one is in Americas, other in Europe/Asia
  const inAmericas = (lng: number) => lng < -30;
  const inEuroAsia = (lng: number) => lng > -30 && lng < 150;
  const inOceania = (lng: number) => lng >= 150;
  if (inAmericas(lng1) && (inEuroAsia(lng2) || inOceania(lng2))) return true;
  if (inAmericas(lng2) && (inEuroAsia(lng1) || inOceania(lng1))) return true;
  if (inEuroAsia(lng1) && inOceania(lng2)) return false; // connected by land
  if (inEuroAsia(lng2) && inOceania(lng1)) return false;
  return false;
}

export function driveEstimate(
  slugA: string, slugB: string,
  straightLineKm: number,
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): DriveEstimate {
  // Check OSRM data first
  const key = canonicalPairKey(slugA, slugB);
  const osrm = routeData[key];
  if (osrm) {
    const h = Math.floor(osrm.drivingDurationMin / 60);
    const m = osrm.drivingDurationMin % 60;
    return {
      distanceKm: osrm.drivingDistanceKm,
      distanceMiles: osrm.drivingDistanceMiles,
      durationMin: osrm.drivingDurationMin,
      formatted: h > 0 ? `${h}h ${m}min` : `${m}min`,
      source: 'osrm',
      drivable: true,
    };
  }

  // Cross-ocean check
  if (isCrossOcean(lat1, lng1, lat2, lng2)) {
    return {
      distanceKm: 0, distanceMiles: 0, durationMin: 0,
      formatted: 'Not drivable',
      source: 'estimated', drivable: false,
    };
  }

  // Haversine × coefficient fallback
  const coeff = straightLineKm < 100 ? 1.3 : straightLineKm < 500 ? 1.25 : 1.2;
  const km = Math.round(straightLineKm * coeff * 10) / 10;
  const miles = Math.round(km * KM_TO_MILES * 10) / 10;
  const min = Math.round((km / AVG_SPEED_KMH) * 60);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return {
    distanceKm: km, distanceMiles: miles, durationMin: min,
    formatted: h > 0 ? `${h}h ${m}min` : `${m}min`,
    source: 'estimated', drivable: true,
  };
}
