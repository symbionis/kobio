"use client";

import { AlertTriangle, Check, Plus, Save, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { applyExpression, round2 } from "../../src/quote/compute";
import { parseNum } from "../../src/quote/input";
import { deriveStatus } from "../../src/quote/status";
import type { VatRate } from "../../src/db/types";
import { formatCHF, totalsFromLines, type Discount } from "../../src/quote/totals";
import type { Line, Quote } from "../../src/quote/types";
import { cn } from "../lib/cn";
import RateSelect from "./RateSelect";

const CHF = formatCHF;

interface QuoteEditorProps {
  quote: Quote;
  onChange: (quote: Quote) => void;
  /** When provided, a Save button renders in the summary. */
  onSave?: () => void;
  saving?: boolean;
  saveLabel?: string;
  /** TVA rate picker. `rates` are the builder's configured rates; `selected` is
   *  the chosen one (null = Aucune). `locked` shows it read-only (e.g. once
   *  sent). Pass undefined to hide VAT entirely. */
  vat?: {
    rates: VatRate[];
    selected: number | null;
    onChange: (rate: number | null) => void;
    locked?: boolean;
    /** Whether the viewer can reach Réglages to configure rates. Defaults true;
     *  pass false for anonymous testers so the "Configurer" link (which would
     *  bounce them to /login) is replaced by a plain "Aucune". */
    configurable?: boolean;
  };
  /** Optional quote-level discount (remise), applied to HT before TVA. When
   *  `onDiscount` is provided an editable remise control renders in the totals;
   *  pass neither to hide the discount entirely. */
  discount?: Discount | null;
  onDiscount?: (discount: Discount | null) => void;
  /** Extra controls rendered in the sticky right rail, below the totals
   *  (e.g. client picker, status, PDF on the saved-quote screen). */
  summaryExtras?: ReactNode;
  /** Slot rendered in the left column between the title card and Prestations
   *  (e.g. the "Validé" action on a sent devis). */
  afterTitle?: ReactNode;
  /** Lock the quote for editing (e.g. once it's validé) — inputs disabled and
   *  edit actions hidden. The afterTitle slot stays interactive. */
  readOnly?: boolean;
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
  discount,
  onDiscount,
  summaryExtras,
  afterTitle,
  readOnly = false,
}: QuoteEditorProps) {
  // The remise unit (% / CHF). Tracks the active discount's kind; defaults to
  // percent so the toggle works before any amount is entered.
  const [discountUnit, setDiscountUnit] = useState<"percent" | "fixed">(discount?.kind ?? "percent");
  const activeUnit = discount?.kind ?? discountUnit;

  function emitDiscount(unit: "percent" | "fixed", raw: string) {
    const value = parseNum(raw);
    onDiscount?.(value > 0 ? { kind: unit, value } : null);
  }

  function changeUnit(unit: "percent" | "fixed") {
    setDiscountUnit(unit);
    if (discount) onDiscount?.({ kind: unit, value: discount.value });
  }

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

  // Edit a line's calculation formula in place. Code owns the maths: the new
  // expression is re-evaluated by the same deterministic core, a bad formula
  // flags the line for review rather than producing a wrong number. No
  // transcript round-trip — see applyExpression.
  function onExpression(i: number, line: Line, raw: string) {
    patchLine(i, applyExpression(line, raw));
  }

  // Append a blank forfait line — a manual flat-rate entry (free-text label,
  // quantity × unit price), no formula. Quantity defaults to 1. Added lines are
  // Ready by default (nothing to verify).
  function addForfait() {
    const line: Line = {
      raw_text: "",
      description: "",
      quantity: { kind: "forfait", expression: null, value: 1, unit: null },
      rate: 0,
      rate_source: "spoken",
      amount: 0,
      catalog_match: { candidates: [], confidence: "none" },
      price_override: "n/a",
      tax_rate: quote.tax_rate_default,
      needs_review: false,
    };
    onChange({ ...quote, lines: [...quote.lines, line] });
  }

  function removeLine(i: number) {
    onChange({ ...quote, lines: quote.lines.filter((_, idx) => idx !== i) });
  }

  // Clearing a line's review flag is how a Draft becomes Ready (status re-derives).
  function resolveLine(i: number, line: Line) {
    patchLine(i, { ...line, needs_review: false });
  }

  const vatRate = vat ? vat.selected : null;
  const vatLocked = readOnly || Boolean(vat?.locked);
  const totals = totalsFromLines(quote.lines, vatRate, discount ?? null);
  const showDiscountRow = (onDiscount && !readOnly) || totals.discount_amount > 0;
  const status = deriveStatus(quote.lines, false);
  const isDraft = status === "Draft";

  return (
    <div className="grid lg:grid-cols-[1.29fr_.71fr] gap-6">
      {/* Left: meta + lines */}
      <div className="space-y-5">
        {quote.review_notes.length > 0 && (
          <section className="rounded-[20px] bg-[#fff8ed] border border-[#f3d39b] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[12px] font-mono-label uppercase tracking-wide text-[#92400e]">
                <AlertTriangle size={15} /> À vérifier
              </div>
              {!readOnly && (
                <button
                  onClick={() => onChange({ ...quote, review_notes: [] })}
                  className="inline-flex items-center gap-1 text-[12px] font-[600] text-[#92400e] border border-[#e7c890] bg-white rounded-md px-2.5 py-1 hover:bg-amber-50 transition"
                >
                  <Check size={13} /> Tout est vérifié
                </button>
              )}
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
            <div className="flex-1 min-w-[240px]">
              <div className="text-[11.5px] font-mono-label text-zinc-500 mb-1">DEVIS</div>
              {readOnly ? (
                <h2 className="font-display text-[26px] leading-tight tracking-tight">
                  {quote.title || "Devis sans titre"}
                </h2>
              ) : (
                <textarea
                  rows={1}
                  ref={(el) => {
                    if (el) {
                      el.style.height = "auto";
                      el.style.height = `${el.scrollHeight}px`;
                    }
                  }}
                  className="font-display text-[26px] leading-tight tracking-tight w-full bg-transparent border-b border-transparent hover:border-zinc-200 focus:border-zinc-300 px-0 py-0.5 outline-none transition-colors resize-none overflow-hidden"
                  value={quote.title}
                  onChange={(e) => onChange({ ...quote, title: e.target.value })}
                  placeholder="Devis sans titre"
                />
              )}
              <div className="text-[14px] text-zinc-600 mt-1">
                Contact dicté : <span className="font-[600]">{quote.contact.spoken_name || "—"}</span>
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

        {afterTitle}

        <section className="rounded-[24px] bg-white shadow-soft border border-line p-5 sm:p-6">
          <div className="font-[730] text-[17px] mb-3">Prestations</div>
          <div className="space-y-3">
            {quote.lines.map((line, i) => {
              const isForfait = line.quantity.kind === "forfait";
              return (
                <div
                  key={i}
                  className={cn(
                    "relative rounded-[16px] border p-3.5",
                    line.needs_review
                      ? "border-[#f3d39b] bg-[#fffaf0]"
                      : "border-zinc-200 bg-white",
                  )}
                >
                  {!readOnly && (
                    <button
                      onClick={() => removeLine(i)}
                      title="Supprimer la ligne"
                      className="absolute top-2.5 right-2.5 z-10 text-zinc-400 hover:text-red-600 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}

                  {line.needs_review && (
                    <div className="flex items-center justify-between mb-2 pr-7">
                      <span className="inline-flex items-center gap-1 text-[11px] font-[600] text-[#92400e] bg-amber-100 rounded-md px-2 py-0.5">
                        <AlertTriangle size={12} /> À vérifier
                      </span>
                      {!readOnly && (
                        <button
                          onClick={() => resolveLine(i, line)}
                          className="inline-flex items-center gap-1 text-[12px] font-[600] text-[#92400e] border border-[#e7c890] bg-white rounded-md px-2.5 py-1 hover:bg-amber-50 transition"
                        >
                          <Check size={13} /> marquer vérifié
                        </button>
                      )}
                    </div>
                  )}

                  <textarea
                    rows={1}
                    ref={(el) => {
                      if (el) {
                        el.style.height = "auto";
                        el.style.height = `${el.scrollHeight}px`;
                      }
                    }}
                    disabled={readOnly}
                    className="w-full bg-transparent outline-none text-[15px] font-[550] leading-snug border-b border-transparent focus:border-zinc-300 pb-1 pr-6 resize-none overflow-hidden disabled:opacity-100"
                    value={line.description}
                    placeholder={isForfait ? "Désignation du forfait" : ""}
                    onChange={(e) => onDescription(i, line, e.target.value)}
                  />

                  {/* Type / calculation pill, below the title. Forfait shows a
                      static label; a parsed line shows its formula as an editable
                      field (read-only when the quote is locked). */}
                  {isForfait ? (
                    <div className="mt-1.5">
                      <span className="inline-block bg-zinc-100 text-zinc-500 rounded-md px-2 py-1 text-[12px]">
                        Forfait
                      </span>
                    </div>
                  ) : line.quantity.expression !== null ? (
                    <div className="mt-1.5">
                      {readOnly ? (
                        <span className="inline-block bg-zinc-100 text-zinc-500 rounded-md px-2 py-1 text-[12px] font-mono-label">
                          {line.quantity.expression}
                        </span>
                      ) : (
                        <input
                          type="text"
                          inputMode="text"
                          value={line.quantity.expression}
                          onChange={(e) => onExpression(i, line, e.target.value)}
                          title="Modifier la formule de calcul"
                          aria-label="Formule de calcul"
                          className="bg-zinc-100 text-zinc-600 rounded-md px-2 py-1 text-[12px] font-mono-label outline-none focus:ring-2 focus:ring-[#ffbb94] focus:bg-white w-full max-w-[340px]"
                        />
                      )}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-end gap-3 mt-3 text-[13px]">
                    <label className="flex flex-col gap-1 text-[12.5px] text-zinc-500">
                      Quantité
                      <input
                        type="number"
                        step="0.01"
                        disabled={readOnly}
                        className={cn(numInput, "w-[68px]")}
                        value={line.quantity.value ?? ""}
                        placeholder={isForfait ? "1" : undefined}
                        onChange={(e) => onValue(i, line, e.target.value)}
                      />
                    </label>
                    {line.quantity.unit && (
                      <span className="text-zinc-500 self-center pb-2">{line.quantity.unit}</span>
                    )}
                    <span className="text-zinc-400 self-center pb-2">×</span>
                    <label className="flex flex-col gap-1 text-[12.5px] text-zinc-500">
                      Tarif
                      <input
                        type="number"
                        step="0.01"
                        disabled={readOnly}
                        className={cn(numInput, "w-[84px]")}
                        value={line.rate}
                        onChange={(e) => onRate(i, line, e.target.value)}
                      />
                    </label>
                    <span className="text-zinc-400 self-center pb-2">=</span>

                    {/* Calculated line total — read-only, left-aligned. */}
                    <div className="flex-1 min-w-[110px] self-center pb-1 text-left text-[16px] font-[700] tabular-nums whitespace-nowrap">
                      CHF {CHF(line.amount)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!readOnly && (
            <button
              onClick={addForfait}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-[13px] font-[600] text-zinc-600 border border-dashed border-zinc-300 rounded-xl px-3 py-2.5 hover:border-zinc-400 hover:text-black hover:bg-paper-2 transition"
            >
              <Plus size={15} /> Ajouter un forfait
            </button>
          )}
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
            {showDiscountRow && (
              <div className="flex items-center justify-between gap-2 text-zinc-600">
                {onDiscount && !readOnly ? (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span>Remise</span>
                    <div className="inline-flex rounded-md border border-zinc-200 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => changeUnit("percent")}
                        className={cn(
                          "px-1.5 py-0.5 text-[12px]",
                          activeUnit === "percent" ? "bg-zinc-200 text-zinc-800" : "text-zinc-500",
                        )}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => changeUnit("fixed")}
                        className={cn(
                          "px-1.5 py-0.5 text-[12px]",
                          activeUnit === "fixed" ? "bg-zinc-200 text-zinc-800" : "text-zinc-500",
                        )}
                      >
                        CHF
                      </button>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      aria-label="Montant de la remise"
                      className={cn(numInput, "w-[68px]")}
                      value={discount ? discount.value : ""}
                      onChange={(e) => emitDiscount(activeUnit, e.target.value)}
                    />
                  </div>
                ) : (
                  <span className="text-zinc-700">
                    Remise{discount?.kind === "percent" ? ` ${discount.value}%` : ""}
                  </span>
                )}
                <span className="tabular-nums">− CHF {CHF(totals.discount_amount)}</span>
              </div>
            )}
            {totals.discount_amount > 0 && (
              <div className="flex justify-between text-zinc-600">
                <span>Net HT</span>
                <span className="tabular-nums">CHF {CHF(totals.net)}</span>
              </div>
            )}
            {vat && (
              <div className="flex items-center justify-between gap-2 text-zinc-600">
                <div className="flex items-center gap-2 min-w-0">
                  {vatLocked ? (
                    <span className="text-zinc-700">
                      TVA {vat.selected != null ? `${vat.selected}%` : "Aucune"}
                    </span>
                  ) : vat.rates.length > 0 || vat.selected != null ? (
                    <div className="w-[150px]">
                      <RateSelect rates={vat.rates} value={vat.selected} onChange={vat.onChange} />
                    </div>
                  ) : vat.configurable === false ? (
                    <span className="text-zinc-700">TVA Aucune</span>
                  ) : (
                    <span>
                      TVA{" "}
                      <a
                        href="/settings"
                        className="text-brand hover:text-brand-dark underline text-[13.5px]"
                      >
                        Configurer
                      </a>
                    </span>
                  )}
                </div>
                <span className="tabular-nums">CHF {CHF(totals.tva)}</span>
              </div>
            )}
            <div className="flex justify-between text-[20px] font-[800] pt-2 border-t border-zinc-200 mt-2">
              <span>TTC</span>
              <span className="tabular-nums">CHF {CHF(totals.ttc)}</span>
            </div>
          </div>

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
