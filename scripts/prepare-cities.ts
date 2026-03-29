/**
 * City data preparation script — reads from city-seeds.csv
 * 
 * Usage: npx tsx scripts/prepare-cities.ts
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const SCRIPT_DIR = import.meta.dirname ?? '.';
const CSV_PATH = join(SCRIPT_DIR, 'city-seeds.csv');
const OUTPUT = join(SCRIPT_DIR, '..', 'src', 'data', 'cities.json');
const NEARBY_RADIUS_KM = 300;
const NEARBY_LIMIT = 8;

interface CsvRow {
  slug: string; name: string; country: string; countryName: string;
  state: string; region: string; lat: number; lng: number;
  timezone: string; population: number; elevation: number;
  type: string; description: string; iataCode: string; tags: string[];
}

function parseCsv(raw: string): CsvRow[] {
  const lines = raw.trim().split('\n');
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const f = lines[i].split(',');
    if (f.length < 15) { console.warn(`Skipping line ${i + 1}: only ${f.length} fields`); continue; }
    rows.push({
      slug: f[0].trim(),
      name: f[1].trim(),
      country: f[2].trim(),
      countryName: f[3].trim(),
      state: f[4].trim(),
      region: f[5].trim(),
      lat: parseFloat(f[6]),
      lng: parseFloat(f[7]),
      timezone: f[8].trim(),
      population: parseInt(f[9], 10) || 0,
      elevation: parseInt(f[10], 10) || 0,
      type: f[11].trim(),
      description: f[12].trim(),
      iataCode: f[13].trim(),
      tags: f[14] ? f[14].trim().split('|').filter(Boolean) : [],
    });
  }
  return rows;
}

function haversineDist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function main() {
  const raw = readFileSync(CSV_PATH, 'utf-8');
  const rows = parseCsv(raw);
  console.log(`Parsed ${rows.length} places from CSV`);

  // Check for duplicate slugs
  const slugSet = new Set<string>();
  for (const r of rows) {
    if (slugSet.has(r.slug)) { console.error(`Duplicate slug: ${r.slug}`); process.exit(1); }
    slugSet.add(r.slug);
  }

  // Build output
  const cities: Record<string, any> = {};
  for (const r of rows) {
    const entry: Record<string, any> = {
      name: r.name,
      country: r.country,
      countryName: r.countryName,
      lat: r.lat,
      lng: r.lng,
      timezone: r.timezone,
      population: r.population,
      elevation: r.elevation,
      nearby: [] as string[],
    };
    if (r.state) entry.state = r.state;
    if (r.region) entry.region = r.region;
    if (r.type) entry.type = r.type;
    if (r.description) entry.description = r.description;
    if (r.iataCode) entry.iataCode = r.iataCode;
    if (r.tags.length > 0) entry.tags = r.tags;
    cities[r.slug] = entry;
  }

  // Compute nearby for each place
  for (const r of rows) {
    const nearby = rows
      .filter(o => o.slug !== r.slug)
      .map(o => ({ slug: o.slug, dist: haversineDist(r.lat, r.lng, o.lat, o.lng) }))
      .filter(o => o.dist < NEARBY_RADIUS_KM)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, NEARBY_LIMIT)
      .map(o => o.slug);
    cities[r.slug].nearby = nearby;
  }

  writeFileSync(OUTPUT, JSON.stringify(cities, null, 2));
  console.log(`Wrote ${Object.keys(cities).length} places to cities.json`);

  // Stats
  const types: Record<string, number> = {};
  const countries: Record<string, number> = {};
  for (const r of rows) {
    types[r.type] = (types[r.type] || 0) + 1;
    countries[r.country] = (countries[r.country] || 0) + 1;
  }
  console.log('Types:', Object.entries(types).map(([k, v]) => `${k}:${v}`).join(', '));
  console.log('Top countries:', Object.entries(countries).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k}:${v}`).join(', '));
}

main();
