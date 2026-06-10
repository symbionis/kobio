import { NextResponse } from "next/server";
import { UnauthorizedError, requireOwner } from "../../../src/db/auth";
import { captureServer, captureServerException } from "../../../src/lib/posthog-server";
import { persistQuote } from "../../../src/db/quotes";
import type { Quote } from "../../../src/quote/types";

export const runtime = "nodejs";

interface SaveBody {
  quote: Quote;
  client_id?: string | null;
  sent?: boolean;
  accepted?: boolean;
  vat_rate?: number | null;
  transcript?: string | null;
  trade?: string | null;
}

/** POST /api/quotes — create a quote, logging any rate overrides. */
export async function POST(request: Request): Promise<Response> {
  let body: SaveBody;
  try {
    body = (await request.json()) as SaveBody;
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }
  if (!body?.quote || !Array.isArray(body.quote.lines)) {
    return NextResponse.json({ error: "Devis invalide." }, { status: 400 });
  }

  try {
    const scope = await requireOwner();
    const now = new Date().toISOString();
    const sent = body.sent ?? false;
    const accepted = body.accepted ?? false;
    const saved = await persistQuote(scope, body.quote, {
      client_id: body.client_id ?? null,
      sent,
      accepted,
      sent_at: sent ? now : null,
      accepted_at: accepted ? now : null,
      vat_rate: body.vat_rate ?? null,
      transcript: body.transcript ?? null,
      trade: body.trade ?? null,
    });
    await captureServer(scope.ownerId, "quote_created", {
      quote_id: saved.id,
      line_count: body.quote.lines.length,
      has_client: Boolean(body.client_id),
      sent,
      accepted,
      trade: body.trade ?? null,
    });
    return NextResponse.json({ id: saved.id }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    await captureServerException(err, undefined, { route: "POST /api/quotes" });
    const message = err instanceof Error ? err.message : "Erreur d'enregistrement.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
