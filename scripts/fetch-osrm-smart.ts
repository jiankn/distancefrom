/**
 * Smart OSRM route fetcher — only processes same-continent pairs
 * Skips cross-ocean pairs that OSRM can't route anyway
 * 
 * Usage: npx tsx scripts/fetch-osrm-smart.ts
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(import.meta.dirname ?? '.', '..', 'src', 'data');
const OUTPUT_FILE = join(DATA_DIR, 'route-data.json');
const KM_TO_MILES = 0.621371;
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';
const RATE_LIMIT_MS = 210;

interface City { name: string; country: string; lat: number; lng: number; population: number; }
interface RouteResult { drivingDistanceKm: number; drivingDistanceMiles: number; drivingDurationMin: number; }

function canonicalKey(a: string, b: string): string {
  return a < b ? `${a}-to-${b}` : `${b}-to-${a}`;
}

function getContinent(country: string, lng: number): string {
  const americas = ['US','CA','MX','BR','AR','CL','CO','PE','CU','DO','JM','AW','LC','BB','TC','BM','BS'];
  const europe = ['GB','DE','FR','ES','IT','NL','CH','AT','SE','NO','DK','FI','IS','IE','PT','PL','CZ','HU','HR','SI','GR','BE','MC'];
  const oceania = ['AU','NZ','FJ'];
  const asia = ['JP','CN','KR','TW','HK','SG','TH','VN','MY','ID','KH','LA','PH','IN','AE','QA','JO','IL','MV'];
  const africa = ['ZA','MA','EG','KE','TZ','ZW','MU'];
  if (americas.includes(country)) return 'americas';
  if (europe.includes(country)) return 'europe';
  if (oceania.includes(country)) return 'oceania';
  if (asia.includes(country)) return 'asia';
  if (africa.includes(country)) return 'africa';
  return 'unknown';
}

function canDrive(countryA: string, lngA: number, countryB: string, lngB: number): boolean {
  const cA = getContinent(countryA, lngA);
  const cB = getContinent(countryB, lngB);
  if (cA !== cB) {
    // Europe-Asia are connected by land
    if ((cA === 'europe' && cB === 'asia') || (cA === 'asia' && cB === 'europe')) return true;
    // Africa-Europe/Asia connected
    if ((cA === 'africa' && (cB === 'europe' || cB === 'asia')) || ((cA === 'europe' || cA === 'asia') && cB === 'africa')) return true;
    // Americas: North and South connected
    return false;
  }
  // Islands can't drive to mainland
  const islands = ['FJ','MV','MU','IS','JM','AW','LC','BB','TC','BM','BS'];
  if (islands.includes(countryA) || islands.includes(countryB)) return false;
  return true;
}

async function fetchRoute(lat1: number, lng1: number, lat2: number, lng2: number): Promise<RouteResult | null> {
  const url = `${OSRM_BASE}/${lng1},${lat1};${lng2},${lat2}?overview=false`;
  try {
    const res = await fetch(url);
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
  } catch { return null; }
}

async function main() {
  const cities: Record<string, City> = JSON.parse(readFileSync(join(DATA_DIR, 'cities.json'), 'utf-8'));
  const sorted = Object.entries(cities).sort(([, a], [, b]) => b.population - a.population);

  // Build drivable pairs only
  const pairs: [string, City, string, City][] = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const [slugA, cityA] = sorted[i];
      const [slugB, cityB] = sorted[j];
      if (canDrive(cityA.country, cityA.lng, cityB.country, cityB.lng)) {
        pairs.push([slugA, cityA, slugB, cityB]);
      }
    }
  }
  console.log(`Total cities: ${sorted.length}, Drivable pairs: ${pairs.length} (skipped ${sorted.length*(sorted.length-1)/2 - pairs.length} cross-ocean)`);

  let results: Record<string, RouteResult> = {};
  if (existsSync(OUTPUT_FILE)) {
    results = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'));
    console.log(`Resuming: ${Object.keys(results).length} pairs already computed`);
  }

  let processed = 0, skipped = 0, failed = 0;
  for (const [slugA, cityA, slugB, cityB] of pairs) {
    const key = canonicalKey(slugA, slugB);
    if (results[key]) { skipped++; continue; }

    const route = await fetchRoute(cityA.lat, cityA.lng, cityB.lat, cityB.lng);
    if (route) { results[key] = route; }
    else { failed++; }

    processed++;
    if (processed % 200 === 0) {
      console.log(`Progress: ${processed + skipped}/${pairs.length} (${Object.keys(results).length} routes, ${failed} failed)`);
      writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
    }
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  console.log(`Done! ${Object.keys(results).length} routes saved (${failed} failed, ${skipped} skipped)`);
}

main();
