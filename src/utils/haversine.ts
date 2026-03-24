/** Haversine distance between two lat/lng points */
const R_KM = 6371;
const KM_TO_MILES = 0.621371;

export interface DistanceResult {
  km: number;
  miles: number;
}

export function haversine(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): DistanceResult {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const km = Math.round(R_KM * c * 10) / 10;
  return { km, miles: Math.round(km * KM_TO_MILES * 10) / 10 };
}
