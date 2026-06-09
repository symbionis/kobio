import { NextResponse } from "next/server";
import { getQuote, persistQuote } from "../../../../src/db/quotes";
import type { Quote } from "../../../../src/quote/types";

export const runtime = "nodejs";

interface UpdateBody {
  quote: Quote;
  client_id?: string | null;
  sent?: boolean;
  tva_applicable?: boolean;
  transcript?: string | null;
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
    // Update, not upsert-by-id: a PUT to a non-existent id is a 404, not a create.
    const existing = await getQuote(id);
    if (!existing) return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });

    const saved = await persistQuote(body.quote, {
      id,
      client_id: body.client_id ?? null,
      sent: body.sent ?? false,
      tva_applicable: body.tva_applicable ?? true,
      transcript: body.transcript ?? null,
    });
    return NextResponse.json({ id: saved.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur d'enregistrement.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
