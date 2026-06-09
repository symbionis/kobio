"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useState } from "react";
import type { CompanyRow } from "../../src/db/types";

export default function CompanyForm({ initial }: { initial: CompanyRow | null }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [postcode, setPostcode] = useState(initial?.postcode ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [country, setCountry] = useState(initial?.country ?? "Suisse");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [vat, setVat] = useState(initial?.vat_number ?? "");
  const [logo, setLogo] = useState<string | null>(initial?.logo_ref ?? null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onLogo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) {
      setError("Logo trop volumineux (max 500 Ko).");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setLogo(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          address: address || null,
          postcode: postcode || null,
          city: city || null,
          country: country || null,
          email: email || null,
          phone: phone || null,
          vat_number: vat || null,
          logo_ref: logo,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setSaved(true);
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
    <section className="rounded-[24px] bg-white shadow-soft border border-line p-5 sm:p-6">
      <h2 className="font-[730] text-[17px] mb-4">Profil de l'entreprise</h2>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <label className={field}>
          Nom de l'entreprise
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className={field}>
          Adresse
          <input className={input} value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className={field}>
            NPA
            <input className={input} value={postcode} onChange={(e) => setPostcode(e.target.value)} />
          </label>
          <label className={field}>
            Ville
            <input className={input} value={city} onChange={(e) => setCity(e.target.value)} />
          </label>
        </div>
        <label className={field}>
          Pays
          <input className={input} value={country} onChange={(e) => setCountry(e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className={field}>
            E-mail
            <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className={field}>
            Téléphone
            <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
        </div>
        <label className={field}>
          <span>
            N° TVA <span className="text-zinc-400">(active la TVA sur les devis)</span>
          </span>
          <input className={input} value={vat} onChange={(e) => setVat(e.target.value)} />
        </label>
        <label className={field}>
          Logo (max 500 Ko)
          <input
            type="file"
            accept="image/*"
            onChange={onLogo}
            className="text-[13px] text-zinc-600 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-[13px] file:font-[600] hover:file:bg-zinc-200"
          />
        </label>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logo && (
          <img
            src={logo}
            alt="Logo"
            className="max-w-[160px] max-h-16 object-contain border border-line rounded-lg p-1 self-start"
          />
        )}
        <div className="flex items-center gap-3">
          <button
            className="rounded-full bg-dark text-white px-5 py-2.5 text-[14px] font-[650] hover:bg-black transition disabled:opacity-50"
            disabled={saving}
          >
            {saving ? "…" : "Enregistrer"}
          </button>
          {saved && <span className="text-[13.5px] text-emerald-700">Enregistré</span>}
        </div>
      </form>
      {error && <p className="mt-3 text-[13.5px] text-[#b91c1c]">{error}</p>}
    </section>
  );
}
