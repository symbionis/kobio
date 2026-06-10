import { notFound } from "next/navigation";
import { requireOwnerForPage } from "../../../src/db/auth";
import { getClient } from "../../../src/db/clients";
import { listQuotes } from "../../../src/db/quotes";
import { toQuoteListRow } from "../../quotes/quoteRow";
import ClientDetail from "./ClientDetail";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scope = await requireOwnerForPage(`/clients/${id}`);
  const client = await getClient(scope, id);
  if (!client) notFound();

  const quotes = await listQuotes(scope);
  const rows = quotes.filter((q) => q.client_id === id).map((q) => toQuoteListRow(q));

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-7 lg:px-10 py-8 sm:py-12">
      <ClientDetail client={client} quoteRows={rows} />
    </main>
  );
}
