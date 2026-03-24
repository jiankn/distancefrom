/** Slug utilities for city names and canonical ordering */

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Canonical pair key: alphabetical order to avoid A→B / B→A duplication */
export function canonicalPairKey(slugA: string, slugB: string): string {
  return slugA < slugB ? `${slugA}-to-${slugB}` : `${slugB}-to-${slugA}`;
}

/** Check if a pair is in canonical order */
export function isCanonicalOrder(slugA: string, slugB: string): boolean {
  return slugA < slugB;
}
