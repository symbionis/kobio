"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useState } from "react";
import type { CompanyRow } from "../../src/db/types";
import { TRADES } from "../../src/quote/trades";
import PhoneInput from "../components/PhoneInput";
import Select from "../components/Select";

/** VAT-rate rows are edited as strings (the rate field can be mid-typing/empty)
 *  and parsed to numbers only on submit. */
interface RateRow {
  label: string;
  rate: string;
}

export default function CompanyForm({ initial }: { initial: CompanyRow | null }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [firstName, setFirstName] = useState(initial?.first_name ?? "");
  const [lastName, setLastName] = useState(initial?.last_name ?? "");
  const [trade, setTrade] = useState(initial?.trade ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [postcode, setPostcode] = useState(initial?.postcode ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [country, setCountry] = useState(initial?.country ?? "Suisse");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [vat, setVat] = useState(initial?.vat_number ?? "");
  const [rates, setRates] = useState<RateRow[]>(() =>
    (initial?.vat_rates ?? []).map((r) => ({ label: r.label, rate: String(r.rate) })),
  );
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

  function addRate() {
    setRates((rs) => [...rs, { label: "", rate: "" }]);
  }
  function updateRate(i: number, patch: Partial<RateRow>) {
    setRates((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function removeRate(i: number) {
    setRates((rs) => rs.filter((_, idx) => idx !== i));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const vat_rates = rates
        .map((r) => ({ label: r.label.trim(), rate: Number(r.rate.replace(",", ".")) }))
        .filter((r) => Number.isFinite(r.rate) && r.rate >= 0);
      const res = await fetch("/api/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          first_name: firstName || null,
          last_name: lastName || null,
          address: address || null,
          postcode: postcode || null,
          city: city || null,
          country: country || null,
          email: email || null,
          phone: phone || null,
          vat_number: vat || null,
          vat_rates,
          logo_ref: logo,
          trade: trade || null,
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
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <section className="rounded-[24px] bg-white shadow-soft border border-line p-5 sm:p-6">
        <h2 className="font-[730] text-[17px] mb-4">Vous</h2>
        <div className="grid grid-cols-2 gap-4">
          <label className={field}>
            Prénom
            <input className={input} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </label>
          <label className={field}>
            Nom
            <input className={input} value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </label>
        </div>
      </section>

      <section className="rounded-[24px] bg-white shadow-soft border border-line p-5 sm:p-6">
        <h2 className="font-[730] text-[17px] mb-4">Profil de l'entreprise</h2>
        <div className="flex flex-col gap-4">
        <label className={field}>
          Nom de l'entreprise
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <div className={field}>
          Métier
          <Select
            value={trade}
            options={TRADES.map((t) => ({ value: t.value, label: t.label }))}
            onChange={setTrade}
          />
        </div>
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
        <label className={field}>
          E-mail
          <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <div className={field}>
          Téléphone
          <PhoneInput defaultValue={initial?.phone ?? null} onChange={(e164) => setPhone(e164 ?? "")} />
        </div>
        <fieldset className="rounded-2xl border border-line bg-paper-2 p-4 flex flex-col gap-4">
          <legend className="px-1 text-[12.5px] font-[650] text-zinc-600">TVA</legend>

          <label className={field}>
            <span>
              N° TVA <span className="text-zinc-400">(figure sur le PDF)</span>
            </span>
            <input className={input} value={vat} onChange={(e) => setVat(e.target.value)} />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-[12.5px] text-zinc-500">
              Taux de TVA <span className="text-zinc-400">(choisis sur chaque devis)</span>
            </span>
            {rates.length === 0 && (
              <p className="text-[12.5px] text-zinc-400">
                Aucun taux. Ajoutez vos taux usuels (ex. Normal 8.1, Réduit 2.6).
              </p>
            )}
            {rates.map((r, i) => (
              <div key={i} className="flex items-center gap-2 w-full">
                <input
                  className={`${input} min-w-0 flex-[0_1_55%]`}
                  value={r.label}
                  placeholder="Libellé (ex. Normal)"
                  onChange={(e) => updateRate(i, { label: e.target.value })}
                />
                <div className="relative w-[76px] shrink-0 ml-auto">
                  <input
                    className={`${input} w-full pr-6 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                    type="number"
                    step="0.1"
                    min="0"
                    value={r.rate}
                    placeholder="8.1"
                    onChange={(e) => updateRate(i, { rate: e.target.value })}
                  />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[13px] text-zinc-400">
                    %
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeRate(i)}
                  aria-label="Supprimer le taux"
                  className="shrink-0 text-zinc-400 hover:text-red-600 transition p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addRate}
              className="self-start inline-flex items-center gap-1.5 text-[13px] font-[600] text-zinc-600 border border-dashed border-zinc-300 rounded-xl px-3 py-2 hover:border-zinc-400 hover:text-black transition"
            >
              <Plus size={15} /> Ajouter un taux
            </button>
          </div>
        </fieldset>
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
        {error && <p className="mt-3 text-[13.5px] text-[#b91c1c]">{error}</p>}
        </div>
      </section>
    </form>
  );
}
