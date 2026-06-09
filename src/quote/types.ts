/**
 * The quote schema as TypeScript types — the parser output contract.
 * Mirrors refs/quote-schema.md exactly. Trade-agnostic by design: the shape
 * never changes between trades, only the content.
 *
 * Two shapes are modelled deliberately:
 *  - `ExtractedQuote` / `ExtractedLine` — what the Claude call emits. It is a
 *    *faithful extractor only*: it never produces `amount`, and it leaves
 *    `quantity.value` null whenever there is an `expression` (code computes it).
 *  - `Quote` / `Line` — the finished object after code fills `value`/`amount`
 *    and the cross-line safety net appends its `review_notes`.
 *
 * See BUILD.md "Parse contract" for who owns what.
 */

export type QuantityKind = "area" | "count" | "linear" | "hours" | "forfait";

/** m2 | Stk | h | ml | null — null for forfait and bare lump lines. */
export type Unit = "m2" | "Stk" | "h" | "ml" | null;

export type Confidence = "high" | "low" | "none";

/** Three-state per the schema: spoken≠confident match | spoken=match | nothing to compare. */
export type PriceOverride = boolean | "n/a";

export interface CatalogCandidate {
  article_id: number;
  name: string;
  catalog_price: number;
}

export interface CatalogMatch {
  /** 0..n; never assume 1:1. One spoken line can blend two articles or map to none. */
  candidates: CatalogCandidate[];
  confidence: Confidence;
}

export interface Quantity {
  kind: QuantityKind;
  /** The formula exactly as spoken; null when none was dictated. */
  expression: string | null;
  /** Computed result; null when kind === "forfait". */
  value: number | null;
  unit: Unit;
}

export interface Line {
  /** The span of transcript this line came from. */
  raw_text: string;
  /** Cleaned line text for the quote. */
  description: string;
  quantity: Quantity;
  /** Price per unit, or the forfait lump. */
  rate: number;
  rate_source: "spoken" | "catalog_default";
  /** value * rate; for forfait = rate. Owned by code, never the model. */
  amount: number;
  catalog_match: CatalogMatch;
  price_override: PriceOverride;
  tax_rate: number;
  needs_review: boolean;
}

export interface Contact {
  /** Exactly as transcribed. */
  spoken_name: string;
  /** Resolved Bexio contact_id, or null until a lookup resolves it. */
  match: number | null;
  action: "match_or_create" | "matched" | "create_new";
}

export interface Quote {
  intent: "create_offer";
  contact: Contact;
  title: string;
  tax_rate_default: number;
  lines: Line[];
  /** Document-level flags for his eye, including cross-line concerns. */
  review_notes: string[];
}

/**
 * Provider-agnostic domain entities. These describe what a company and a client
 * *are* for any trade — Bexio (and future adaptors) map onto them, they never
 * shape them. Persistence concerns (owner, ids, timestamps) live in the data
 * layer's row types, not here.
 */

/**
 * The issuer's details a devis needs in its header. Domain-named; a provider
 * adaptor maps these onto Bexio's company_profile (name, address, postcode,
 * city, country_id, mail, phone_fixed, ust_id_nr, iban) and its logo endpoint.
 */
export interface Company {
  id: string;
  name: string;
  address: string | null;
  postcode: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  vat_number: string | null;
  /** Logo as a base64 data URL, rendered into the PDF header. */
  logo_ref: string | null;
}

/**
 * A client a quote can be billed to. Distinct from a parsed line's spoken
 * `Contact`. Maps onto a Bexio contact (name → name_1, email → mail,
 * phone → phone_fixed, country → country_id).
 */
export interface Client {
  id: string;
  name: string;
  address: string | null;
  postcode: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
}

/**
 * The extraction call's output: a Line minus the fields code owns. `amount` and
 * `price_override` are absent entirely (code computes / derives them);
 * `quantity.value` is carried only for a bare spoken count (no expression), and
 * is null/ignored when an expression is present.
 */
export type ExtractedLine = Omit<Line, "amount" | "price_override">;

export type ExtractedQuote = Omit<Quote, "lines"> & { lines: ExtractedLine[] };
