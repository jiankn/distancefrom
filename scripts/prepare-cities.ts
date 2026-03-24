/**
 * City data preparation script
 * 
 * For MVP: starts with a curated seed of top global cities.
 * For production: download GeoNames cities5000.zip and parse.
 * 
 * Usage: npx tsx scripts/prepare-cities.ts
 */
import { writeFileSync } from 'fs';
import { join } from 'path';

const OUTPUT = join(import.meta.dirname ?? '.', '..', 'src', 'data', 'cities.json');

// Seed data: Top 50 global cities by search relevance for distance queries
const SEED_CITIES = [
  { slug: "new-york", name: "New York", country: "US", countryName: "United States", state: "New York", lat: 40.7128, lng: -74.0060, timezone: "America/New_York", population: 8336817, elevation: 10 },
  { slug: "los-angeles", name: "Los Angeles", country: "US", countryName: "United States", state: "California", lat: 34.0522, lng: -118.2437, timezone: "America/Los_Angeles", population: 3979576, elevation: 71 },
  { slug: "chicago", name: "Chicago", country: "US", countryName: "United States", state: "Illinois", lat: 41.8781, lng: -87.6298, timezone: "America/Chicago", population: 2693976, elevation: 181 },
  { slug: "houston", name: "Houston", country: "US", countryName: "United States", state: "Texas", lat: 29.7604, lng: -95.3698, timezone: "America/Chicago", population: 2320268, elevation: 15 },
  { slug: "phoenix", name: "Phoenix", country: "US", countryName: "United States", state: "Arizona", lat: 33.4484, lng: -112.0740, timezone: "America/Phoenix", population: 1680992, elevation: 331 },
  { slug: "philadelphia", name: "Philadelphia", country: "US", countryName: "United States", state: "Pennsylvania", lat: 39.9526, lng: -75.1652, timezone: "America/New_York", population: 1603797, elevation: 12 },
  { slug: "san-antonio", name: "San Antonio", country: "US", countryName: "United States", state: "Texas", lat: 29.4241, lng: -98.4936, timezone: "America/Chicago", population: 1547253, elevation: 198 },
  { slug: "san-diego", name: "San Diego", country: "US", countryName: "United States", state: "California", lat: 32.7157, lng: -117.1611, timezone: "America/Los_Angeles", population: 1423851, elevation: 20 },
  { slug: "dallas", name: "Dallas", country: "US", countryName: "United States", state: "Texas", lat: 32.7767, lng: -96.7970, timezone: "America/Chicago", population: 1343573, elevation: 131 },
  { slug: "san-jose", name: "San Jose", country: "US", countryName: "United States", state: "California", lat: 37.3382, lng: -121.8863, timezone: "America/Los_Angeles", population: 1021795, elevation: 25 },
  { slug: "austin", name: "Austin", country: "US", countryName: "United States", state: "Texas", lat: 30.2672, lng: -97.7431, timezone: "America/Chicago", population: 978908, elevation: 149 },
  { slug: "san-francisco", name: "San Francisco", country: "US", countryName: "United States", state: "California", lat: 37.7749, lng: -122.4194, timezone: "America/Los_Angeles", population: 873965, elevation: 16 },
  { slug: "seattle", name: "Seattle", country: "US", countryName: "United States", state: "Washington", lat: 47.6062, lng: -122.3321, timezone: "America/Los_Angeles", population: 737015, elevation: 56 },
  { slug: "denver", name: "Denver", country: "US", countryName: "United States", state: "Colorado", lat: 39.7392, lng: -104.9903, timezone: "America/Denver", population: 715522, elevation: 1609 },
  { slug: "washington-dc", name: "Washington DC", country: "US", countryName: "United States", state: "District of Columbia", lat: 38.9072, lng: -77.0369, timezone: "America/New_York", population: 689545, elevation: 7 },
  { slug: "boston", name: "Boston", country: "US", countryName: "United States", state: "Massachusetts", lat: 42.3601, lng: -71.0589, timezone: "America/New_York", population: 692600, elevation: 43 },
  { slug: "las-vegas", name: "Las Vegas", country: "US", countryName: "United States", state: "Nevada", lat: 36.1699, lng: -115.1398, timezone: "America/Los_Angeles", population: 641903, elevation: 610 },
  { slug: "miami", name: "Miami", country: "US", countryName: "United States", state: "Florida", lat: 25.7617, lng: -80.1918, timezone: "America/New_York", population: 467963, elevation: 2 },
  { slug: "atlanta", name: "Atlanta", country: "US", countryName: "United States", state: "Georgia", lat: 33.7490, lng: -84.3880, timezone: "America/New_York", population: 498715, elevation: 320 },
  { slug: "detroit", name: "Detroit", country: "US", countryName: "United States", state: "Michigan", lat: 42.3314, lng: -83.0458, timezone: "America/Detroit", population: 639111, elevation: 183 },
  { slug: "london", name: "London", country: "GB", countryName: "United Kingdom", lat: 51.5074, lng: -0.1278, timezone: "Europe/London", population: 8982000, elevation: 11 },
  { slug: "paris", name: "Paris", country: "FR", countryName: "France", lat: 48.8566, lng: 2.3522, timezone: "Europe/Paris", population: 2161000, elevation: 35 },
  { slug: "berlin", name: "Berlin", country: "DE", countryName: "Germany", lat: 52.5200, lng: 13.4050, timezone: "Europe/Berlin", population: 3748148, elevation: 34 },
  { slug: "madrid", name: "Madrid", country: "ES", countryName: "Spain", lat: 40.4168, lng: -3.7038, timezone: "Europe/Madrid", population: 3223334, elevation: 667 },
  { slug: "rome", name: "Rome", country: "IT", countryName: "Italy", lat: 41.9028, lng: 12.4964, timezone: "Europe/Rome", population: 2873000, elevation: 21 },
  { slug: "tokyo", name: "Tokyo", country: "JP", countryName: "Japan", lat: 35.6762, lng: 139.6503, timezone: "Asia/Tokyo", population: 13960000, elevation: 40 },
  { slug: "sydney", name: "Sydney", country: "AU", countryName: "Australia", lat: -33.8688, lng: 151.2093, timezone: "Australia/Sydney", population: 5312000, elevation: 3 },
  { slug: "toronto", name: "Toronto", country: "CA", countryName: "Canada", lat: 43.6532, lng: -79.3832, timezone: "America/Toronto", population: 2731571, elevation: 76 },
  { slug: "mexico-city", name: "Mexico City", country: "MX", countryName: "Mexico", lat: 19.4326, lng: -99.1332, timezone: "America/Mexico_City", population: 9209944, elevation: 2240 },
  { slug: "mumbai", name: "Mumbai", country: "IN", countryName: "India", lat: 19.0760, lng: 72.8777, timezone: "Asia/Kolkata", population: 12442373, elevation: 14 },
  { slug: "sao-paulo", name: "São Paulo", country: "BR", countryName: "Brazil", lat: -23.5505, lng: -46.6333, timezone: "America/Sao_Paulo", population: 12325232, elevation: 760 },
  { slug: "beijing", name: "Beijing", country: "CN", countryName: "China", lat: 39.9042, lng: 116.4074, timezone: "Asia/Shanghai", population: 21540000, elevation: 43 },
  { slug: "shanghai", name: "Shanghai", country: "CN", countryName: "China", lat: 31.2304, lng: 121.4737, timezone: "Asia/Shanghai", population: 24870895, elevation: 4 },
  { slug: "dubai", name: "Dubai", country: "AE", countryName: "United Arab Emirates", lat: 25.2048, lng: 55.2708, timezone: "Asia/Dubai", population: 3331420, elevation: 5 },
  { slug: "singapore", name: "Singapore", country: "SG", countryName: "Singapore", lat: 1.3521, lng: 103.8198, timezone: "Asia/Singapore", population: 5850342, elevation: 15 },
  { slug: "bangkok", name: "Bangkok", country: "TH", countryName: "Thailand", lat: 13.7563, lng: 100.5018, timezone: "Asia/Bangkok", population: 10539000, elevation: 2 },
  { slug: "amsterdam", name: "Amsterdam", country: "NL", countryName: "Netherlands", lat: 52.3676, lng: 4.9041, timezone: "Europe/Amsterdam", population: 872680, elevation: -2 },
  { slug: "barcelona", name: "Barcelona", country: "ES", countryName: "Spain", lat: 41.3874, lng: 2.1686, timezone: "Europe/Madrid", population: 1620343, elevation: 12 },
  { slug: "portland", name: "Portland", country: "US", countryName: "United States", state: "Oregon", lat: 45.5152, lng: -122.6784, timezone: "America/Los_Angeles", population: 652503, elevation: 15 },
  { slug: "orlando", name: "Orlando", country: "US", countryName: "United States", state: "Florida", lat: 28.5383, lng: -81.3792, timezone: "America/New_York", population: 307573, elevation: 34 },
  { slug: "nashville", name: "Nashville", country: "US", countryName: "United States", state: "Tennessee", lat: 36.1627, lng: -86.7816, timezone: "America/Chicago", population: 689447, elevation: 182 },
  { slug: "new-orleans", name: "New Orleans", country: "US", countryName: "United States", state: "Louisiana", lat: 29.9511, lng: -90.0715, timezone: "America/Chicago", population: 383997, elevation: 1 },
  { slug: "minneapolis", name: "Minneapolis", country: "US", countryName: "United States", state: "Minnesota", lat: 44.9778, lng: -93.2650, timezone: "America/Chicago", population: 429954, elevation: 264 },
  { slug: "hartford", name: "Hartford", country: "US", countryName: "United States", state: "Connecticut", lat: 41.7658, lng: -72.6734, timezone: "America/New_York", population: 121054, elevation: 18 },
  { slug: "providence", name: "Providence", country: "US", countryName: "United States", state: "Rhode Island", lat: 41.8240, lng: -71.4128, timezone: "America/New_York", population: 190934, elevation: 23 },
  { slug: "new-haven", name: "New Haven", country: "US", countryName: "United States", state: "Connecticut", lat: 41.3083, lng: -72.9279, timezone: "America/New_York", population: 134023, elevation: 5 },
  { slug: "newark", name: "Newark", country: "US", countryName: "United States", state: "New Jersey", lat: 40.7357, lng: -74.1724, timezone: "America/New_York", population: 311549, elevation: 10 },
  { slug: "jersey-city", name: "Jersey City", country: "US", countryName: "United States", state: "New Jersey", lat: 40.7178, lng: -74.0431, timezone: "America/New_York", population: 292449, elevation: 7 },
];

// Build nearby cities (within 300km, sorted by distance)
function haversineDist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function main() {
  const cities: Record<string, any> = {};

  for (const c of SEED_CITIES) {
    cities[c.slug] = {
      name: c.name,
      country: c.country,
      countryName: c.countryName,
      ...(c.state ? { state: c.state } : {}),
      lat: c.lat,
      lng: c.lng,
      timezone: c.timezone,
      population: c.population,
      elevation: c.elevation,
      nearby: [] as string[],
    };
  }

  // Compute nearby for each city
  for (const c of SEED_CITIES) {
    const nearby = SEED_CITIES
      .filter(o => o.slug !== c.slug)
      .map(o => ({ slug: o.slug, dist: haversineDist(c.lat, c.lng, o.lat, o.lng) }))
      .filter(o => o.dist < 300)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 8)
      .map(o => o.slug);
    cities[c.slug].nearby = nearby;
  }

  writeFileSync(OUTPUT, JSON.stringify(cities, null, 2));
  console.log(`Wrote ${Object.keys(cities).length} cities to cities.json`);
}

main();
