/**
 * The catalog-learning signal: which saved lines overrode a catalog price.
 *
 * An override is a line whose spoken rate differs from its catalog candidate(s)
 * — exactly `price_override === true` (code derives that in compute.ts). Pure
 * and DB-free so it can be tested without Supabase; the persistence wrapper
 * lives in src/db/overrides.ts. No prediction is performed — this is just the
 * data that would later enable it (refs/quote-schema.md).
 */

import type { Line } from "./types";

export interface OverrideEntry {
  line_index: number;
  spoken_rate: number;
  candidate_price: number;
}

export function overridesFromLines(lines: Line[]): OverrideEntry[] {
  const entries: OverrideEntry[] = [];
  lines.forEach((line, line_index) => {
    if (line.price_override === true && line.catalog_match.candidates.length > 0) {
      entries.push({
        line_index,
        spoken_rate: line.rate,
        // The first candidate is the one the line is recorded as overriding.
        candidate_price: line.catalog_match.candidates[0].catalog_price,
      });
    }
  });
  return entries;
}
