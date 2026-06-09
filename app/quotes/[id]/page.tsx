import { notFound, redirect } from "next/navigation";
import { requireOwner } from "../../../src/db/auth";
import { listClients } from "../../../src/db/clients";
import { getCompany } from "../../../src/db/company";
import { getQuote, rowToQuote } from "../../../src/db/quotes";
import SavedQuoteEditor from "./SavedQuoteEditor";

// Reads the DB per request.
export const dynamic = "force-dynamic";

export default async function SavedQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scope = await requireOwner().catch(() => null);
  if (!scope) redirect(`/login?next=/quotes/${id}`);
  const row = await getQuote(scope, id);
  if (!row) notFound();

  const [clients, company] = await Promise.all([listClients(scope), getCompany(scope)]);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-7 lg:px-10 py-8 sm:py-12">
      <SavedQuoteEditor
        id={row.id}
        initialQuote={rowToQuote(row)}
        initialTranscript={row.transcript ?? ""}
        trade={row.trade ?? null}
        clientId={row.client_id}
        sent={row.sent}
        tvaApplicable={row.tva_applicable}
        companyHasVat={Boolean(company?.vat_number)}
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
      />
    </main>
  );
}
