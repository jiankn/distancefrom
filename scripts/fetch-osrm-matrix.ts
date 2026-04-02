/**
 * OSRM Matrix Route Fetcher (Ultra-Fast)
 * 
 * Uses the OSRM Table Service to fetch up to 2500 distances in a single request!
 * (50 origin cities × 50 destination cities = 100 coordinates, perfectly within OSRM limits)
 * 
 * Usage: npx tsx scripts/fetch-osrm-matrix.ts
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(import.meta.dirname ?? '.', '..', 'src', 'data');
const OUTPUT_FILE = join(DATA_DIR, 'route-data.json');
const KM_TO_MILES = 0.621371;
const OSRM_TABLE_BASE = 'https://router.project-osrm.org/table/v1/driving';

interface City {
  name: string; country: string; lat: number; lng: number;
  population: number; type?: string;
}
interface RouteResult {
  drivingDistanceKm: number;
  drivingDistanceMiles: number;
  drivingDurationMin: number;
}

const DRIVABLE_COUNTRIES = ['US', 'CA', 'GB', 'AU', 'NZ',
  'DE', 'FR', 'IT', 'ES', 'NL', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI',
  'IE', 'PT', 'PL', 'CZ', 'HU', 'HR', 'SI', 'GR', 'BE',
  'JP', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE',
  'IN', 'ZA', 'MA', 'EG', 'KE',
  'TH', 'VN', 'MY', 'KH',
];
const ISLAND_TYPES = ['island'];

function canonicalKey(a: string, b: string): string {
  return a < b ? `${a}-to-${b}` : `${b}-to-${a}`;
}

async function fetchMatrix(sources: [string, City][], destinations: [string, City][]): Promise<any> {
  const allCities = [...sources, ...destinations];
  const coords = allCities.map(c => `${c[1].lng.toFixed(5)},${c[1].lat.toFixed(5)}`).join(';');
  const sourceIndices = sources.map((_, i) => i).join(';');
  const destIndices = destinations.map((_, i) => i + sources.length).join(';');
  
  const url = `${OSRM_TABLE_BASE}/${coords}?sources=${sourceIndices}&destinations=${destIndices}&annotations=duration,distance`;
  
  const res = await fetch(url);
  if (res.status === 429) return '429';
  if (!res.ok) return null;
  const data = await res.json() as any;
  if (data.code !== 'Ok') return null;
  return data;
}

async function main() {
  const cities: Record<string, City> = JSON.parse(readFileSync(join(DATA_DIR, 'cities.json'), 'utf-8'));

  let results: Record<string, RouteResult> = {};
  if (existsSync(OUTPUT_FILE)) {
    results = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'));
    console.log(`Loaded ${Object.keys(results).length} existing routes.`);
  }

  const byCountry: Record<string, [string, City][]> = {};
  for (const [slug, city] of Object.entries(cities)) {
    if (!byCountry[city.country]) byCountry[city.country] = [];
    byCountry[city.country].push([slug, city]);
  }

  const TOP_N = 50;
  let missingCount = 0;
  let newFetched = 0;

  for (const country of Object.keys(byCountry)) {
    if (!DRIVABLE_COUNTRIES.includes(country)) continue;

    let countryCities = byCountry[country].sort(([, a], [, b]) => b.population - a.population);
    // Filter islands early
    countryCities = countryCities.filter(([, c]) => !ISLAND_TYPES.includes(c.type ?? ''));
    
    if (countryCities.length < 2) continue;

    const top50 = countryCities.slice(0, TOP_N);
    const rest = countryCities.slice(TOP_N);

    // Track internally generated top50 × top50 chunks
    // We can do this in exactly 1 matrix call (50 source × 50 dest, but they are the same cities)
    // To handle them easily, let's just make the source = top50, dest = top50
    const topChunks = [[top50, top50]];
    
    // For 'rest', chunk them into groups of 50
    for (let i = 0; i < rest.length; i += 50) {
      topChunks.push([rest.slice(i, i + 50), top50]);
    }

    for (const [sources, dests] of topChunks) {
      // First check how many of these paths actually need computation
      let needsWork = false;
      for (const [slugA] of sources) {
        for (const [slugB] of dests) {
          if (slugA === slugB) continue;
          const key = canonicalKey(slugA, slugB);
          if (!results[key]) {
            needsWork = true;
            missingCount++;
          }
        }
      }
      
      if (!needsWork) continue;

      let success = false;
      let backoff = 1000;

      while (!success) {
        process.stdout.write(`Fetching matrix: ${sources.length} sources × ${dests.length} dests... `);
        const data = await fetchMatrix(sources, dests);
        
        if (data === '429') {
          console.log(`Rate limited. Backing off ${backoff}ms`);
          await new Promise(r => setTimeout(r, backoff));
          backoff = Math.min(backoff * 2, 15000);
          continue;
        }

        if (!data || !data.distances) {
          console.log('Failed to fetch/parse matrix.');
          break; // Skip chunk
        }

        console.log('Success!');
        success = true;

        for (let i = 0; i < sources.length; i++) {
          for (let j = 0; j < dests.length; j++) {
            const slugA = sources[i][0];
            const slugB = dests[j][0];
            if (slugA === slugB) continue;

            const distMeters = data.distances[i][j];
            const durationSeconds = data.durations[i][j];
            
            // If distance is null/0 over long distances or unroutable, skip
            if (distMeters == null || typeof distMeters !== 'number') continue;
            
            const distKm = Math.round(distMeters / 100) / 10;
            const key = canonicalKey(slugA, slugB);
            
            if (!results[key]) {
              results[key] = {
                drivingDistanceKm: distKm,
                drivingDistanceMiles: Math.round(distKm * KM_TO_MILES * 10) / 10,
                drivingDurationMin: Math.round(durationSeconds / 60),
              };
              newFetched++;
            }
          }
        }
        
        // Save checkpoint
        writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
      }
    }
  }

  console.log(`\n✅ Done! Fetched ${newFetched} new routes.`);
  console.log(`   Total routes in dataset: ${Object.keys(results).length}`);
}

main();
