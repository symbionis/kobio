/**
 * The fixed set of trades (métiers). One trade per builder — no multi-trade.
 * Stored as `text` in the DB (company_profile.trade, quotes.trade, articles.trade)
 * for forward flexibility; this constant is the single source of values + labels,
 * validated app-side. Shared by the dictation selector and company settings.
 */
export interface Trade {
  value: string;
  label: string;
}

export const TRADES: readonly Trade[] = [
  { value: "peinture", label: "Peinture" },
  { value: "plomberie", label: "Plomberie" },
  { value: "electricite", label: "Électricité" },
  { value: "maconnerie", label: "Maçonnerie" },
  { value: "menuiserie", label: "Menuiserie" },
  { value: "carrelage", label: "Carrelage" },
  { value: "multiservices", label: "Multiservices" },
];

const VALUES = new Set(TRADES.map((t) => t.value));

/** True when `v` is a known trade value. */
export function isTrade(v: unknown): v is string {
  return typeof v === "string" && VALUES.has(v);
}

/** Normalise input to a valid trade value, or null. */
export function asTrade(v: unknown): string | null {
  return isTrade(v) ? v : null;
}

/** Human label for a trade value (or null). */
export function tradeLabel(value: string | null): string | null {
  return TRADES.find((t) => t.value === value)?.label ?? null;
}
