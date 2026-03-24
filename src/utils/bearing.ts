/** Calculate compass bearing from point A to point B */
const DIRECTIONS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'] as const;

export interface BearingResult {
  degrees: number;
  direction: string;
}

export function bearing(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): BearingResult {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  const deg = (toDeg(Math.atan2(y, x)) + 360) % 360;
  const idx = Math.round(deg / 22.5) % 16;
  return { degrees: Math.round(deg), direction: DIRECTIONS[idx] };
}
