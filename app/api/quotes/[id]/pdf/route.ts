import { NextResponse } from "next/server";
import { renderQuotePdf } from "../../../../components/QuoteDocument";
import { UnauthorizedError, requireOwner } from "../../../../../src/db/auth";
import { getClient } from "../../../../../src/db/clients";
import { getCompany } from "../../../../../src/db/company";
import { getQuote, rowToQuote } from "../../../../../src/db/quotes";
import { getUser } from "../../../../../src/db/users";
import { captureServer, captureServerException } from "../../../../../src/lib/posthog-server";

export const runtime = "nodejs";

/** GET /api/quotes/[id]/pdf — stream the devis as a PDF (preview/download).
 *  Owner-gated: requireOwner() first, and every fetch goes through the user
 *  client so RLS prevents reading another tenant's quote/company/client. */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;

  let scope: Awaited<ReturnType<typeof requireOwner>>;
  try {
    scope = await requireOwner();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    throw err;
  }

  const row = await getQuote(scope, id);
  if (!row) return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });

  const company = await getCompany(scope);
  if (!company) {
    return NextResponse.json(
      { error: "Renseignez le profil de l'entreprise (Réglages) avant de générer le PDF." },
      { status: 400 },
    );
  }
  if (!row.client_id) {
    return NextResponse.json(
      { error: "Attachez un client au devis avant de générer le PDF." },
      { status: 400 },
    );
  }
  const client = await getClient(scope, row.client_id);
  if (!client) return NextResponse.json({ error: "Client introuvable." }, { status: 400 });

  const user = await getUser(scope);

  try {
    const vatRate = row.vat_rate == null ? null : Number(row.vat_rate);
    const pdf = await renderQuotePdf(company, client, rowToQuote(row), vatRate, row.created_at, user);
    const safeId = id.replace(/[^a-zA-Z0-9-]/g, "");
    await captureServer(scope.ownerId, "quote_pdf_generated", { quote_id: id });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="devis-${safeId}.pdf"`,
      },
    });
  } catch (err) {
    await captureServerException(err, scope.ownerId, { route: "GET /api/quotes/[id]/pdf", quote_id: id });
    const message = err instanceof Error ? err.message : "Échec de génération du PDF.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
