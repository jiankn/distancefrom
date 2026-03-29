/**
 * Fast OSRM route fetcher — concurrent requests, NoRoute-aware
 * Skips cross-ocean/island pairs. Records NoRoute to avoid retrying.
 * Auto-saves every 10 batches. Ctrl+C safe (resume supported).
 *
 * Usage: npx tsx scripts/fetch-osrm-fast.ts
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(import.meta.dirname ?? '.', '..', 'src', 'data');
const OUTPUT_FILE = join(DATA_DIR, 'route-data.json');
const KM_TO_MILES = 0.621371;
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';
const CONCURRENCY = 20;
const BATCH_DELAY_MS = 0;
const PRINT_EVERY = 10; // print every N batches

interface City { name: string; country: string; lat: number; lng: number; population: number; }
interface RouteResult { drivingDistanceKm: number; drivingDistanceMiles: number; drivingDurationMin: number; }

function canonicalKey(a: string, b: string) { return a < b ? `${a}-to-${b}` : `${b}-to-${a}`; }

function getContinent(country: string): string {
  const m: Record<string, string> = {
    US:'am',CA:'am',MX:'am',BR:'am',AR:'am',CL:'am',CO:'am',PE:'am',
    GB:'eu',DE:'eu',FR:'eu',ES:'eu',IT:'eu',NL:'eu',CH:'eu',AT:'eu',
    SE:'eu',NO:'eu',DK:'eu',FI:'eu',IE:'eu',PT:'eu',PL:'eu',CZ:'eu',
    HU:'eu',HR:'eu',SI:'eu',GR:'eu',BE:'eu',MC:'eu',
    AU:'oc',
    JP:'as',CN:'as',KR:'as',TW:'as',HK:'as',SG:'as',TH:'as',VN:'as',
    MY:'as',ID:'as',KH:'as',LA:'as',PH:'as',IN:'as',AE:'as',QA:'as',JO:'as',IL:'as',
    ZA:'af',MA:'af',EG:'af',KE:'af',TZ:'af',ZW:'af',
  };
  return m[country] ?? 'xx';
}

// Countries that are islands — skip driving routes to/from these
const ISLANDS = new Set([
  'FJ','MV','MU','JM','AW','LC','BB','TC','BM','BS',
  'CU','DO','IS','NZ','SG','HK','TW','PH','ID','MY',
]);

function canDrive(cA: string, cB: string): boolean {
  if (ISLANDS.has(cA) || ISLANDS.has(cB)) return false;
  const a = getContinent(cA), b = getContinent(cB);
  if (a === 'xx' || b === 'xx') return false;
  if (a === b) return true;
  // Eurasia + Africa are connected by land
  const landmass = new Set(['eu', 'as', 'af']);
  return landmass.has(a) && landmass.has(b);
}

async function fetchRoute(lat1: number, lng1: number, lat2: number, lng2: number): Promise<RouteResult | 'noRoute' | null> {
  const url = `${OSRM_BASE}/${lng1},${lat1};${lng2},${lat2}?overview=false`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (res.status === 429) return null; // rate limited — will retry next run
    if (!res.ok) return null;
    const data = await res.json() as any;
    if (data.code === 'NoRoute' || data.code === 'NoSegment') return 'noRoute';
    if (data.code !== 'Ok' || !data.routes?.length) return null;
    const km = Math.round(data.routes[0].distance / 100) / 10;
    return {
      drivingDistanceKm: km,
      drivingDistanceMiles: Math.round(km * KM_TO_MILES * 10) / 10,
      drivingDurationMin: Math.round(data.routes[0].duration / 60),
    };
  } catch { return null; }
}

async function main() {
  const cities: Record<string, City> = JSON.parse(readFileSync(join(DATA_DIR, 'cities.json'), 'utf-8'));
  // Only top 200 cities by population — covers 90% of search traffic
  const sorted = Object.entries(cities)
    .sort(([, a], [, b]) => b.population - a.population)
    .slice(0, 200);

  const results: Record<string, any> = existsSync(OUTPUT_FILE)
    ? JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'))
    : {};

  // Build todo list
  const todo: { key: string; latA: number; lngA: number; latB: number; lngB: number }[] = [];
  let skippedDone = 0, skippedOcean = 0;

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const [slugA, cityA] = sorted[i];
      const [slugB, cityB] = sorted[j];
      const key = canonicalKey(slugA, slugB);
      if (key in results) { skippedDone++; continue; }
      if (!canDrive(cityA.country, cityB.country)) { skippedOcean++; continue; }
      todo.push({ key, latA: cityA.lat, lngA: cityA.lng, latB: cityB.lat, lngB: cityB.lng });
    }
  }

  const totalPairs = sorted.length * (sorted.length - 1) / 2;
  console.log(`Total pairs: ${totalPairs} | Already done: ${skippedDone} | Skipped ocean/island: ${skippedOcean} | TODO: ${todo.length}`);
  console.log(`Concurrency: ${CONCURRENCY} | Delay: ${BATCH_DELAY_MS}ms | Est. time: ~${Math.round(todo.length / CONCURRENCY * BATCH_DELAY_MS / 1000 / 60)}min`);
  console.log('---');

  let done = 0, failed = 0, noRoute = 0, newRoutes = 0, batchCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const batch = todo.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (item) => {
      const result = await fetchRoute(item.latA, item.lngA, item.latB, item.lngB);
      if (result === 'noRoute') {
        results[item.key] = { noRoute: true }; // record to skip next time
        noRoute++;
      } else if (result) {
        results[item.key] = result;
        newRoutes++;
      } else {
        failed++; // network error / 429 — will retry next run
      }
      done++;
    }));

    batchCount++;
    if (batchCount % PRINT_EVERY === 0) {
      writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = done / elapsed;
      const eta = Math.round((todo.length - done) / rate / 60);
      console.log(`[${done}/${todo.length}] +${newRoutes} routes | ${noRoute} noRoute | ${failed} err | ${rate.toFixed(1)} req/s | ETA: ${eta}min`);
    }

    await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const realRoutes = Object.values(results).filter((v: any) => !v.noRoute).length;
  console.log(`\nDone in ${Math.floor(elapsed/60)}m ${elapsed%60}s!`);
  console.log(`Real routes: ${realRoutes} | NoRoute recorded: ${noRoute} | Network errors: ${failed}`);
}

main();
