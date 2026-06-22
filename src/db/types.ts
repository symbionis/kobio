/**
 * Persistence row types. These add the storage concerns (owner, ids,
 * timestamps) that the provider-agnostic domain types in src/quote/types.ts
 * deliberately omit. The Quote's `lines` reuse the frozen `Line` contract — the
 * row never re-declares the line shape.
 */

import type { Contact, Line } from "../quote/types";
import type { Discount } from "../quote/totals";

/** One configurable VAT rate the builder can apply to a devis. The label is
 *  free text (e.g. "Normal", "Réduit"); `rate` is the percentage (8.1 = 8.1%). */
export interface VatRate {
  label: string;
  rate: number;
}

/** The person operating the account (1:1 with the auth user). Distinct from the
 *  company — name, e-mail, and phone are person-level. */
export interface UserRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

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
  /** The builder's configurable VAT rates, offered as a choice on each devis. */
  vat_rates: VatRate[];
  logo_ref: string | null;
  /** The builder's single trade (métier). Null until set in Réglages. */
  trade: string | null;
  /** General terms & conditions (CGV) rendered on every devis. Null = none.
   *  Null on rows created before migration 0018. */
  cgv_text: string | null;
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
  /** Client validated/accepted the devis (the step after Envoyé). */
  accepted: boolean;
  /** When the devis was first marked Envoyé / Validé (null until then). */
  sent_at: string | null;
  accepted_at: string | null;
  /** Legacy VAT-on flag; kept in sync with `vat_rate` (= vat_rate != null). */
  tva_applicable: boolean;
  /** The single VAT rate chosen for this devis, or null for "Aucune". */
  vat_rate: number | null;
  /** Optional quote-level discount (remise), applied to HT before TVA. Null =
   *  none. Null on rows created before migration 0017. */
  discount: Discount | null;
  /** Source voice transcript. Null on rows created before migration 0006. */
  transcript: string | null;
  /** The trade (métier) active at dictation; scopes catalog candidates. */
  trade: string | null;
  created_at: string;
  updated_at: string;
}

export interface OverrideRow {
  id: string;
  owner_id: string;
  quote_id: string;
  line_index: number;
  spoken_rate: number;
  candidate_price: number;
  created_at: string;
}

export interface ArticleRow {
  id: string;
  owner_id: string;
  /** Link back to a Bexio article; null for Kobio-created articles. */
  bexio_article_id: number | null;
  code: string | null;
  name: string;
  price: number | null;
  unit: string | null;
  trade: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}
