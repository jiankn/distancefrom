import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import citiesData from '../src/data/cities.json';
import routeDataJson from '../src/data/route-data.json';
import type { City } from '../src/data/types';
import { getCanonicalCitySlug } from '../src/utils/city-identity';
import { haversine } from '../src/utils/haversine';
import {
  couldBeIndexableDistancePairWithRouteData,
  getIndexableCitySlugs,
  getIndexableDistancePairs,
  isIndexableDistancePair,
} from '../src/utils/indexability';
import { canonicalPairKey } from '../src/utils/slug';
import { SITE_URL } from '../src/utils/site';

const ROOT = join(import.meta.dirname, '..');
const DIST_CLIENT = join(ROOT, 'dist', 'client');
const GSC_EXPORT_DIR = 'C:\\Users\\jiank\\Downloads\\gsc-distancefrom-export';
const cities = citiesData as Record<string, City>;
const routeData = routeDataJson as Record<string, unknown>;

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

function readText(path: string): string {
  return readFileSync(path, 'utf-8').replace(/^\uFEFF/, '');
}

function sitemapLocs(): string[] {
  if (!existsSync(DIST_CLIENT)) {
    return [];
  }

  const files = readdirSync(DIST_CLIENT).filter((name) => /^sitemap-.*\.xml$/.test(name) && name !== 'sitemap-index.xml');
  const locs: string[] = [];
  for (const file of files) {
    const xml = readText(join(DIST_CLIENT, file));
    locs.push(...[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]));
  }
  return locs;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') {
        i++;
      }
      row.push(cell);
      if (row.some((value) => value.trim())) {
        rows.push(row);
      }
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function classifyDistanceUrl(url: string): 'full-render' | 'lightweight-noindex' | 'other' {
  const parsed = new URL(url);
  const match = parsed.pathname.match(/^\/distance\/(.+?)\/?$/);
  if (!match) {
    return 'other';
  }

  const parts = match[1].split('-to-');
  if (parts.length !== 2) {
    return 'other';
  }

  const slugA = getCanonicalCitySlug(parts[0], cities);
  const slugB = getCanonicalCitySlug(parts[1], cities);
  if (!cities[slugA] || !cities[slugB] || slugA === slugB) {
    return 'other';
  }

  const pair = canonicalPairKey(slugA, slugB);
  if (match[1] !== pair) {
    return 'other';
  }

  const distance = haversine(cities[slugA].lat, cities[slugA].lng, cities[slugB].lat, cities[slugB].lng);
  const indexableWithoutRoute = isIndexableDistancePair({
    slugA,
    slugB,
    cities,
    hasRouteData: false,
    distanceMiles: distance.miles,
  });

  if (indexableWithoutRoute) {
    return 'full-render';
  }

  const routeCouldMatter = couldBeIndexableDistancePairWithRouteData({
    slugA,
    slugB,
    cities,
    distanceMiles: distance.miles,
  });

  if (!routeCouldMatter) {
    return 'lightweight-noindex';
  }

  return Object.prototype.hasOwnProperty.call(routeData, pair) ? 'full-render' : 'lightweight-noindex';
}

function exportedUrls(kind: string): string[] {
  const path = join(GSC_EXPORT_DIR, kind, '表格.csv');
  if (!existsSync(path)) {
    return [];
  }

  const rows = parseCsv(readText(path));
  return rows
    .slice(1)
    .map((row) => row.find((cell) => /^https?:\/\//.test(cell.trim()))?.trim())
    .filter((url): url is string => Boolean(url));
}

function formatCountMap(values: string[]): string {
  const counts = values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).map(([key, count]) => `${key}=${count}`).join(', ');
}

const checks: CheckResult[] = [];
const expectedCityUrls = getIndexableCitySlugs(cities).map((slug) => `${SITE_URL}/city/${slug}/`);
const expectedDistanceUrls = getIndexableDistancePairs(routeData, cities).map((item) => `${SITE_URL}/distance/${item.pair}/`);
const expectedSitemapUrls = new Set([...expectedCityUrls, ...expectedDistanceUrls, `${SITE_URL}/`, `${SITE_URL}/about/`, `${SITE_URL}/privacy/`]);
const actualLocs = sitemapLocs();
const actualSitemapUrls = new Set(actualLocs);

if (actualLocs.length > 0) {
  const missing = [...expectedSitemapUrls].filter((url) => !actualSitemapUrls.has(url));
  const extra = actualLocs.filter((url) => !expectedSitemapUrls.has(url));
  const sitemapFiles = readdirSync(DIST_CLIENT).filter((name) => /^sitemap-.*\.xml$/.test(name) && name !== 'sitemap-index.xml');
  const missingLastmod = sitemapFiles.filter((file) => !readText(join(DIST_CLIENT, file)).includes('<lastmod>'));

  checks.push({
    name: 'built sitemap matches indexability rules',
    ok: missing.length === 0 && extra.length === 0,
    detail: `${actualLocs.length} built URLs, missing=${missing.length}, extra=${extra.length}`,
  });
  checks.push({
    name: 'built sitemaps include lastmod',
    ok: missingLastmod.length === 0,
    detail: missingLastmod.length === 0 ? `${sitemapFiles.length} sitemap files include lastmod` : `missing lastmod in ${missingLastmod.join(', ')}`,
  });
} else {
  checks.push({
    name: 'built sitemap available',
    ok: false,
    detail: 'run npm.cmd run build before audit:gsc for final crawl-surface checks',
  });
}

const badStrings = [
  { label: '1970 title bug', pattern: '1970' },
  { label: 'not-drivable title bug', pattern: 'Not drivable Drive' },
  { label: 'unsupported hidden gems claim', pattern: 'hidden gems' },
  { label: 'overstated best-stops claim', pattern: 'Best Stops' },
  { label: 'overstated verified label', pattern: 'Verified Data Sources' },
];

for (const item of badStrings) {
  const files = [
    join(ROOT, 'src', 'pages', 'distance', '[slug].astro'),
    join(ROOT, 'src', 'pages', 'index.astro'),
    join(ROOT, 'src', 'utils', 'seo.ts'),
    join(ROOT, 'src', 'components', 'DataSources.astro'),
    join(ROOT, 'src', 'components', 'MidwayStops.astro'),
  ];
  const matches = files.filter((file) => existsSync(file) && readText(file).includes(item.pattern));
  checks.push({
    name: `source does not contain ${item.label}`,
    ok: matches.length === 0,
    detail: matches.length === 0 ? 'clean' : matches.map((file) => file.replace(`${ROOT}\\`, '')).join(', '),
  });
}

if (existsSync(GSC_EXPORT_DIR)) {
  for (const kind of ['server5xx', 'noindex', 'crawled', 'discovered']) {
    const urls = exportedUrls(kind);
    if (urls.length === 0) {
      continue;
    }
    const classifications = urls.map(classifyDistanceUrl);
    checks.push({
      name: `GSC ${kind} export classification`,
      ok: kind !== 'discovered' || classifications.filter((value) => value === 'lightweight-noindex').length === 0,
      detail: `${urls.length} rows: ${formatCountMap(classifications)}`,
    });
  }
}

let failures = 0;
for (const check of checks) {
  const prefix = check.ok ? 'PASS' : 'FAIL';
  if (!check.ok) {
    failures++;
  }
  console.log(`${prefix} ${check.name}: ${check.detail}`);
}

console.log(`\nExpected sitemap URLs: ${expectedSitemapUrls.size} (${expectedDistanceUrls.length} distance, ${expectedCityUrls.length} city, 3 static)`);

if (failures > 0) {
  process.exitCode = 1;
}
