"use client";

import { ArrowRight, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ClientRow } from "../../src/db/types";
import ClientFormModal from "../components/ClientFormModal";
import QuotesList from "../quotes/QuotesList";
import type { QuoteListRow } from "../quotes/quoteRow";

export default function ClientManager({
  initialClients,
  quotesByClient,
}: {
  initialClients: ClientRow[];
  quotesByClient: Record<string, QuoteListRow[]>;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const shown = q
    ? initialClients.filter((c) =>
        [c.name, c.city, c.email].some((v) => v?.toLowerCase().includes(q)),
      )
    : initialClients;

  return (
    <>
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un client…"
            className="w-full rounded-full border border-line bg-white pl-9 pr-3 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-[#ffbb94]"
          />
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-dark text-white px-4 py-2.5 text-[14px] font-[650] hover:bg-black transition shrink-0"
        >
          <Plus size={16} /> Ajouter
        </button>
      </div>

      {initialClients.length === 0 ? (
        <div className="rounded-[24px] bg-white border border-line shadow-soft p-10 text-center text-[15px] text-zinc-500">
          Aucun client pour l'instant.
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-[24px] bg-white border border-line shadow-soft p-8 text-center text-[14px] text-zinc-500">
          Aucun client trouvé.
        </div>
      ) : (
        <div className="space-y-4">
          {shown.map((c) => {
            const rows = quotesByClient[c.id] ?? [];
            return (
              <section
                key={c.id}
                className="rounded-[24px] bg-white shadow-soft border border-line p-5 sm:p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/clients/${c.id}`} className="group min-w-0">
                    <div className="font-[700] text-[17px] group-hover:text-brand transition truncate">
                      {c.name}
                    </div>
                    <div className="text-[13.5px] text-zinc-500 mt-0.5 truncate">
                      {[c.postcode, c.city].filter(Boolean).join(" ") || "Sans adresse"}
                      {c.email ? ` · ${c.email}` : ""}
                    </div>
                  </Link>
                  <Link
                    href={`/clients/${c.id}`}
                    aria-label="Détails du client"
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-black transition shrink-0"
                  >
                    <ArrowRight size={18} />
                  </Link>
                </div>

                {rows.length > 0 && (
                  <div className="mt-4">
                    <QuotesList rows={rows} showFilter={false} limit={1} embedded showContact={false} />
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <ClientFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => router.refresh()}
      />
    </>
  );
}
