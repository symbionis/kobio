import { FileText } from "lucide-react";
import Link from "next/link";
import { requireOwnerForPage } from "../../src/db/auth";
import { listClients } from "../../src/db/clients";
import { listQuotes } from "../../src/db/quotes";
import QuotesList from "./QuotesList";
import { toQuoteListRow } from "./quoteRow";

// Reads the DB per request.
export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const scope = await requireOwnerForPage("/quotes");
  const [rows, clients] = await Promise.all([listQuotes(scope), listClients(scope)]);

  // Resolve each quote's attached client name (falls back to the dictated contact).
  const clientNameById = new Map(clients.map((c) => [c.id, c.name]));
  const listRows = rows.map((r) => toQuoteListRow(r, r.client_id ? clientNameById.get(r.client_id) : null));

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-7 lg:px-10 py-8 sm:py-12">
      <div>
        <h1 className="font-display text-[38px] leading-tight tracking-tight">Mes devis</h1>
        <p className="text-zinc-600 mt-1 text-[15px]">Vos devis enregistrés.</p>
      </div>

      {rows.length === 0 ? (
        <div className="mt-7 rounded-[24px] bg-white border border-line shadow-soft p-10 text-center">
          <FileText size={30} className="mx-auto text-zinc-400" />
          <div className="mt-3 text-[17px] font-[700]">Aucun devis enregistré</div>
          <div className="text-zinc-600 mt-1">
            Dictez votre premier chantier, Kobio s'occupe du reste.
          </div>
          <Link
            href="/new"
            className="mt-4 inline-block bg-brand text-white px-4 py-2.5 rounded-full font-[700] hover:bg-brand-dark transition"
          >
            Commencer
          </Link>
        </div>
      ) : (
        <QuotesList rows={listRows} />
      )}
    </main>
  );
}
