"use client";

import { Check, ChevronDown, Plus, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/cn";

interface Option {
  id: string;
  name: string;
}

interface Props {
  value: string;
  options: Option[];
  onChange: (id: string) => void;
  onCreateNew: () => void;
  placeholder?: string;
}

/**
 * Custom client picker — replaces the native <select>, whose dropdown renders
 * poorly on mobile. A button + popover list, with a search field once the list
 * grows. Closes on outside-click or Escape.
 */
export default function ClientSelect({
  value,
  options,
  onChange,
  onCreateNew,
  placeholder = "— Aucun —",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
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

  const selected = options.find((o) => o.id === value);
  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options;

  function close() {
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-[14px] text-left outline-none focus:ring-2 focus:ring-[#ffbb94]"
      >
        <span className={cn("truncate", !selected && "text-zinc-400")}>
          {selected ? selected.name : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={cn("text-zinc-400 shrink-0 transition", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-line bg-white shadow-soft overflow-hidden">
          {options.length > 6 && (
            <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100">
              <Search size={14} className="text-zinc-400 shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher…"
                className="w-full bg-transparent outline-none text-[14px]"
              />
            </div>
          )}

          <div className="max-h-[260px] overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => {
                onChange("");
                close();
              }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[14px] text-left hover:bg-paper-2 transition"
            >
              <span className="text-zinc-500">{placeholder}</span>
              {!value && <Check size={15} className="text-brand shrink-0" />}
            </button>

            {filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  onChange(o.id);
                  close();
                }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[14px] text-left hover:bg-paper-2 transition"
              >
                <span className="truncate">{o.name}</span>
                {value === o.id && <Check size={15} className="text-brand shrink-0" />}
              </button>
            ))}

            {filtered.length === 0 && (
              <div className="px-3 py-2 text-[13px] text-zinc-400">Aucun résultat</div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              close();
              onCreateNew();
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-[14px] text-left text-brand hover:bg-paper-2 border-t border-zinc-100 transition"
          >
            <Plus size={15} /> Nouveau client…
          </button>
        </div>
      )}
    </div>
  );
}
