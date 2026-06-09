"use client";

import { AlertTriangle, Check, Save } from "lucide-react";
import type { ReactNode } from "react";
import { round2 } from "../../src/quote/compute";
import { parseNum } from "../../src/quote/input";
import { deriveStatus } from "../../src/quote/status";
import { VAT_RATE, formatCHF, totalsFromLines } from "../../src/quote/totals";
import type { Line, Quote } from "../../src/quote/types";
import { cn } from "../lib/cn";

const CHF = formatCHF;

interface QuoteEditorProps {
  quote: Quote;
  onChange: (quote: Quote) => void;
  /** When provided, a Save button renders in the summary. */
  onSave?: () => void;
  saving?: boolean;
  saveLabel?: string;
  /** TVA toggle — shown only when the issuer is VAT-registered (available). */
  vat?: { available: boolean; applicable: boolean; onChange: (b: boolean) => void };
  /** Extra controls rendered in the sticky right rail, below the totals
   *  (e.g. client picker, status, PDF on the saved-quote screen). */
  summaryExtras?: ReactNode;
}

const numInput =
  "text-right bg-paper-2 border border-[#ead3ba] rounded-lg px-2 py-1.5 text-[14px] outline-none focus:ring-2 focus:ring-[#ffbb94]";

/**
 * The editable quote surface, shared by the new-quote screen and the saved-quote
 * screen. Controlled: every edit calls `onChange` with the updated quote. Code
 * owns the maths — quantity/rate edits recompute amount with the same `round2`
 * rule as the server, and totals are read-only.
 */
