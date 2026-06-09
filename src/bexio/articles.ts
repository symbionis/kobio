import { bexio } from "./client.js";

/**
 * Articles = the products and services Nicolas has set up in Bexio,
 * with their prices. This is the catalog the voice note maps onto.
 *
 * Field names below reflect the Bexio 2.0 article shape. Confirm against
 * the live response in refs/catalog.json after the first pull — accounts
 * vary, and some fields may be null if he doesn't use them.
 */

/*
 * Corrected against refs/catalog.json (24 articles, Nicolas's account, 2026-06).
 * Types and null-ness reflect what is *actually* populated here, not the
 * generic Bexio schema. Notes per field below.
 *
 * Two corrections worth calling out:
 *  - There is NO `deliver_price` field. The earlier interface invented it and
 *    labelled it "selling price" — the real selling price is `sale_price`.
 *    (A correctly-spelled `delivery_price` exists but is always null here.)
 *    smoke.ts reads `a.deliver_price` as a fallback; that always missed.
 *  - `unit_id` is populated on only 4 of 24 articles. Most lines carry no unit.
 */
export interface Article {
  id: number;
  user_id: number; // always 1 on this account
  article_type_id: number; // 1 or 2 (service-style entries either way here)
  contact_id: number | null; // populated on 1/24 (the one deliverer-linked item)

  // Deliverer block — empty string ("") on most, null on the 3 newest items.
  deliverer_code: string | null;
  deliverer_name: string | null;
  deliverer_description: string | null;

  // The catalog identity. intern_name is the human-readable label and is
  // always present. intern_code is the painter's numbering (may be "").
  intern_code: string;
  intern_name: string;
  intern_description: string; // HTML-ish; "" when unused, never null here

  // Pricing. sale_price is the only price field with data, and it's a string
  // like "65.000000". Null on 6/24 (priced ad-hoc, e.g. protection/installation).
  sale_price: string | null;
  purchase_price: null; // ALWAYS NULL on this account
  purchase_total: null; // ALWAYS NULL
  sale_total: null; // ALWAYS NULL
  delivery_price: null; // ALWAYS NULL (note: NOT the selling price)

  currency_id: number; // 1 on all but one item (CHF); 2 appears once
  tax_income_id: number; // 16 or 32
  tax_id: number; // 16 or 32 (mirrors tax_income_id here)
  tax_expense_id: number; // 47 / 31 / 42

  // The field that lets a voice-note quantity map to a line. Populated on only
  // 4/24 articles (unit_id 1 ×2, unit_id 2 ×2); null on the other 20.
  unit_id: number | null;

  // Stock block — this is a services catalog, so none of it is meaningful.
  is_stock: boolean; // always false
  stock_id: null; // ALWAYS NULL
  stock_place_id: null; // ALWAYS NULL
  stock_nr: number; // always 0
  stock_min_nr: number; // always 0
  stock_reserved_nr: number; // varies, but stock isn't tracked — ignore
  stock_available_nr: number; // always 0
  stock_picked_nr: number; // always 0
  stock_disposed_nr: number; // always 0
  stock_ordered_nr: number; // always 0

  // Physical/dimension fields — ALWAYS NULL (not a physical-goods catalog).
  width: null;
  height: null;
  weight: null;
  volume: null;

  html_text: null; // ALWAYS NULL
  remarks: string | null; // "" on most, null on the 3 newest items
  article_group_id: null; // ALWAYS NULL
  account_id: number | null; // 101 on most; null on the 3 newest items
  expense_account_id: null; // ALWAYS NULL
}

/** Fetch a page of articles. Bexio paginates; default page size is 500-ish. */
export function listArticles(offset = 0, limit = 500): Promise<Article[]> {
  return bexio.get<Article[]>("/2.0/article", { offset, limit });
}

/** Pull every article by walking pages until a short page comes back. */
export async function listAllArticles(): Promise<Article[]> {
  const all: Article[] = [];
  const limit = 500;
  let offset = 0;
  // Guard against runaway loops on a misbehaving endpoint.
  for (let i = 0; i < 50; i++) {
    const page = await listArticles(offset, limit);
    all.push(...page);
    if (page.length < limit) break;
    offset += limit;
  }
  return all;
}

/** Server-side search by name/code. Useful once the catalog is large. */
export function searchArticles(term: string): Promise<Article[]> {
  return bexio.post<Article[]>("/2.0/article/search", [
    { field: "intern_name", value: term, criteria: "like" },
  ]);
}
