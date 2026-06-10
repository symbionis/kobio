"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { VatRate } from "../../src/db/types";
import { cn } from "../lib/cn";

interface Props {
  rates: VatRate[];
  /** Selected rate, or null for "Aucune". */
  value: number | null;
  onChange: (rate: number | null) => void;
}

function rateLabel(r: VatRate): string {
  return r.label.trim() ? `${r.label} · ${r.rate}%` : `${r.rate}%`;
}

/** Compact VAT-rate picker: "Aucune" plus the builder's configured rates. */
export default function RateSelect({ rates, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Keep the selected rate visible even if it's no longer in the configured list
  // (e.g. it was removed in Réglages after this devis chose it).
  const options = [...rates];
  if (value != null && !rates.some((r) => r.rate === value)) {
    options.unshift({ label: "", rate: value });
  }
  const selected = value != null ? options.find((o) => o.rate === value) : null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-[14px] text-left outline-none focus:ring-2 focus:ring-[#ffbb94]"
      >
        <span className={cn("truncate", !selected && "text-zinc-500")}>
          {selected ? rateLabel(selected) : "Aucune"}
        </span>
        <ChevronDown
          size={16}
          className={cn("text-zinc-400 shrink-0 transition", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-line bg-white shadow-soft overflow-hidden py-1">
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[14px] text-left hover:bg-paper-2 transition"
          >
            <span className="text-zinc-500">Aucune</span>
            {value == null && <Check size={15} className="text-brand shrink-0" />}
          </button>

          {options.map((o) => (
            <button
              key={o.rate}
              type="button"
              onClick={() => {
                onChange(o.rate);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[14px] text-left hover:bg-paper-2 transition"
            >
              <span className="truncate">{rateLabel(o)}</span>
              {value === o.rate && <Check size={15} className="text-brand shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
