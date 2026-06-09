/**
 * Parsing for editable numeric form fields. Pure and DB/React-free so it can be
 * unit-tested. Tolerates fr-CH comma decimals ("5,25") and never yields NaN —
 * a non-numeric or partial input becomes 0 rather than poisoning a total.
 */
export function parseNum(raw: string): number {
  const n = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
