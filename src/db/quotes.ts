import { asTrade } from "../quote/trades";
import type { Discount } from "../quote/totals";
import type { Contact, Line, Quote } from "../quote/types";
import type { OwnerScope } from "./auth";
import { logOverrides } from "./overrides";
import type { QuoteRow } from "./types";

const EMPTY_CONTACT: Contact = { spoken_name: "", match: null, action: "match_or_create" };

export interface SaveQuoteInput {
  /** Present for update, omitted for create. */
  id?: string;
  title: string;
  contact: Contact;
  client_id: string | null;
  tax_rate_default: number;
  lines: Line[];
  review_notes: string[];
  sent: boolean;
  /** Client validated/accepted the devis. */
  accepted: boolean;
  /** Timestamps of first Envoyé / Validé, computed by the save route. */
  sent_at: string | null;
  accepted_at: string | null;
  /** Chosen VAT rate for this devis, or null for "Aucune". */
  vat_rate: number | null;
  /** Optional quote-level discount (remise); persisted when migration 0017 has
   *  been applied. */
  discount?: Discount | null;
  /** Source voice transcript; persisted when migration 0006 has been applied. */
  transcript?: string | null;
  /** The trade (métier) active at dictation. */
  trade?: string | null;
}

/**
 * Create or update a quote, owned by the signed-in user. RLS enforces the owner
 * boundary; `owner_id` is set from the session (never a request body) and the
 * explicit filter is defense-in-depth.
 */
export async function saveQuote(scope: OwnerScope, input: SaveQuoteInput): Promise<QuoteRow> {
  const base = {
    ...(input.id ? { id: input.id } : {}),
    owner_id: scope.ownerId,
    client_id: input.client_id,
    title: input.title,
    contact: input.contact,
    tax_rate_default: input.tax_rate_default,
    lines: input.lines,
    review_notes: input.review_notes,
    sent: input.sent,
    accepted: input.accepted,
    sent_at: input.sent_at,
    accepted_at: input.accepted_at,
    vat_rate: input.vat_rate,
    // Legacy flag, kept in sync so any path still reading it stays correct.
    // Truthiness (not `!= null`) matches totalsFromLines: a 0% rate applies no
    // VAT, same as "Aucune" (null), so both resolve to false here.
    tva_applicable: Boolean(input.vat_rate),
    // Validate centrally so no save path can persist an unknown trade value.
    trade: asTrade(input.trade),
    updated_at: new Date().toISOString(),
  };
  // transcript (migration 0006) and discount (0017) layer on top of base.
  const row = { ...base, discount: input.discount ?? null, transcript: input.transcript ?? null };

  let { data, error } = await scope.supabase.from("quotes").upsert(row).select().single();
  // Self-healing: before those migrations the columns don't exist and PostgREST
  // rejects the unknown keys — retry without them so saves never break.
  if (error && /transcript|discount/i.test(error.message)) {
    ({ data, error } = await scope.supabase.from("quotes").upsert(base).select().single());
  }
  if (error) throw new Error(`saveQuote failed: ${error.message}`);
  return data as QuoteRow;
}

/** Reconstruct the editable Quote shape from a stored row. */
export function rowToQuote(row: QuoteRow): Quote {
  return {
    intent: "create_offer",
    // Rows backfilled by the contact migration carry {} — fall back to a valid Contact.
    contact: row.contact?.spoken_name !== undefined ? row.contact : EMPTY_CONTACT,
    title: row.title,
    // Postgres numeric can arrive as a string; coerce so callers can do math on it.
    tax_rate_default: Number(row.tax_rate_default),
    lines: row.lines,
    review_notes: row.review_notes,
  };
}

/**
 * Save a quote and log its rate overrides. Override logging is a
 * non-authoritative learning signal, so a failure there must NOT fail the save
 * (otherwise the client retries and creates a duplicate quote). One place for
 * both routes to call.
 */
export async function persistQuote(
  scope: OwnerScope,
  quote: Quote,
  opts: {
    id?: string;
    client_id: string | null;
    sent: boolean;
    accepted: boolean;
    sent_at: string | null;
    accepted_at: string | null;
    vat_rate: number | null;
    discount?: Discount | null;
    transcript?: string | null;
    trade?: string | null;
  },
): Promise<QuoteRow> {
  const saved = await saveQuote(scope, {
    id: opts.id,
    title: quote.title,
    contact: quote.contact,
    client_id: opts.client_id,
    tax_rate_default: quote.tax_rate_default,
    lines: quote.lines,
    review_notes: quote.review_notes,
    sent: opts.sent,
    accepted: opts.accepted,
    sent_at: opts.sent_at,
    accepted_at: opts.accepted_at,
    vat_rate: opts.vat_rate,
    discount: opts.discount,
    transcript: opts.transcript,
    trade: opts.trade,
  });
  try {
    // override_log.owner_id is the parent quote's owner (= scope.ownerId).
    await logOverrides(scope, saved.id, quote.lines);
  } catch (err) {
    console.error("logOverrides failed (non-fatal):", err instanceof Error ? err.message : err);
  }
  return saved;
}

/** Fetch one quote by id, scoped to the owner (RLS + explicit filter). Null when not found. */
export async function getQuote(scope: OwnerScope, id: string): Promise<QuoteRow | null> {
  const { data, error } = await scope.supabase
    .from("quotes")
    .select()
    .eq("id", id)
    .eq("owner_id", scope.ownerId)
    .maybeSingle();
  if (error) throw new Error(`getQuote failed: ${error.message}`);
  return (data as QuoteRow) ?? null;
}

/** List the owner's quotes, most recently updated first. */
export async function listQuotes(scope: OwnerScope): Promise<QuoteRow[]> {
  const { data, error } = await scope.supabase
    .from("quotes")
    .select()
    .eq("owner_id", scope.ownerId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`listQuotes failed: ${error.message}`);
  return (data as QuoteRow[]) ?? [];
}
