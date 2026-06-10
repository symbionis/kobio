"use client";

import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ClientRow } from "../../../src/db/types";
import PhoneInput from "../../components/PhoneInput";
import Select from "../../components/Select";
import { COUNTRY_OPTIONS } from "../../lib/countries";
import QuotesList from "../../quotes/QuotesList";
import type { QuoteListRow } from "../../quotes/quoteRow";

type SaveState = "idle" | "saving" | "saved" | "error";

/** Client detail — inline-editable coordinates (debounced autosave) + the full
 *  list of that client's devis (the shared QuotesList). */
export default function ClientDetail({
  client,
  quoteRows,
}: {
  client: ClientRow;
  quoteRows: QuoteListRow[];
}) {
  const [form, setForm] = useState({
    name: client.name,
    address: client.address ?? "",
    postcode: client.postcode ?? "",
    city: client.city ?? "",
    country: client.country ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
  });
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const first = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function save() {
    if (!form.name.trim()) {
      setSaveState("error");
      return;
    }
    setSaveState("saving");
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: client.id,
          name: form.name.trim(),
          address: form.address || null,
          postcode: form.postcode || null,
          city: form.city || null,
          country: form.country || null,
          email: form.email || null,
          phone: form.phone || null,
        }),
      });
      if (!res.ok) throw new Error();
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  // Debounced autosave on any field change; skip the initial mount.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaveState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), 900);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const field = "flex flex-col gap-1 text-[12.5px] text-zinc-500";
  const input =
    "rounded-xl border border-zinc-300 px-3 py-2.5 text-[14.5px] bg-white text-ink outline-none focus:ring-2 focus:ring-[#ffbb94]";

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-5">
        <Link
          href="/clients"
          aria-label="Retour"
          className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-black transition"
        >
          <ArrowLeft size={18} />
        </Link>
        <span className="text-[13px] min-h-[20px]">
          {saveState === "saving" && <span className="text-zinc-500">Enregistrement…</span>}
          {saveState === "saved" && (
            <span className="flex items-center gap-1 text-emerald-700">
              <Check size={14} /> Enregistré
            </span>
          )}
          {saveState === "error" && (
            <button onClick={save} className="text-[#b91c1c] hover:underline">
              Échec — réessayer
            </button>
          )}
        </span>
      </div>

      <h1 className="font-display text-[32px] leading-tight tracking-tight mb-4">
        {form.name || "Client"}
      </h1>

      <section className="rounded-[24px] bg-white shadow-soft border border-line p-5 sm:p-6">
        <div className="flex flex-col gap-4">
          <label className={field}>
            Nom du client
            <input className={input} value={form.name} onChange={(e) => set("name", e.target.value)} />
          </label>
          <label className={field}>
            Adresse
            <input className={input} value={form.address} onChange={(e) => set("address", e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className={field}>
              NPA
              <input className={input} value={form.postcode} onChange={(e) => set("postcode", e.target.value)} />
            </label>
            <label className={field}>
              Ville
              <input className={input} value={form.city} onChange={(e) => set("city", e.target.value)} />
            </label>
          </div>
          <div className={field}>
            Pays
            <Select
              value={form.country}
              options={COUNTRY_OPTIONS}
              onChange={(v) => set("country", v)}
            />
          </div>
          <label className={field}>
            E-mail
            <input
              className={input}
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </label>
          <div className={field}>
            Téléphone
            <PhoneInput
              defaultValue={client.phone}
              onChange={(e164) =>
                setForm((f) => (f.phone === (e164 ?? "") ? f : { ...f, phone: e164 ?? "" }))
              }
            />
          </div>
        </div>
      </section>

      <h2 className="font-display text-[22px] tracking-tight mt-8 mb-1">Devis</h2>
      <QuotesList rows={quoteRows} showContact={false} />
    </>
  );
}
