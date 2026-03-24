export interface City {
  name: string;
  country: string;
  countryName: string;
  state?: string;
  lat: number;
  lng: number;
  timezone: string;
  population: number;
  elevation: number;
  nearby: string[];
}

export interface RouteData {
  drivingDistanceKm: number;
  drivingDistanceMiles: number;
  drivingDurationMin: number;
  source: 'osrm';
}
