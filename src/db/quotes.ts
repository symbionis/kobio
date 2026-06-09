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
  tva_applicable: boolean;
  /** Source voice transcript; persisted when migration 0006 has been applied. */
  transcript?: string | null;
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
    tva_applicable: input.tva_applicable,
    updated_at: new Date().toISOString(),
  };
  const row = { ...base, transcript: input.transcript ?? null };

  let { data, error } = await scope.supabase.from("quotes").upsert(row).select().single();
  // Self-healing: before migration 0006 the transcript column doesn't exist and
  // PostgREST rejects the unknown key — retry without it so saves never break.
  if (error && /transcript/i.test(error.message)) {
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
    tva_applicable: boolean;
    transcript?: string | null;
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
    tva_applicable: opts.tva_applicable,
    transcript: opts.transcript,
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