export default function QuoteEditor({
  quote,
  onChange,
  onSave,
  saving,
  saveLabel,
  vat,
  summaryExtras,
}: QuoteEditorProps) {
  function patchLine(index: number, next: Line) {
    onChange({ ...quote, lines: quote.lines.map((l, i) => (i === index ? next : l)) });
  }

  function onDescription(i: number, line: Line, v: string) {
    patchLine(i, { ...line, description: v });
  }

  function onValue(i: number, line: Line, raw: string) {
    const value = parseNum(raw);
    patchLine(i, { ...line, quantity: { ...line.quantity, value }, amount: round2(value * line.rate) });
  }

  function onRate(i: number, line: Line, raw: string) {
    const rate = parseNum(raw);
    const value = line.quantity.value;
    patchLine(i, { ...line, rate, amount: value === null ? round2(rate) : round2(value * rate) });
  }

  function onAmount(i: number, line: Line, raw: string) {
    patchLine(i, { ...line, amount: parseNum(raw) });
  }

  // Clearing a line's review flag is how a Draft becomes Ready (status re-derives).
  function resolveLine(i: number, line: Line) {
    patchLine(i, { ...line, needs_review: false });
  }

  const vatApplicable = vat?.available ? vat.applicable : false;
  const totals = totalsFromLines(quote.lines, vatApplicable);
  const status = deriveStatus(quote.lines, false);
  const isDraft = status === "Draft";

  return (
    <div className="grid lg:grid-cols-[1.29fr_.71fr] gap-6">
      {/* Left: meta + lines */}
      <div className="space-y-5">
        {quote.review_notes.length > 0 && (
          <section className="rounded-[20px] bg-[#fff8ed] border border-[#f3d39b] p-4 sm:p-5">
            <div className="flex items-center gap-2 text-[12px] font-mono-label uppercase tracking-wide text-[#92400e]">
              <AlertTriangle size={15} /> À vérifier
            </div>
            <ul className="mt-2 space-y-1 text-[14px] text-[#7c4a08]">
              {quote.review_notes.map((n, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-0.5">•</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-[24px] bg-white shadow-soft border border-line p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-[11.5px] font-mono-label text-zinc-500 mb-1">DEVIS</div>
              <h2 className="font-display text-[26px] leading-tight tracking-tight">
                {quote.title || "Devis sans titre"}
              </h2>
              <div className="text-[14px] text-zinc-600 mt-1">
                Contact : <span className="font-[600]">{quote.contact.spoken_name || "—"}</span>
              </div>
            </div>
            <span
              className={cn(
                "px-3 py-1.5 rounded-full text-[12.5px] font-[600] border whitespace-nowrap",
                isDraft
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700",
              )}
            >
              {isDraft ? "Brouillon · à vérifier" : "Prêt"}
            </span>
          </div>
        </section>

        <section className="rounded-[24px] bg-white shadow-soft border border-line p-5 sm:p-6">
          <div className="font-[730] text-[17px] mb-3">Prestations</div>
          <div className="space-y-3">
            {quote.lines.map((line, i) => {
              const isForfait = line.quantity.kind === "forfait";
              return (
                <div
                  key={i}
                  className={cn(
                    "rounded-[16px] border p-3.5",
                    line.needs_review
                      ? "border-[#f3d39b] bg-[#fffaf0]"
                      : "border-zinc-200 bg-white",
                  )}
                >
                  {line.needs_review && (
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-[600] text-[#92400e] bg-amber-100 rounded-md px-2 py-0.5">
                        <AlertTriangle size={12} /> À vérifier
                      </span>
                      <button
                        onClick={() => resolveLine(i, line)}
                        className="inline-flex items-center gap-1 text-[12px] font-[600] text-[#92400e] border border-[#e7c890] bg-white rounded-md px-2.5 py-1 hover:bg-amber-50 transition"
                      >
                        <Check size={13} /> marquer vérifié
                      </button>
                    </div>
                  )}

                  <input
                    className="w-full bg-transparent outline-none text-[15px] font-[550] border-b border-transparent focus:border-zinc-300 pb-1"
                    value={line.description}
                    onChange={(e) => onDescription(i, line, e.target.value)}
                  />

                  <div className="flex flex-wrap items-end gap-3 mt-3 text-[13px]">
                    {isForfait ? (
                      <>
                        <span className="text-[12px] text-zinc-500 italic self-center">Forfait</span>
                        <label className="flex flex-col gap-1 text-[11px] text-zinc-500">
                          Montant
                          <input
                            type="number"
                            step="0.01"
                            className={cn(numInput, "w-[120px]")}
                            value={line.amount}
                            onChange={(e) => onAmount(i, line, e.target.value)}
                          />
                        </label>
                      </>
                    ) : (
                      <>
                        {line.quantity.expression && (
                          <span className="font-mono-label text-[12px] text-zinc-500 bg-zinc-100 rounded-md px-2 py-1 self-center">
                            {line.quantity.expression}
                          </span>
                        )}
                        <label className="flex flex-col gap-1 text-[11px] text-zinc-500">
                          Quantité
                          <input
                            type="number"
                            step="0.01"
                            className={cn(numInput, "w-[88px]")}
                            value={line.quantity.value ?? 0}
                            onChange={(e) => onValue(i, line, e.target.value)}
                          />
                        </label>
                        {line.quantity.unit && (
                          <span className="text-zinc-500 self-center pb-2">{line.quantity.unit}</span>
                        )}
                        <span className="text-zinc-400 self-center pb-2">×</span>
                        <label className="flex flex-col gap-1 text-[11px] text-zinc-500">
                          Tarif
                          <input
                            type="number"
                            step="0.01"
                            className={cn(numInput, "w-[104px]")}
                            value={line.rate}
                            onChange={(e) => onRate(i, line, e.target.value)}
                          />
                        </label>
                        <span className="text-zinc-400 self-center pb-2">=</span>
                        <label className="flex flex-col gap-1 text-[11px] text-zinc-500">
                          Montant
                          <input
                            type="number"
                            step="0.01"
                            className={cn(numInput, "w-[112px]")}
                            value={line.amount}
                            onChange={(e) => onAmount(i, line, e.target.value)}
                          />
                        </label>
                      </>
                    )}
                    <div className="ml-auto self-center pb-1 text-[15px] font-[700] tabular-nums whitespace-nowrap">
                      CHF {CHF(line.amount)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Right: summary */}
      <div>
        <section className="rounded-[24px] bg-white border border-line shadow-soft p-5 lg:sticky lg:top-[82px]">
          <div className="text-[12.5px] font-mono-label text-zinc-500 mb-2">RÉCAP</div>
          <div className="space-y-1.5 text-[15px]">
            <div className="flex justify-between">
              <span>HT</span>
              <span className="tabular-nums">CHF {CHF(totals.ht)}</span>
            </div>
            {vatApplicable && (
              <div className="flex justify-between text-zinc-600">
                <span>TVA {VAT_RATE}%</span>
                <span className="tabular-nums">CHF {CHF(totals.tva)}</span>
              </div>
            )}
            <div className="flex justify-between text-[20px] font-[800] pt-2 border-t border-zinc-200 mt-2">
              <span>TTC</span>
              <span className="tabular-nums">CHF {CHF(totals.ttc)}</span>
            </div>
          </div>

          {vat?.available && (
            <label className="mt-4 flex items-center gap-2 text-[13.5px] text-zinc-600 cursor-pointer">
              <input
                type="checkbox"
                className="accent-brand"
                checked={vat.applicable}
                onChange={(e) => vat.onChange(e.target.checked)}
              />
              Appliquer la TVA ({VAT_RATE}%)
            </label>
          )}

          {onSave && (
            <button
              onClick={onSave}
              disabled={saving}
              className="w-full mt-4 rounded-xl bg-brand text-white py-3 font-[730] flex items-center justify-center gap-2 shadow-[0_8px_22px_rgba(255,90,20,.28)] hover:bg-brand-dark transition disabled:opacity-50"
            >
              <Save size={17} />
              {saving ? "Enregistrement…" : (saveLabel ?? "Enregistrer le devis")}
            </button>
          )}

          {summaryExtras && (
            <div className="mt-4 pt-4 border-t border-zinc-200 space-y-3">{summaryExtras}</div>
          )}
        </section>
      </div>
    </div>
  );
}
