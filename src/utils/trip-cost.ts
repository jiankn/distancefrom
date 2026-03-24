/** Estimate fuel cost for driving between two cities */

export interface FuelPrice {
  currency: string;
  pricePerLiter: number;
  unit: string;
  pricePerUnit: number;
}

export interface TripCost {
  fuelCostLow: number;
  fuelCostHigh: number;
  currency: string;
  formatted: string;
}

const DEFAULT_CONSUMPTION_L_PER_100KM = 8; // mid-size sedan
const EFFICIENT_L_PER_100KM = 6.5;
const DEFAULT_FUEL: FuelPrice = { currency: 'USD', pricePerLiter: 0.92, unit: 'gallon', pricePerUnit: 3.50 };

let fuelPrices: Record<string, FuelPrice> = {};

export function setFuelPrices(data: Record<string, FuelPrice>) {
  fuelPrices = data;
}

export function tripCost(drivingDistanceKm: number, countryA: string, countryB: string): TripCost {
  // Use the origin country's fuel price
  const fuel = fuelPrices[countryA] ?? fuelPrices[countryB] ?? DEFAULT_FUEL;
  const litersLow = (drivingDistanceKm / 100) * EFFICIENT_L_PER_100KM;
  const litersHigh = (drivingDistanceKm / 100) * DEFAULT_CONSUMPTION_L_PER_100KM;
  const low = Math.round(litersLow * fuel.pricePerLiter);
  const high = Math.round(litersHigh * fuel.pricePerLiter);
  const sym = fuel.currency === 'USD' ? '$' : fuel.currency === 'EUR' ? '€' : fuel.currency === 'GBP' ? '£' : fuel.currency + ' ';
  return {
    fuelCostLow: low,
    fuelCostHigh: high,
    currency: fuel.currency,
    formatted: `${sym}${low} - ${sym}${high}`,
  };
}
