/**
 * Read-only running totals for a quote. A single per-devis VAT rate applies to
 * the whole HT (since migration 0011 — the builder picks one configured rate or
 * "Aucune", not per-line); rounded once at the end, not per line, to match the
 * worked example (HT 4362.26 + TVA 353.34 = TTC 4715.60).
 */

import { round2 } from "./compute";
import type { Line, Quote } from "./types";

/**
 * An optional quote-level discount (remise). Like the VAT rate, it is a per-devis
 * decision and NOT dictated in the voice, so it lives outside the frozen parse
 * contract (`Quote`) and is threaded through totals as a parameter.
 *  - percent → a percentage of HT (value in 0..100)
 *  - fixed   → a flat CHF amount off HT
 * Null/absent = no discount.
 */
export type Discount =
  | { kind: "percent"; value: number }
  | { kind: "fixed"; value: number };

/**
 * Normalise a discount from an untrusted source (request body, stored jsonb)
 * into a well-formed Discount or null. Rejects unknown kinds and non-finite /
 * non-positive values, and clamps a percentage into 0..100. The fixed/HT ceiling
 * stays in `discountAmount` (it needs the line total). Returns null for "no
 * discount" — the API and read paths should run untrusted input through this so
 * a malformed value can never reach the money math.
 */
export function normalizeDiscount(raw: unknown): Discount | null {
  if (!raw || typeof raw !== "object") return null;
  const { kind, value } = raw as { kind?: unknown; value?: unknown };
  if (kind !== "percent" && kind !== "fixed") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return kind === "percent" ? { kind, value: Math.min(n, 100) } : { kind, value: n };
}

/** The remise label shown on the recap and the PDF (e.g. "Remise" / "Remise 10%").
 *  One place so the on-screen total and the PDF never drift. */
export function discountLabel(discount: Discount | null): string {
  return discount?.kind === "percent" ? `Remise ${discount.value}%` : "Remise";
}

export interface Totals {
  /** Hors taxe — sum of line amounts, before any remise. */
  ht: number;
  /** CHF removed from HT by the remise (0 when none). */
  discount_amount: number;
  /** HT after the remise — the base TVA is computed on. */
  net: number;
  /** net × the per-devis vatRate (0 when "Aucune"). */
  tva: number;
  /** Toutes taxes comprises. */
  ttc: number;
}

/** Swiss standard VAT rate — the default suggestion and legacy fallback. */
export const VAT_RATE = 8.1;

/**
 * The CHF amount a discount removes from HT. Guarded so net never goes negative:
 * a percentage clamps into 0..100, a fixed amount clamps into 0..HT. A
 * non-positive or absent discount removes nothing.
 */
export function discountAmount(ht: number, discount: Discount | null): number {
  // Reject non-finite (NaN/Infinity) and non-positive values: NaN <= 0 is false,
  // so without the isFinite guard a poisoned value would flow into net/tva/ttc.
  if (!discount || !Number.isFinite(discount.value) || discount.value <= 0) return 0;
  if (discount.kind === "percent") {
    return round2((ht * Math.min(discount.value, 100)) / 100);
  }
  return round2(Math.min(discount.value, ht));
}

/**
 * Compute totals. TVA is a per-devis decision, not dictated in the voice: the
 * builder picks one of their configured rates (or "Aucune"). `vatRate` is that
 * chosen percentage, or null for no VAT. An optional `discount` (remise) is
 * applied to HT BEFORE TVA. HT = sum of line amounts; net = HT − remise.
 */
export function totalsFromLines(
  lines: Line[],
  vatRate: number | null = VAT_RATE,
  discount: Discount | null = null,
): Totals {
  const ht = round2(lines.reduce((sum, l) => sum + l.amount, 0));
  const discount_amount = discountAmount(ht, discount);
  const net = round2(ht - discount_amount);
  const tva = vatRate ? round2((net * vatRate) / 100) : 0;
  const ttc = round2(net + tva);
  return { ht, discount_amount, net, tva, ttc };
}

export function totals(
  quote: Quote,
  vatRate: number | null = VAT_RATE,
  discount: Discount | null = null,
): Totals {
  return totalsFromLines(quote.lines, vatRate, discount);
}

/** Format a CHF amount. Non-finite values render as "—" so a desynced NaN never
 * reaches a client-facing total or PDF. */
export function formatCHF(n: number): string {
  return Number.isFinite(n) ? n.toFixed(2) : "—";
}
