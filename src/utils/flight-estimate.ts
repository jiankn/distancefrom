/** Estimate flight time based on straight-line distance */
const CRUISE_SPEED_KMH = 800;
const TAKEOFF_LANDING_MIN = 30;

export interface FlightEstimate {
  minutes: number;
  formatted: string;
  noDirectFlight: boolean;
}

export function flightEstimate(straightLineKm: number): FlightEstimate {
  const noDirectFlight = straightLineKm < 200;
  const minutes = Math.round((straightLineKm / CRUISE_SPEED_KMH) * 60 + TAKEOFF_LANDING_MIN);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const formatted = h > 0 ? `${h}h ${m}min` : `${m}min`;
  return { minutes, formatted, noDirectFlight };
}
