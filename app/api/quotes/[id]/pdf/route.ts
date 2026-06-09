import { NextResponse } from "next/server";
import { renderQuotePdf } from "../../../../components/QuoteDocument";
import { getClient } from "../../../../../src/db/clients";
import { getCompany } from "../../../../../src/db/company";
import { getQuote, rowToQuote } from "../../../../../src/db/quotes";

export const runtime = "nodejs";

/** GET /api/quotes/[id]/pdf — stream the devis as a PDF (preview/download). */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;

  const row = await getQuote(id);
  if (!row) return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });

  const company = await getCompany();
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
  const client = await getClient(row.client_id);
  if (!client) return NextResponse.json({ error: "Client introuvable." }, { status: 400 });

  try {
    const pdf = await renderQuotePdf(company, client, rowToQuote(row), row.tva_applicable);
    const safeId = id.replace(/[^a-zA-Z0-9-]/g, "");
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="devis-${safeId}.pdf"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Échec de génération du PDF.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
