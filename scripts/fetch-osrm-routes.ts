/**
 * OSRM Batch Route Pre-computation Script
 * 
 * Uses the public OSRM Demo API (router.project-osrm.org) to fetch
 * real driving distances and durations for top city pairs.
 * 
 * Rate limit: ~5 requests/second to be respectful.
 * For ~40K pairs, takes about 2-3 hours.
 * 
 * Usage: npx tsx scripts/fetch-osrm-routes.ts
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface City {
  name: string; country: string; lat: number; lng: number; population: number;
}

interface RouteResult {
  drivingDistanceKm: number;
  drivingDistanceMiles: number;
  drivingDurationMin: number;
}

const KM_TO_MILES = 0.621371;
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';
const RATE_LIMIT_MS = 200; // 5 req/s
const DATA_DIR = join(import.meta.dirname ?? '.', '..', 'src', 'data');
const OUTPUT_FILE = join(DATA_DIR, 'route-data.json');

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function canonicalKey(a: string, b: string): string {
  return a < b ? `${a}-to-${b}` : `${b}-to-${a}`;
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchRoute(lat1: number, lng1: number, lat2: number, lng2: number): Promise<RouteResult | null> {
  const url = `${OSRM_BASE}/${lng1},${lat1};${lng2},${lat2}?overview=false`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as any;
    if (data.code !== 'Ok' || !data.routes?.length) return null;
    const route = data.routes[0];
    const km = Math.round(route.distance / 100) / 10; // meters → km, 1 decimal
    return {
      drivingDistanceKm: km,
      drivingDistanceMiles: Math.round(km * KM_TO_MILES * 10) / 10,
      drivingDurationMin: Math.round(route.duration / 60),
    };
  } catch {
    return null;
  }
}

async function main() {
  const citiesPath = join(DATA_DIR, 'cities.json');
  if (!existsSync(citiesPath)) {
    console.error('cities.json not found. Run prepare-cities.ts first.');
    process.exit(1);
  }

  const cities: Record<string, City> = JSON.parse(readFileSync(citiesPath, 'utf-8'));

  // Sort by population, take top N
  const topN = parseInt(process.argv[2] ?? '200', 10);
  const sorted = Object.entries(cities)
    .sort(([, a], [, b]) => b.population - a.population)
    .slice(0, topN);

  console.log(`Processing top ${sorted.length} cities → ${sorted.length * (sorted.length - 1) / 2} pairs`);

  // Load existing data to support resume
  let results: Record<string, RouteResult> = {};
  if (existsSync(OUTPUT_FILE)) {
    results = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'));
    console.log(`Resuming: ${Object.keys(results).length} pairs already computed`);
  }

  let processed = 0;
  let skipped = 0;
  let failed = 0;
  const total = sorted.length * (sorted.length - 1) / 2;

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const [slugA, cityA] = sorted[i];
      const [slugB, cityB] = sorted[j];
      const key = canonicalKey(slugA, slugB);

      if (results[key]) { skipped++; continue; }

      const route = await fetchRoute(cityA.lat, cityA.lng, cityB.lat, cityB.lng);
      if (route) {
        results[key] = route;
      } else {
        failed++;
      }

      processed++;
      if (processed % 100 === 0) {
        console.log(`Progress: ${processed + skipped}/${total} (${failed} failed)`);
        // Save checkpoint every 100 requests
        writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
      }

      await sleep(RATE_LIMIT_MS);
    }
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  console.log(`Done! ${Object.keys(results).length} routes saved to route-data.json (${failed} failed)`);
}

main();
