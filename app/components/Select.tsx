"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/cn";

interface Option {
  value: string;
  label: string;
}

interface Props {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  /** Shown when nothing is selected, and as the first (empty-value) option. */
  placeholder?: string;
  /** Warm-tint the control to flag a voice-filled value awaiting review. */
  highlight?: boolean;
}

/** Generic styled dropdown — a button + popover list, replacing native <select>
 *  whose rendering is poor on mobile. Closes on outside-click or Escape. */
export default function Select({
  value,
  options,
  onChange,
  placeholder = "— Choisir —",
  highlight = false,
}: Props) {
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

  const selected = options.find((o) => o.value === value);

  function pick(v: string) {
    onChange(v);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-[14.5px] text-ink text-left outline-none focus:ring-2 focus:ring-[#ffbb94]",
          highlight ? "border-[#f3d39b] bg-[#fffaf0]" : "border-zinc-300 bg-white",
        )}
      >
        <span className={cn("truncate", !selected && "text-zinc-400")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={cn("text-zinc-400 shrink-0 transition", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full max-h-[280px] overflow-y-auto rounded-xl border border-line bg-white shadow-soft py-1">
          <button
            type="button"
            onClick={() => pick("")}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[14px] text-left hover:bg-paper-2 transition"
          >
            <span className="text-zinc-500">{placeholder}</span>
            {!value && <Check size={15} className="text-brand shrink-0" />}
          </button>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => pick(o.value)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[14px] text-left hover:bg-paper-2 transition"
            >
              <span className="truncate">{o.label}</span>
              {value === o.value && <Check size={15} className="text-brand shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
