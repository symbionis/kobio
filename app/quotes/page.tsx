import { FileText, Mic } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOwner } from "../../src/db/auth";
import { listQuotes } from "../../src/db/quotes";
import { deriveStatus, type QuoteStatus } from "../../src/quote/status";
import { formatCHF as CHF, totalsFromLines } from "../../src/quote/totals";

// Reads the DB per request.
export const dynamic = "force-dynamic";

function statusLabel(s: QuoteStatus): string {
  return s === "Draft" ? "Brouillon" : s === "Ready" ? "Prêt" : "Envoyé";
}

function statusClasses(s: QuoteStatus): string {
  if (s === "Sent") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "Ready") return "bg-sky-50 text-sky-700 border-sky-200";
  return "bg-amber-50 text-amber-800 border-amber-200";
}

export default async function LibraryPage() {
  const scope = await requireOwner().catch(() => null);
  if (!scope) redirect("/login?next=/quotes");
  const rows = await listQuotes(scope);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-7 lg:px-10 py-8 sm:py-12">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[38px] leading-tight tracking-tight">Mes devis</h1>
          <p className="text-zinc-600 mt-1 text-[15px]">Vos devis enregistrés.</p>
        </div>
        <Link
          href="/new"
          className="inline-flex items-center gap-2 rounded-full bg-dark text-white px-4 py-3 font-[700] text-[13.9px] hover:bg-black transition"
        >
          <Mic size={16} /> Nouveau devis vocal
        </Link>
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
        <section className="mt-6 rounded-[24px] bg-white shadow-soft border border-line overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_130px] gap-4 px-5 py-3 border-b border-zinc-100 text-[11px] font-mono-label uppercase tracking-wide text-zinc-500">
            <span>Devis</span>
            <span>Statut</span>
            <span className="text-right">Total TTC</span>
          </div>
          <div className="divide-y divide-zinc-100">
            {rows.map((r) => {
              const status = deriveStatus(r.lines, r.sent);
              const ttc = totalsFromLines(r.lines, r.tva_applicable).ttc;
              return (
                <Link
                  key={r.id}
                  href={`/quotes/${r.id}`}
                  className="grid grid-cols-[1fr_120px_130px] gap-4 items-center px-5 py-3.5 hover:bg-paper-2 transition"
                >
                  <span className="font-[650] text-[15px] truncate min-w-0">
                    {r.title || "Sans titre"}
                  </span>
                  <span>
                    <span
                      className={`inline-block text-[11.5px] px-2 py-0.5 rounded-full border ${statusClasses(status)}`}
                    >
                      {statusLabel(status)}
                    </span>
                  </span>
                  <span className="text-right font-[700] text-[15px] tabular-nums">
                    CHF {CHF(ttc)}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
