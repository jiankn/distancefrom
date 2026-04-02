/**
 * Fetch OSRM routes for specific city pairs
 * Usage: npx tsx scripts/fetch-custom-routes.ts
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(import.meta.dirname ?? '.', '..', 'src', 'data');
const OUTPUT_FILE = join(DATA_DIR, 'route-data.json');
const POPULAR_FILE = join(DATA_DIR, 'popular-pairs.json');
const KM_TO_MILES = 0.621371;
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

interface RouteResult {
  drivingDistanceKm: number;
  drivingDistanceMiles: number;
  drivingDurationMin: number;
}

function canonicalKey(a: string, b: string): string {
  return a < b ? `${a}-to-${b}` : `${b}-to-${a}`;
}

async function fetchRoute(lat1: number, lng1: number, lat2: number, lng2: number): Promise<RouteResult | null> {
  const url = `${OSRM_BASE}/${lng1},${lat1};${lng2},${lat2}?overview=false`;
  try {
    const res = await fetch(url);
    if (!res.ok) { console.error(`HTTP ${res.status}`); return null; }
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
    console.error('Fetch error:', err);
    return null;
  }
}

async function main() {
  const cities = JSON.parse(readFileSync(join(DATA_DIR, 'cities.json'), 'utf-8'));
  const results = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'));

  // Pairs we want OSRM data for (from Google Search Console)
  const pairsToFetch = [
    ['new-haven', 'yosemite'],
    ['baton-rouge', 'orlando'],
    ['new-orleans', 'st-augustine'],
  ];

  let added = 0;
  for (const [slugA, slugB] of pairsToFetch) {
    const cityA = cities[slugA];
    const cityB = cities[slugB];
    if (!cityA || !cityB) {
      console.log(`⚠ Skipping ${slugA} ↔ ${slugB}: city not found`);
      continue;
    }

    const key = canonicalKey(slugA, slugB);
    if (results[key]) {
      console.log(`✓ ${key} already exists, skipping`);
      continue;
    }

    console.log(`→ Fetching ${key}...`);
    const route = await fetchRoute(cityA.lat, cityA.lng, cityB.lat, cityB.lng);

    if (route) {
      results[key] = route;
      added++;
      console.log(`  ✓ ${route.drivingDistanceMiles} mi, ${route.drivingDurationMin} min`);
    } else {
      console.log(`  ✗ Failed (may not be drivable)`);
    }

    // Be polite to OSRM
    await new Promise(r => setTimeout(r, 300));
  }

  if (added > 0) {
    writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
    console.log(`\nSaved ${added} new routes to route-data.json`);
  }

  // Also ensure these pairs are in popular-pairs.json
  if (existsSync(POPULAR_FILE)) {
    const popular: string[] = JSON.parse(readFileSync(POPULAR_FILE, 'utf-8'));
    const oldLen = popular.length;
    for (const [slugA, slugB] of pairsToFetch) {
      const cityA = cities[slugA];
      const cityB = cities[slugB];
      if (!cityA || !cityB) continue;
      const key = canonicalKey(slugA, slugB);
      if (!popular.includes(key)) {
        popular.push(key);
      }
    }
    if (popular.length > oldLen) {
      writeFileSync(POPULAR_FILE, JSON.stringify(popular, null, 2));
      console.log(`Added ${popular.length - oldLen} pairs to popular-pairs.json (${oldLen} → ${popular.length})`);
    }
  }

  console.log('\nDone!');
}

main();
