"use client";

import { User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { QuoteListRow, StatusKey } from "./quoteRow";

const STATUS_META: Record<StatusKey, { label: string; classes: string }> = {
  Draft: { label: "Brouillon", classes: "bg-amber-50 text-amber-800 border-amber-200" },
  Ready: { label: "Prêt", classes: "bg-sky-50 text-sky-700 border-sky-200" },
  Sent: { label: "Envoyé", classes: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  Accepted: { label: "Validé", classes: "bg-emerald-100 text-emerald-800 border-emerald-300" },
};

const ORDER: StatusKey[] = ["Draft", "Ready", "Sent", "Accepted"];

interface Props {
  rows: QuoteListRow[];
  /** Status filter chips above the list. */
  showFilter?: boolean;
  /** Cap the number of rows shown; a "Voir tous" link appears when there's more. */
  limit?: number;
  /** Where the "Voir tous" link points (e.g. a client detail page). */
  moreHref?: string;
  /** Embedded (e.g. under a client) — no white card, lighter chrome. */
  embedded?: boolean;
  /** Show the contact line under each title. Off for client-scoped lists
   *  (a client's own detail page), where the name would be redundant. */
  showContact?: boolean;
}

function Row({ r, showContact }: { r: QuoteListRow; showContact: boolean }) {
  const meta = STATUS_META[r.status];
  return (
    <Link href={`/quotes/${r.id}`} className="block px-5 py-3.5 hover:bg-paper-2 transition">
      <div className="font-[650] text-[15px] leading-snug">{r.title}</div>
      {showContact && r.contact && (
        <div className="mt-1 flex items-center gap-1.5 text-[13.5px] text-zinc-500 min-w-0">
          <User size={14} className="shrink-0 text-zinc-400" />
          <span className="truncate">{r.contact}</span>
        </div>
      )}
      <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-zinc-100 px-2.5 py-1.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`inline-block text-[11.5px] px-2 py-0.5 rounded-full border whitespace-nowrap ${meta.classes}`}
          >
            {meta.label}
          </span>
          {r.dateLabel && (
            <span className="text-[12px] text-zinc-500 whitespace-nowrap">{r.dateLabel}</span>
          )}
        </div>
        <span className="font-[600] text-[14.5px] tabular-nums whitespace-nowrap">
          CHF {r.ttcLabel}
        </span>
      </div>
    </Link>
  );
}

export default function QuotesList({
  rows,
  showFilter = true,
  limit,
  moreHref,
  embedded = false,
  showContact = true,
}: Props) {
  const [filter, setFilter] = useState<StatusKey | "all">("all");

  const counts = ORDER.reduce(
    (acc, s) => ({ ...acc, [s]: rows.filter((r) => r.status === s).length }),
    {} as Record<StatusKey, number>,
  );
  const present = ORDER.filter((s) => counts[s] > 0);
  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const shown = limit ? filtered.slice(0, limit) : filtered;
  const hiddenCount = filtered.length - shown.length;

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-[13px] font-[600] border transition ${
      active ? "bg-dark text-white border-dark" : "bg-white border-line text-zinc-600 hover:bg-paper-2"
    }`;

  const container = embedded
    ? "rounded-xl border border-zinc-200 overflow-hidden bg-white"
    : "rounded-[24px] bg-white shadow-soft border border-line overflow-hidden";

  return (
    <>
      {showFilter && (
        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={() => setFilter("all")} className={chip(filter === "all")}>
            Tous ({rows.length})
          </button>
          {present.map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={chip(filter === s)}>
              {STATUS_META[s].label} ({counts[s]})
            </button>
          ))}
        </div>
      )}

      <div className={`${showFilter ? "mt-4" : ""} ${container}`}>
        {shown.length === 0 ? (
          <div className="px-5 py-8 text-center text-[14px] text-zinc-500">
            {rows.length === 0 ? "Aucun devis." : "Aucun devis avec ce statut."}
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {shown.map((r) => (
              <Row key={r.id} r={r} showContact={showContact} />
            ))}
          </div>
        )}

        {hiddenCount > 0 && moreHref && (
          <Link
            href={moreHref}
            className="block px-5 py-3 text-[13.5px] font-[600] text-brand hover:bg-paper-2 border-t border-zinc-100 transition"
          >
            Voir tous les devis ({filtered.length}) →
          </Link>
        )}
      </div>
    </>
  );
}
