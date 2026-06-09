"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import type { ClientRow } from "../../src/db/types";

const EMPTY = { name: "", address: "", postcode: "", city: "", country: "Suisse", email: "", phone: "" };

export default function ClientManager({ initialClients }: { initialClients: ClientRow[] }) {
  const router = useRouter();
  const [editId, setEditId] = useState<string | undefined>(undefined);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof typeof EMPTY, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function startEdit(c: ClientRow) {
    setEditId(c.id);
    setForm({
      name: c.name,
      address: c.address ?? "",
      postcode: c.postcode ?? "",
      city: c.city ?? "",
      country: c.country ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
    });
  }

  function resetForm() {
    setEditId(undefined);
    setForm({ ...EMPTY });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editId,
          name: form.name,
          address: form.address || null,
          postcode: form.postcode || null,
          city: form.city || null,
          country: form.country || null,
          email: form.email || null,
          phone: form.phone || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  const field = "flex flex-col gap-1 text-[12.5px] text-zinc-500";
  const input =
    "rounded-xl border border-zinc-300 px-3 py-2.5 text-[14.5px] bg-white text-ink outline-none focus:ring-2 focus:ring-[#ffbb94]";

  return (
    <>
      <section className="rounded-[24px] bg-white shadow-soft border border-line p-5 sm:p-6">
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <label className={field}>
            Nom du client
            <input className={input} value={form.name} onChange={(e) => set("name", e.target.value)} required />
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
          <label className={field}>
            Pays
            <input className={input} value={form.country} onChange={(e) => set("country", e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className={field}>
              E-mail
              <input className={input} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </label>
            <label className={field}>
              Téléphone
              <input className={input} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="rounded-full bg-dark text-white px-5 py-2.5 text-[14px] font-[650] hover:bg-black transition disabled:opacity-50"
              disabled={saving}
            >
              {saving ? "…" : editId ? "Mettre à jour" : "Ajouter"}
            </button>
            {editId && (
              <button
                type="button"
                className="rounded-full bg-white border border-zinc-300 px-5 py-2.5 text-[14px] font-[600] hover:bg-zinc-50 transition"
                onClick={resetForm}
              >
                Annuler
              </button>
            )}
          </div>
        </form>
        {error && (
          <p className="mt-3 text-[13.5px] text-[#b91c1c]">{error}</p>
        )}
      </section>

      <section className="mt-3 rounded-[24px] bg-white shadow-soft border border-line p-2 sm:p-3">
        {initialClients.length === 0 ? (
          <p className="text-[14px] text-zinc-500 p-4">Aucun client pour l'instant.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {initialClients.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-3 py-3">
                <span>
                  <strong className="text-[15px]">{c.name}</strong>
                  {c.city ? <span className="text-zinc-500"> · {c.city}</span> : null}
                </span>
                <button
                  className="text-[13.5px] font-[600] text-brand hover:text-brand-dark transition"
                  onClick={() => startEdit(c)}
                >
                  Modifier
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
