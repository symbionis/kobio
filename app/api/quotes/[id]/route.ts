import { NextResponse } from "next/server";
import { UnauthorizedError, requireOwner } from "../../../../src/db/auth";
import { getQuote, persistQuote } from "../../../../src/db/quotes";
import type { Discount } from "../../../../src/quote/totals";
import type { Quote } from "../../../../src/quote/types";

export const runtime = "nodejs";

interface UpdateBody {
  quote: Quote;
  client_id?: string | null;
  sent?: boolean;
  accepted?: boolean;
  vat_rate?: number | null;
  discount?: Discount | null;
  transcript?: string | null;
  trade?: string | null;
}

/** PUT /api/quotes/[id] — update an existing quote (404 if it doesn't exist). */
export async function PUT(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;

  let body: UpdateBody;
  try {
    body = (await request.json()) as UpdateBody;
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }
  if (!body?.quote || !Array.isArray(body.quote.lines)) {
    return NextResponse.json({ error: "Devis invalide." }, { status: 400 });
  }

  try {
    const scope = await requireOwner();
    // Update, not upsert-by-id: a PUT to a non-existent (or non-owned) id is 404.
    const existing = await getQuote(scope, id);
    if (!existing) return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });

    // Stamp the first time each status is set; clear when toggled back off.
    const now = new Date().toISOString();
    const sent = body.sent ?? false;
    const accepted = body.accepted ?? false;

    const saved = await persistQuote(scope, body.quote, {
      id,
      client_id: body.client_id ?? null,
      sent,
      accepted,
      sent_at: sent ? (existing.sent_at ?? now) : null,
      accepted_at: accepted ? (existing.accepted_at ?? now) : null,
      vat_rate: body.vat_rate ?? null,
      discount: body.discount ?? null,
      transcript: body.transcript ?? null,
      trade: body.trade ?? null,
    });
    return NextResponse.json({ id: saved.id });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Erreur d'enregistrement.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
