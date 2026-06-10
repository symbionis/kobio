"use client";

import type { CountryCode } from "libphonenumber-js";
import { ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_COUNTRY, countryOptions, parseE164, toE164 } from "../../src/phone";
import { cn } from "../lib/cn";

interface Props {
  /** Existing stored value to edit — E.164, or a raw legacy number. */
  defaultValue?: string | null;
  /** Called with the normalized E.164 string, or null when empty/invalid. */
  onChange?: (e164: string | null) => void;
  disabled?: boolean;
}

/** Localized country names, resolved client-side only. */
function useRegionName() {
  return useMemo(() => {
    try {
      const dn = new Intl.DisplayNames(["fr"], { type: "region" });
      return (c: CountryCode) => dn.of(c) ?? c;
    } catch {
      return (c: CountryCode) => c;
    }
  }, []);
}

/**
 * Phone capture with a country-code selector. Stores E.164 (e.g. +41781234567)
 * via onChange — the heavy lifting (per-country trunk-zero rules) lives in
 * src/phone.ts. An existing value is parsed back into country + national; a
 * legacy un-normalized value falls back to the default country so it stays
 * visible and self-heals on the next edit.
 */
export default function PhoneInput({ defaultValue, onChange, disabled = false }: Props) {
  const parsed = parseE164(defaultValue);
  const [country, setCountry] = useState<CountryCode>(parsed?.country ?? DEFAULT_COUNTRY);
  const [national, setNational] = useState(parsed?.national ?? defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [query, setQuery] = useState("");
  const [touched, setTouched] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Open upward when there isn't room for the panel below the control.
  function toggleOpen() {
    if (!open) {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (rect) {
        const spaceBelow = window.innerHeight - rect.bottom;
        setDropUp(spaceBelow < 300 && rect.top > spaceBelow);
      }
    }
    setOpen((v) => !v);
  }

  const options = useMemo(() => countryOptions(), []);
  const regionName = useRegionName();

  const e164 = toE164(national, country);
  const invalid = touched && national.trim() !== "" && e164 === null;

  useEffect(() => {
    onChange?.(e164);
    // onChange identity isn't stable across renders; depend on the value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [e164]);

  useEffect(() => {
    if (!open) return;
    function onDoc(ev: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(ev.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.callingCode.includes(q) ||
        o.country.toLowerCase().includes(q) ||
        regionName(o.country).toLowerCase().includes(q),
    );
  }, [query, options, regionName]);

  const selected = options.find((o) => o.country === country);
  const fieldCls =
    "rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-[#ffbb94] disabled:bg-zinc-50 disabled:text-zinc-400";

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={toggleOpen}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(fieldCls, "w-[96px] shrink-0 flex items-center justify-between gap-1 text-left")}
        >
          <span className="truncate">
            {country} {selected?.callingCode}
          </span>
          <ChevronDown size={14} className={cn("text-zinc-400 shrink-0 transition", open && "rotate-180")} />
        </button>
        <input
          type="tel"
          inputMode="tel"
          disabled={disabled}
          value={national}
          onChange={(e) => setNational(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="79 123 45 67"
          aria-invalid={invalid}
          className={cn(fieldCls, "flex-1 min-w-0")}
        />
      </div>

      {invalid && (
        <p className="mt-1 text-[12px] text-[#b91c1c]">Numéro invalide pour {regionName(country)}.</p>
      )}

      {open && (
        <div
          className={cn(
            "absolute z-50 left-0 w-[280px] max-w-[80vw] rounded-xl border border-line bg-white shadow-soft overflow-hidden",
            dropUp ? "bottom-full mb-1.5" : "top-full mt-1.5",
          )}
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100">
            <Search size={14} className="text-zinc-400 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pays ou indicatif…"
              className="w-full bg-transparent outline-none text-[14px]"
            />
          </div>
          <ul className="max-h-[240px] overflow-y-auto py-1">
            {filtered.map((o) => (
              <li key={o.country}>
                <button
                  type="button"
                  onClick={() => {
                    setCountry(o.country);
                    setOpen(false);
                    setQuery("");
                    setTouched(true);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-[14px] hover:bg-paper-2 transition flex items-center gap-2",
                    o.country === country && "bg-paper-2",
                  )}
                >
                  <span className="text-zinc-500 w-12 shrink-0">{o.callingCode}</span>
                  <span className="truncate">{regionName(o.country)}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-[13px] text-zinc-400">Aucun résultat</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
