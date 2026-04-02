/**
 * GeoNames → city-seeds.csv importer
 * 
 * Downloads cities5000.txt from GeoNames, filters by target countries
 * and population threshold, merges with existing city-seeds.csv.
 * 
 * Usage: npx tsx scripts/import-geonames.ts
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const SCRIPT_DIR = import.meta.dirname ?? '.';
const GEONAMES_DIR = join(SCRIPT_DIR, '..', 'geonames-data');
const EXISTING_CSV = join(SCRIPT_DIR, 'city-seeds.csv');
const OUTPUT_CSV = join(SCRIPT_DIR, 'city-seeds.csv');

const TARGET_COUNTRIES = ['US', 'CA', 'GB', 'AU', 'NZ'];
const POP_THRESHOLD = 15000;

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', CA: 'Canada', GB: 'United Kingdom',
  AU: 'Australia', NZ: 'New Zealand',
};

// State/province abbreviation for slug disambiguation
const STATE_ABBREVS: Record<string, Record<string, string>> = {
  US: {
    'Alabama': 'al', 'Alaska': 'ak', 'Arizona': 'az', 'Arkansas': 'ar',
    'California': 'ca', 'Colorado': 'co', 'Connecticut': 'ct', 'Delaware': 'de',
    'Florida': 'fl', 'Georgia': 'ga', 'Hawaii': 'hi', 'Idaho': 'id',
    'Illinois': 'il', 'Indiana': 'in', 'Iowa': 'ia', 'Kansas': 'ks',
    'Kentucky': 'ky', 'Louisiana': 'la', 'Maine': 'me', 'Maryland': 'md',
    'Massachusetts': 'ma', 'Michigan': 'mi', 'Minnesota': 'mn', 'Mississippi': 'ms',
    'Missouri': 'mo', 'Montana': 'mt', 'Nebraska': 'ne', 'Nevada': 'nv',
    'New Hampshire': 'nh', 'New Jersey': 'nj', 'New Mexico': 'nm', 'New York': 'ny',
    'North Carolina': 'nc', 'North Dakota': 'nd', 'Ohio': 'oh', 'Oklahoma': 'ok',
    'Oregon': 'or', 'Pennsylvania': 'pa', 'Rhode Island': 'ri', 'South Carolina': 'sc',
    'South Dakota': 'sd', 'Tennessee': 'tn', 'Texas': 'tx', 'Utah': 'ut',
    'Vermont': 'vt', 'Virginia': 'va', 'Washington': 'wa', 'West Virginia': 'wv',
    'Wisconsin': 'wi', 'Wyoming': 'wy', 'District of Columbia': 'dc',
  },
  CA: {
    'Alberta': 'ab', 'British Columbia': 'bc', 'Manitoba': 'mb',
    'New Brunswick': 'nb', 'Newfoundland and Labrador': 'nl',
    'Nova Scotia': 'ns', 'Ontario': 'on', 'Prince Edward Island': 'pe',
    'Quebec': 'qc', 'Saskatchewan': 'sk', 'Yukon': 'yt',
    'Northwest Territories': 'nt', 'Nunavut': 'nu',
  },
  AU: {
    'Australian Capital Territory': 'act', 'New South Wales': 'nsw',
    'Northern Territory': 'nt', 'Queensland': 'qld',
    'South Australia': 'sa', 'Tasmania': 'tas',
    'Victoria': 'vic', 'Western Australia': 'wa',
  },
  GB: {
    'England': 'eng', 'Scotland': 'sco', 'Wales': 'wal',
    'Northern Ireland': 'nir',
  },
  NZ: {},
};

interface ExistingEntry {
  slug: string; name: string; country: string; countryName: string;
  state: string; region: string; lat: number; lng: number;
  timezone: string; population: number; elevation: number;
  type: string; description: string; iataCode: string; tags: string;
  raw: string; // original CSV line
}

interface GeoEntry {
  name: string; asciiName: string; lat: number; lng: number;
  country: string; admin1Name: string; population: number;
  elevation: number; timezone: string;
}

// ── Helpers ────────────────────────────────────────────────

function toSlug(name: string): string {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function haversineDist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getStateAbbrev(country: string, stateName: string): string {
  const map = STATE_ABBREVS[country];
  if (!map) return toSlug(stateName).slice(0, 3);
  return map[stateName] ?? toSlug(stateName).slice(0, 3);
}

function escapeCSV(s: string): string {
  // Remove commas from descriptions to keep simple CSV parsing compatible
  return s.replace(/,/g, ';');
}

// ── Parse admin1 codes ─────────────────────────────────────

function loadAdmin1Codes(): Record<string, string> {
  const raw = readFileSync(join(GEONAMES_DIR, 'admin1CodesASCII.txt'), 'utf-8');
  const map: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    if (parts.length >= 2) {
      map[parts[0]] = parts[1]; // "US.NY" → "New York"
    }
  }
  return map;
}

// ── Parse existing CSV ─────────────────────────────────────

function loadExistingCSV(): ExistingEntry[] {
  const raw = readFileSync(EXISTING_CSV, 'utf-8');
  const lines = raw.trim().split('\n');
  const entries: ExistingEntry[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, '');
    const f = line.split(',');
    if (f.length < 15) continue;
    entries.push({
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
      tags: f[14]?.trim() || '',
      raw: line,
    });
  }
  return entries;
}

// ── Parse GeoNames cities5000.txt ──────────────────────────

function loadGeoNames(admin1Map: Record<string, string>): GeoEntry[] {
  const raw = readFileSync(join(GEONAMES_DIR, 'cities5000.txt'), 'utf-8');
  const entries: GeoEntry[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    const f = line.split('\t');
    if (f.length < 18) continue;
    const country = f[8];
    if (!TARGET_COUNTRIES.includes(country)) continue;
    const pop = parseInt(f[14], 10) || 0;
    if (pop < POP_THRESHOLD) continue;

    const admin1Key = `${country}.${f[10]}`;
    const admin1Name = admin1Map[admin1Key] || f[10] || '';
    // For GB, admin1 is often the constituent country (England/Scotland/etc.)
    // We want that as the "region" not "state" for GB

    entries.push({
      name: f[1],            // UTF-8 name
      asciiName: f[2],       // ASCII name
      lat: parseFloat(f[4]),
      lng: parseFloat(f[5]),
      country,
      admin1Name,
      population: pop,
      elevation: parseInt(f[15], 10) || parseInt(f[16], 10) || 0,
      timezone: f[17],
    });
  }
  return entries;
}

// ── Main ───────────────────────────────────────────────────

function main() {
  console.log('Loading admin1 codes...');
  const admin1Map = loadAdmin1Codes();

  console.log('Loading existing city-seeds.csv...');
  const existing = loadExistingCSV();
  console.log(`  → ${existing.length} existing entries`);

  console.log(`Loading GeoNames (pop ≥ ${POP_THRESHOLD}, countries: ${TARGET_COUNTRIES.join(', ')})...`);
  const geoEntries = loadGeoNames(admin1Map);
  console.log(`  → ${geoEntries.length} GeoNames entries matching criteria`);

  // Stats by country
  const geoByCountry: Record<string, number> = {};
  for (const e of geoEntries) {
    geoByCountry[e.country] = (geoByCountry[e.country] || 0) + 1;
  }
  console.log('  GeoNames by country:', Object.entries(geoByCountry).map(([k, v]) => `${k}:${v}`).join(', '));

  // Build proximity index from existing entries
  const existingCoords = existing.map(e => ({ lat: e.lat, lng: e.lng, slug: e.slug }));

  // Check which GeoNames entries are NOT already in existing data (by proximity < 25km)
  const newEntries: GeoEntry[] = [];
  let skippedDuplicate = 0;
  for (const geo of geoEntries) {
    const isNearExisting = existingCoords.some(ex => haversineDist(geo.lat, geo.lng, ex.lat, ex.lng) < 25);
    if (isNearExisting) {
      skippedDuplicate++;
      continue;
    }
    newEntries.push(geo);
  }
  console.log(`  → ${skippedDuplicate} skipped (already in existing data)`);
  console.log(`  → ${newEntries.length} genuinely new cities to add`);

  // New stats by country
  const newByCountry: Record<string, number> = {};
  for (const e of newEntries) {
    newByCountry[e.country] = (newByCountry[e.country] || 0) + 1;
  }
  console.log('  New by country:', Object.entries(newByCountry).map(([k, v]) => `${k}:${v}`).join(', '));

  // ── Slug generation with disambiguation ──────────────────

  // Collect all slugs: existing (fixed) + new (need to generate)
  const usedSlugs = new Set(existing.map(e => e.slug));

  // First pass: find base slug collisions among new entries
  const baseSlugCount: Record<string, GeoEntry[]> = {};
  for (const geo of newEntries) {
    const base = toSlug(geo.asciiName || geo.name);
    if (!baseSlugCount[base]) baseSlugCount[base] = [];
    baseSlugCount[base].push(geo);
  }

  // Generate final slugs
  const newCsvLines: string[] = [];
  for (const geo of newEntries) {
    const base = toSlug(geo.asciiName || geo.name);
    let slug: string;

    const needsSuffix = usedSlugs.has(base) || (baseSlugCount[base]?.length ?? 0) > 1;
    if (needsSuffix) {
      const abbrev = getStateAbbrev(geo.country, geo.admin1Name);
      slug = `${base}-${abbrev}`;
      // If still collides, add more specificity
      if (usedSlugs.has(slug)) {
        slug = `${base}-${abbrev}-${geo.country.toLowerCase()}`;
      }
    } else {
      slug = base;
    }

    // Final collision check
    if (usedSlugs.has(slug)) {
      console.warn(`  ⚠ Slug collision unresolved: ${slug} (${geo.name}, ${geo.admin1Name}, ${geo.country}). Skipping.`);
      continue;
    }
    usedSlugs.add(slug);

    // Determine state/region fields
    let state = '';
    let region = '';
    if (geo.country === 'GB') {
      region = geo.admin1Name; // England, Scotland, etc.
    } else {
      state = geo.admin1Name;
    }

    // Type based on population
    const type = geo.population >= 50000 ? 'city' : 'town';

    // Auto-generate description
    const countryName = COUNTRY_NAMES[geo.country] || geo.country;
    const locationPart = state || region;
    const desc = escapeCSV(
      locationPart
        ? `A ${type} in ${locationPart} with a population of ${geo.population.toLocaleString()}`
        : `A ${type} in ${countryName} with a population of ${geo.population.toLocaleString()}`
    );

    // CSV line: slug,name,country,countryName,state,region,lat,lng,timezone,population,elevation,type,description,iataCode,tags
    const csvLine = [
      slug,
      escapeCSV(geo.name),
      geo.country,
      countryName,
      state,
      region,
      geo.lat.toFixed(4),
      geo.lng.toFixed(4),
      geo.timezone,
      geo.population,
      geo.elevation,
      type,
      desc,
      '', // iataCode (unknown)
      '', // tags (unknown)
    ].join(',');

    newCsvLines.push(csvLine);
  }

  console.log(`\n  → ${newCsvLines.length} new CSV lines generated`);

  // ── Write merged CSV ─────────────────────────────────────

  const header = 'slug,name,country,countryName,state,region,lat,lng,timezone,population,elevation,type,description,iataCode,tags';

  // Keep existing lines first, then append new ones sorted by country then population
  const existingLines = existing.map(e => e.raw);

  // Sort new lines: parse back for sorting
  const sortedNewLines = newCsvLines.sort((a, b) => {
    const fa = a.split(',');
    const fb = b.split(',');
    // Sort by country, then by population desc
    if (fa[2] !== fb[2]) return fa[2].localeCompare(fb[2]);
    return parseInt(fb[9]) - parseInt(fa[9]);
  });

  const allLines = [header, ...existingLines, ...sortedNewLines];
  writeFileSync(OUTPUT_CSV, allLines.join('\n') + '\n');

  const totalEntries = existing.length + newCsvLines.length;
  console.log(`\n✅ Written ${totalEntries} entries to city-seeds.csv`);
  console.log(`   (${existing.length} existing + ${newCsvLines.length} new)`);

  // Final stats
  const finalByCountry: Record<string, number> = {};
  for (const e of existing) {
    finalByCountry[e.country] = (finalByCountry[e.country] || 0) + 1;
  }
  for (const line of newCsvLines) {
    const c = line.split(',')[2];
    finalByCountry[c] = (finalByCountry[c] || 0) + 1;
  }
  console.log('\nFinal distribution:');
  for (const [c, n] of Object.entries(finalByCountry).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${c}: ${n}`);
  }
}

main();
