"use client";

import { useEffect, useState } from "react";
import { type ContactFields, dictationFill } from "../../src/contact";
import { cn } from "../lib/cn";
import { COUNTRY_OPTIONS } from "../lib/countries";
import AddressDictation from "./AddressDictation";
import PhoneInput from "./PhoneInput";
import Select from "./Select";

const EMPTY = {
  name: "",
  address: "",
  postcode: "",
  city: "",
  country: "Suisse",
  email: "",
  phone: "",
};

interface Props {
  open: boolean;
  /** Prefill the name (e.g. the dictated contact). */
  initialName?: string;
  onClose: () => void;
  onCreated: (client: { id: string; name: string }) => void;
}

/** Shared "new client" popover — used on the quote screen and the clients page.
 *  One form, one POST to /api/clients. */
export default function ClientFormModal({ open, initialName = "", onClose, onCreated }: Props) {
  const [draft, setDraft] = useState({ ...EMPTY, name: initialName });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Address fields just filled by voice — highlighted until edited/confirmed.
  const [highlighted, setHighlighted] = useState<Set<keyof ContactFields>>(new Set());

  useEffect(() => {
    if (open) {
      setDraft({ ...EMPTY, name: initialName });
      setHighlighted(new Set());
      setError(null);
    }
  }, [open, initialName]);

  if (!open) return null;

  function set(field: keyof typeof EMPTY, value: string) {
    setDraft((d) => ({ ...d, [field]: value }));
    // Editing a voice-filled field clears its review highlight.
    setHighlighted((h) => {
      const key = field as keyof ContactFields;
      if (!h.has(key)) return h;
      const next = new Set(h);
      next.delete(key);
      return next;
    });
  }

  // A dictation result replaces the whole address block; only the fields that
  // came back filled are highlighted. E-mail and phone are never touched.
  function onDictation(fields: ContactFields) {
    setDraft((d) => ({
      ...d,
      name: fields.name,
      address: fields.address,
      postcode: fields.postcode,
      city: fields.city,
      country: fields.country,
    }));
    setHighlighted(new Set(dictationFill(fields).highlight));
  }

  async function create() {
    const name = draft.name.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          address: draft.address.trim() || null,
          postcode: draft.postcode.trim() || null,
          city: draft.city.trim() || null,
          country: draft.country.trim() || null,
          email: draft.email.trim() || null,
          phone: draft.phone.trim() || null,
        }),
      });
      const data = (await res.json()) as { client?: { id: string; name: string }; error?: string };
      if (!res.ok || !data.client) throw new Error(data.error ?? `Erreur ${res.status}`);
      onCreated({ id: data.client.id, name: data.client.name });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la création du client.");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-[14px] bg-white outline-none focus:ring-2 focus:ring-[#ffbb94]";
  const label = "flex flex-col gap-1 text-[12.5px] text-zinc-500";
  const warm = "border-[#f3d39b] bg-[#fffaf0]"; // voice-filled, awaiting review

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-[24px] bg-white border border-line shadow-soft p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-[22px] tracking-tight">Nouveau client</h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="text-zinc-400 hover:text-black transition text-[22px] leading-none"
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <AddressDictation onResult={onDictation} />
        </div>

        <div className="flex flex-col gap-3">
          <label className={label}>
            Nom
            <input
              autoFocus
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Nom du client"
              className={cn(input, highlighted.has("name") && warm)}
            />
          </label>
          <label className={label}>
            Adresse
            <input
              value={draft.address}
              onChange={(e) => set("address", e.target.value)}
              className={cn(input, highlighted.has("address") && warm)}
            />
          </label>
          <div className="grid grid-cols-[100px_1fr] gap-3">
            <label className={label}>
              NPA
              <input
                value={draft.postcode}
                onChange={(e) => set("postcode", e.target.value)}
                className={cn(input, highlighted.has("postcode") && warm)}
              />
            </label>
            <label className={label}>
              Ville
              <input
                value={draft.city}
                onChange={(e) => set("city", e.target.value)}
                className={cn(input, highlighted.has("city") && warm)}
              />
            </label>
          </div>
          <div className={label}>
            Pays
            <Select
              value={draft.country}
              options={COUNTRY_OPTIONS}
              onChange={(v) => set("country", v)}
              highlight={highlighted.has("country")}
            />
          </div>
          <label className={label}>
            E-mail
            <input
              type="email"
              value={draft.email}
              onChange={(e) => set("email", e.target.value)}
              className={input}
            />
          </label>
          <div className={label}>
            Téléphone
            <PhoneInput onChange={(e164) => set("phone", e164 ?? "")} />
          </div>
        </div>

        {error && <p className="mt-3 text-[13px] text-[#b91c1c]">{error}</p>}

        <div className="flex gap-2 mt-5">
          <button
            onClick={create}
            disabled={busy || !draft.name.trim()}
            className="flex-1 rounded-xl bg-dark text-white py-2.5 text-[14px] font-[650] hover:bg-black transition disabled:opacity-50"
          >
            {busy ? "Création…" : "Créer le client"}
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-[14px] hover:bg-zinc-50 transition"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
