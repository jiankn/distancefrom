/**
 * OSRM Tiered Route Fetcher
 * 
 * Tier 2: Each new city × Top 50 same-country cities
 * Fetches real driving distances from the public OSRM API.
 * 
 * Features:
 * - Respects OSRM rate limit (5 req/s)
 * - Resume support (reads existing route-data.json)
 * - Progress logging every 50 routes
 * - Auto-save checkpoint every 200 routes
 * 
 * Usage: npx tsx scripts/fetch-osrm-tiered.ts
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(import.meta.dirname ?? '.', '..', 'src', 'data');
const OUTPUT_FILE = join(DATA_DIR, 'route-data.json');
const KM_TO_MILES = 0.621371;
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';
const RATE_LIMIT_MS = 220; // ~4.5 req/s, slightly conservative

interface City {
  name: string; country: string; lat: number; lng: number;
  population: number; type?: string;
}
interface RouteResult {
  drivingDistanceKm: number;
  drivingDistanceMiles: number;
  drivingDurationMin: number;
}

// Countries where driving between cities makes sense
const DRIVABLE_COUNTRIES = ['US', 'CA', 'GB', 'AU', 'NZ',
  'DE', 'FR', 'IT', 'ES', 'NL', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI',
  'IE', 'PT', 'PL', 'CZ', 'HU', 'HR', 'SI', 'GR', 'BE',
  'JP', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE',
  'IN', 'ZA', 'MA', 'EG', 'KE',
  'TH', 'VN', 'MY', 'KH',
];

// Island countries where OSRM won't work cross-water
const ISLAND_TYPES = ['island'];

function canonicalKey(a: string, b: string): string {
  return a < b ? `${a}-to-${b}` : `${b}-to-${a}`;
}

function haversineDist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchRoute(lat1: number, lng1: number, lat2: number, lng2: number, retries = 3): Promise<RouteResult | null | '429'> {
  const url = `${OSRM_BASE}/${lng1},${lat1};${lng2},${lat2}?overview=false`;
  try {
    const res = await fetch(url);
    if (res.status === 429) return '429';
    if (!res.ok) return null;
    const data = await res.json() as any;
    if (data.code !== 'Ok' || !data.routes?.length) return null;
    const route = data.routes[0];
    const km = Math.round(route.distance / 100) / 10;
    return {
      drivingDistanceKm: km,
      drivingDistanceMiles: Math.round(km * KM_TO_MILES * 10) / 10,
      drivingDurationMin: Math.round(route.duration / 60),
    };
  } catch (err) { 
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000));
      return fetchRoute(lat1, lng1, lat2, lng2, retries - 1);
    }
    return null; 
  }
}

async function main() {
  const cities: Record<string, City> = JSON.parse(readFileSync(join(DATA_DIR, 'cities.json'), 'utf-8'));

  // Load existing route data (for resume)
  let results: Record<string, RouteResult> = {};
  if (existsSync(OUTPUT_FILE)) {
    results = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'));
    console.log(`Loaded ${Object.keys(results).length} existing routes (resume mode)`);
  }

  // Group cities by country
  const byCountry: Record<string, [string, City][]> = {};
  for (const [slug, city] of Object.entries(cities)) {
    if (!byCountry[city.country]) byCountry[city.country] = [];
    byCountry[city.country].push([slug, city]);
  }

  // For each target country, sort by population and pick top 50
  const TOP_N = 50;
  const pairs: [string, City, string, City][] = [];

  for (const country of Object.keys(byCountry)) {
    if (!DRIVABLE_COUNTRIES.includes(country)) continue;

    const countryCities = byCountry[country].sort(([, a], [, b]) => b.population - a.population);
    const top50 = countryCities.slice(0, TOP_N);
    const rest = countryCities.slice(TOP_N);

    // Each non-top-50 city × each top-50 city
    for (const [slugA, cityA] of rest) {
      if (ISLAND_TYPES.includes(cityA.type ?? '')) continue;
      for (const [slugB, cityB] of top50) {
        if (ISLAND_TYPES.includes(cityB.type ?? '')) continue;
        if (slugA === slugB) continue;
        const key = canonicalKey(slugA, slugB);
        if (results[key]) continue;
        const dist = haversineDist(cityA.lat, cityA.lng, cityB.lat, cityB.lng);
        if (dist > 3000) continue;
        pairs.push([slugA, cityA, slugB, cityB]);
      }
    }

    // Also: top50 internal pairs
    for (let i = 0; i < top50.length; i++) {
      for (let j = i + 1; j < top50.length; j++) {
        const [slugA, cityA] = top50[i];
        const [slugB, cityB] = top50[j];
        const key = canonicalKey(slugA, slugB);
        if (results[key]) continue;
        if (ISLAND_TYPES.includes(cityA.type ?? '') || ISLAND_TYPES.includes(cityB.type ?? '')) continue;
        const dist = haversineDist(cityA.lat, cityA.lng, cityB.lat, cityB.lng);
        if (dist > 3000) continue;
        pairs.push([slugA, cityA, slugB, cityB]);
      }
    }
  }

  console.log(`\nPairs to fetch: ${pairs.length}`);

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  const startTime = Date.now();

  const CONCURRENCY = 4;
  const BATCH_SIZE = 50; // Logging / saving checkpoint size

  console.log(`Using concurrency: ${CONCURRENCY}`);

  // We process in chunks to easily save checkpoints
  for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
    const chunk = pairs.slice(i, i + BATCH_SIZE);
    
    // Process chunk concurrently using a simple queue
    let queueIdx = 0;
    const workers = Array.from({ length: CONCURRENCY }).map(async () => {
      while (queueIdx < chunk.length) {
        const idx = queueIdx++;
        const [slugA, cityA, slugB, cityB] = chunk[idx];
        const key = canonicalKey(slugA, slugB);
        if (results[key]) continue;

        let route: RouteResult | null | '429' = '429';
        let backoff = 1000;
        
        while (route === '429') {
          route = await fetchRoute(cityA.lat, cityA.lng, cityB.lat, cityB.lng);
          if (route === '429') {
            console.log(`[429] Rate limited. Backing off for ${backoff}ms...`);
            await new Promise(r => setTimeout(r, backoff));
            backoff = Math.min(backoff * 2, 10000); // max 10s backoff
          }
        }

        if (route) {
          results[key] = route;
          succeeded++;
        } else {
          failed++;
        }
        processed++;
      }
    });

    await Promise.all(workers);

    const elapsed = (Date.now() - startTime) / 1000;
    const rate = processed / elapsed;
    const remaining = (pairs.length - processed) / rate;
    console.log(
      `[${processed}/${pairs.length}] ` +
      `✓${succeeded} ✗${failed} | ` +
      `${rate.toFixed(1)} req/s | ` +
      `ETA: ${Math.round(remaining / 60)}m`
    );

    writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  }

  const totalTime = Math.round((Date.now() - startTime) / 1000 / 60);
  console.log(`\n✅ Done in ${totalTime} minutes!`);
  console.log(`   Total routes: ${Object.keys(results).length}`);
  console.log(`   New: ${succeeded} succeeded, ${failed} failed`);
}

main();
