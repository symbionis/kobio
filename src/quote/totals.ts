/**
 * Read-only running totals for a quote. Per-line tax_rate so mixed-rate offers
 * total correctly; rounded once at the end, not per line, to match the worked
 * example (HT 4362.26 + TVA 353.34 = TTC 4715.60).
 */

import { round2 } from "./compute";
import type { Line, Quote } from "./types";

export interface Totals {
  /** Hors taxe — sum of line amounts. */
  ht: number;
  /** Sum of line amount × tax_rate. */
  tva: number;
  /** Toutes taxes comprises. */
  ttc: number;
}

/** Swiss standard VAT rate — the default suggestion and legacy fallback. */
export const VAT_RATE = 8.1;

/**
 * Compute totals. TVA is a per-devis decision, not dictated in the voice: the
 * builder picks one of their configured rates (or "Aucune"). `vatRate` is that
 * chosen percentage, or null for no VAT. HT = sum of line amounts.
 */
export function totalsFromLines(lines: Line[], vatRate: number | null = VAT_RATE): Totals {
  const ht = round2(lines.reduce((sum, l) => sum + l.amount, 0));
  const tva = vatRate ? round2((ht * vatRate) / 100) : 0;
  const ttc = round2(ht + tva);
  return { ht, tva, ttc };
}

export function totals(quote: Quote, vatRate: number | null = VAT_RATE): Totals {
  return totalsFromLines(quote.lines, vatRate);
}

/** Format a CHF amount. Non-finite values render as "—" so a desynced NaN never
 * reaches a client-facing total or PDF. */
export function formatCHF(n: number): string {
  return Number.isFinite(n) ? n.toFixed(2) : "—";
}
