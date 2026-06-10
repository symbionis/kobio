import { requireOwnerForPage } from "../../src/db/auth";
import { listClients } from "../../src/db/clients";
import { listQuotes } from "../../src/db/quotes";
import { type QuoteListRow, toQuoteListRow } from "../quotes/quoteRow";
import ClientManager from "./ClientManager";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const scope = await requireOwnerForPage("/clients");
  const [clients, quotes] = await Promise.all([listClients(scope), listQuotes(scope)]);

  // Group each client's devis (already sorted most-recent-first by listQuotes).
  const quotesByClient: Record<string, QuoteListRow[]> = {};
  for (const q of quotes) {
    if (!q.client_id) continue;
    (quotesByClient[q.client_id] ??= []).push(toQuoteListRow(q, null));
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-7 lg:px-10 py-8 sm:py-12">
      <h1 className="font-display text-[38px] leading-tight tracking-tight">Clients</h1>
      <p className="text-zinc-600 mt-1 text-[15px] mb-6">Vos clients et leurs devis.</p>
      <ClientManager initialClients={clients} quotesByClient={quotesByClient} />
    </main>
  );
}
