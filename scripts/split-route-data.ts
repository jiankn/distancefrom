/**
 * split-route-data.ts
 *
 * Splits the monolithic src/data/route-data.json into per-origin-city
 * JSON files under public/data/routes/{city}.json so that the Worker
 * can fetch only the data it needs at runtime instead of bundling the
 * entire 17 MB file.
 *
 * Usage: npx tsx scripts/split-route-data.ts
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname ?? __dirname, '..');
const SRC_FILE = join(ROOT, 'src/data/route-data.json');
const OUT_DIR = join(ROOT, 'public/data/routes');

interface RouteEntry {
  drivingDistanceKm: number;
  drivingDistanceMiles: number;
  drivingDurationMin: number;
  source?: string;
}

// ---------- main ----------
console.log('Reading route-data.json …');
const allRoutes: Record<string, RouteEntry> = JSON.parse(readFileSync(SRC_FILE, 'utf-8'));
const totalPairs = Object.keys(allRoutes).length;
console.log(`  ${totalPairs} route pairs found.`);

// Group by every city that appears in a pair key.
// For "a-to-b" we file it under both "a" and "b" so that
// fetching either city's file will find the pair.
const byCityOrigin: Record<string, Record<string, RouteEntry>> = {};

for (const [pairKey, data] of Object.entries(allRoutes)) {
  const idx = pairKey.indexOf('-to-');
  if (idx === -1) continue;
  const cityA = pairKey.slice(0, idx);
  const cityB = pairKey.slice(idx + 4);

  // File under the first city in the canonical key (alphabetical).
  // Since canonicalPairKey always puts the alphabetically-first city
  // first, we only need to file under cityA to avoid duplication.
  if (!byCityOrigin[cityA]) byCityOrigin[cityA] = {};
  byCityOrigin[cityA][pairKey] = data;
}

// Clean output dir
mkdirSync(OUT_DIR, { recursive: true });
const existing = readdirSync(OUT_DIR).filter((f) => f.endsWith('.json'));
for (const f of existing) unlinkSync(join(OUT_DIR, f));

// Write per-city files
let totalFiles = 0;
let totalBytes = 0;

for (const [city, routes] of Object.entries(byCityOrigin)) {
  const json = JSON.stringify(routes);
  const outPath = join(OUT_DIR, `${city}.json`);
  writeFileSync(outPath, json, 'utf-8');
  totalFiles++;
  totalBytes += Buffer.byteLength(json);
}

console.log(`\n✓ Wrote ${totalFiles} city route files to public/data/routes/`);
console.log(`  Total size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Avg per file: ${(totalBytes / totalFiles / 1024).toFixed(1)} KB`);
console.log('\nDone.');
