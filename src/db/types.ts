/**
 * Persistence row types. These add the storage concerns (owner, ids,
 * timestamps) that the provider-agnostic domain types in src/quote/types.ts
 * deliberately omit. The Quote's `lines` reuse the frozen `Line` contract — the
 * row never re-declares the line shape.
 */

import type { Contact, Line } from "../quote/types";

export interface CompanyRow {
  id: string;
  owner_id: string;
  name: string;
  address: string | null;
  postcode: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  vat_number: string | null;
  logo_ref: string | null;
}

export interface ClientRow {
  id: string;
  owner_id: string;
  name: string;
  address: string | null;
  postcode: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
}

export interface QuoteRow {
  id: string;
  owner_id: string;
  client_id: string | null;
  title: string;
  contact: Contact;
  tax_rate_default: number;
  lines: Line[];
  review_notes: string[];
  sent: boolean;
  tva_applicable: boolean;
  /** Source voice transcript. Null on rows created before migration 0006. */
  transcript: string | null;
  created_at: string;
  updated_at: string;
}

export interface OverrideRow {
  id: string;
  quote_id: string;
  line_index: number;
  spoken_rate: number;
  candidate_price: number;
  created_at: string;
}
