/**
 * Generate popular city pairs for SSG pre-rendering.
 * Takes top N cities by population, generates all canonical pairs.
 * 
 * Usage: npx tsx scripts/generate-popular-pairs.ts [topN=200]
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(import.meta.dirname ?? '.', '..', 'src', 'data');

interface City { name: string; population: number; }

function canonicalKey(a: string, b: string): string {
  return a < b ? `${a}-to-${b}` : `${b}-to-${a}`;
}

function main() {
  const cities: Record<string, City> = JSON.parse(
    readFileSync(join(DATA_DIR, 'cities.json'), 'utf-8')
  );

  const topN = parseInt(process.argv[2] ?? '200', 10);
  const sorted = Object.entries(cities)
    .sort(([, a], [, b]) => b.population - a.population)
    .slice(0, topN);

  const pairs: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      pairs.push(canonicalKey(sorted[i][0], sorted[j][0]));
    }
  }

  writeFileSync(join(DATA_DIR, 'popular-pairs.json'), JSON.stringify(pairs, null, 2));
  console.log(`Generated ${pairs.length} popular pairs from top ${sorted.length} cities`);
}

main();
