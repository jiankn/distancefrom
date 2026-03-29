export type PlaceType = 'city' | 'town' | 'national-park' | 'resort' | 'landmark' | 'island';

export interface City {
  name: string;
  country: string;
  countryName: string;
  state?: string;
  region?: string;
  lat: number;
  lng: number;
  timezone: string;
  population: number;
  elevation: number;
  nearby: string[];
  type?: PlaceType;
  description?: string;
  aliases?: string[];
  iataCode?: string;
  nearestAirport?: string;
  tags?: string[];
}

export interface RouteData {
  drivingDistanceKm: number;
  drivingDistanceMiles: number;
  drivingDurationMin: number;
  source: 'osrm';
}
